import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface BackupRequest {
  backup_type: 'payments' | 'orders' | 'tickets' | 'full';
  date_from?: string;
  date_to?: string;
  format?: 'json' | 'csv';
}

interface BackupResult {
  backup_id: string;
  backup_type: string;
  record_count: number;
  file_size_bytes: number;
  created_at: string;
  download_url?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔄 Payment Backup Function Started");

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const payload: BackupRequest = await req.json();
    console.log("📋 Backup request:", payload);

    // Validate request
    if (!payload.backup_type) {
      throw new Error("backup_type is required");
    }

    const backupId = crypto.randomUUID();
    const startTime = Date.now();

    // Set date range (default to last 30 days if not specified)
    const dateTo = payload.date_to ? new Date(payload.date_to) : new Date();
    const dateFrom = payload.date_from ? new Date(payload.date_from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    console.log("📅 Backup date range:", { dateFrom: dateFrom.toISOString(), dateTo: dateTo.toISOString() });

    let backupData: any = {};
    let recordCount = 0;

    // Backup payments data
    if (payload.backup_type === 'payments' || payload.backup_type === 'full') {
      console.log("💳 Backing up payments...");
      
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          orders (
            id,
            event_id,
            user_id,
            status,
            total,
            currency,
            ticket_quantities,
            created_at
          )
        `)
        .gte('created_at', dateFrom.toISOString())
        .lte('created_at', dateTo.toISOString())
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      backupData.payments = payments || [];
      recordCount += (payments || []).length;
      console.log(`✅ Backed up ${(payments || []).length} payments`);
    }

    // Backup orders data
    if (payload.backup_type === 'orders' || payload.backup_type === 'full') {
      console.log("📦 Backing up orders...");
      
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          events (
            id,
            title,
            date,
            location
          ),
          profiles (
            id,
            email,
            full_name
          )
        `)
        .gte('created_at', dateFrom.toISOString())
        .lte('created_at', dateTo.toISOString())
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      backupData.orders = orders || [];
      recordCount += (orders || []).length;
      console.log(`✅ Backed up ${(orders || []).length} orders`);
    }

    // Backup tickets data
    if (payload.backup_type === 'tickets' || payload.backup_type === 'full') {
      console.log("🎫 Backing up tickets...");
      
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          *,
          orders (
            id,
            total,
            status
          ),
          events (
            id,
            title,
            date,
            location
          ),
          ticket_types (
            id,
            name,
            price
          )
        `)
        .gte('created_at', dateFrom.toISOString())
        .lte('created_at', dateTo.toISOString())
        .order('created_at', { ascending: false });

      if (ticketsError) throw ticketsError;

      backupData.tickets = tickets || [];
      recordCount += (tickets || []).length;
      console.log(`✅ Backed up ${(tickets || []).length} tickets`);
    }

    // Add metadata
    backupData.metadata = {
      backup_id: backupId,
      backup_type: payload.backup_type,
      date_from: dateFrom.toISOString(),
      date_to: dateTo.toISOString(),
      created_at: new Date().toISOString(),
      record_count: recordCount,
      version: "1.0"
    };

    // Convert to requested format
    let backupContent: string;
    let contentType: string;
    let fileExtension: string;

    if (payload.format === 'csv') {
      // Convert to CSV format
      backupContent = convertToCSV(backupData);
      contentType = 'text/csv';
      fileExtension = 'csv';
    } else {
      // Default to JSON
      backupContent = JSON.stringify(backupData, null, 2);
      contentType = 'application/json';
      fileExtension = 'json';
    }

    const fileSizeBytes = new TextEncoder().encode(backupContent).length;

    // Store backup record in database
    const { data: backupRecord, error: backupError } = await supabase
      .from('payment_backups')
      .insert({
        id: backupId,
        backup_type: payload.backup_type,
        date_from: dateFrom.toISOString(),
        date_to: dateTo.toISOString(),
        record_count: recordCount,
        file_size_bytes: fileSizeBytes,
        format: payload.format || 'json',
        status: 'completed',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (backupError) {
      console.error("❌ Failed to store backup record:", backupError);
      // Continue anyway - backup data is still valid
    }

    const processingTime = Date.now() - startTime;
    console.log("✅ Backup completed:", {
      backup_id: backupId,
      record_count: recordCount,
      file_size_mb: (fileSizeBytes / 1024 / 1024).toFixed(2),
      processing_time_ms: processingTime
    });

    // Return backup data directly (for small backups) or provide download info
    const result: BackupResult = {
      backup_id: backupId,
      backup_type: payload.backup_type,
      record_count: recordCount,
      file_size_bytes: fileSizeBytes,
      created_at: new Date().toISOString()
    };

    // If backup is small enough (< 10MB), return data directly
    if (fileSizeBytes < 10 * 1024 * 1024) {
      return new Response(backupContent, {
        headers: {
          ...corsHeaders,
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="temba-backup-${backupId}.${fileExtension}"`,
          "X-Backup-Info": JSON.stringify(result)
        }
      });
    } else {
      // For larger backups, return metadata and suggest using storage
      return new Response(
        JSON.stringify({
          ...result,
          message: "Backup too large for direct download. Consider using Supabase Storage for large backups.",
          data_preview: JSON.stringify(backupData).substring(0, 1000) + "..."
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

  } catch (error) {
    console.error("❌ Backup error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        backup_id: null
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

// Helper function to convert data to CSV
function convertToCSV(data: any): string {
  let csv = '';
  
  // Add metadata as header
  csv += `# Temba Payment Backup\n`;
  csv += `# Backup ID: ${data.metadata.backup_id}\n`;
  csv += `# Created: ${data.metadata.created_at}\n`;
  csv += `# Records: ${data.metadata.record_count}\n\n`;
  
  // Convert each data type to CSV
  if (data.payments) {
    csv += `## PAYMENTS (${data.payments.length} records)\n`;
    csv += convertArrayToCSV(data.payments);
    csv += '\n\n';
  }
  
  if (data.orders) {
    csv += `## ORDERS (${data.orders.length} records)\n`;
    csv += convertArrayToCSV(data.orders);
    csv += '\n\n';
  }
  
  if (data.tickets) {
    csv += `## TICKETS (${data.tickets.length} records)\n`;
    csv += convertArrayToCSV(data.tickets);
    csv += '\n\n';
  }
  
  return csv;
}

function convertArrayToCSV(array: any[]): string {
  if (!array || array.length === 0) return '';
  
  // Get headers from first object (flattened)
  const headers = Object.keys(flattenObject(array[0]));
  let csv = headers.join(',') + '\n';
  
  // Add data rows
  array.forEach(item => {
    const flattened = flattenObject(item);
    const row = headers.map(header => {
      const value = flattened[header];
      // Escape commas and quotes in CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    });
    csv += row.join(',') + '\n';
  });
  
  return csv;
}

function flattenObject(obj: any, prefix = ''): any {
  const flattened: any = {};
  
  for (const key in obj) {
    if (obj[key] === null || obj[key] === undefined) {
      flattened[prefix + key] = '';
    } else if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      Object.assign(flattened, flattenObject(obj[key], prefix + key + '_'));
    } else if (Array.isArray(obj[key])) {
      flattened[prefix + key] = JSON.stringify(obj[key]);
    } else {
      flattened[prefix + key] = obj[key];
    }
  }
  
  return flattened;
}
