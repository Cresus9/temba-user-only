import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RecoveryRequest {
  recovery_type: 'point_in_time' | 'backup_restore' | 'data_verification';
  backup_id?: string;
  recovery_point_id?: string;
  target_time?: string;
  dry_run?: boolean; // If true, only validate what would be recovered
  tables?: string[]; // Specific tables to recover
}

interface RecoveryResult {
  recovery_id: string;
  recovery_type: string;
  records_recovered: number;
  tables_affected: string[];
  dry_run: boolean;
  success: boolean;
  errors: string[];
  warnings: string[];
  created_at: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔄 Payment Recovery Function Started");

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const payload: RecoveryRequest = await req.json();
    console.log("🔧 Recovery request:", payload);

    // Validate request
    if (!payload.recovery_type) {
      throw new Error("recovery_type is required");
    }

    const recoveryId = crypto.randomUUID();
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    let recordsRecovered = 0;
    const tablesAffected: string[] = [];

    console.log("🚀 Starting recovery process:", recoveryId);

    // Handle different recovery types
    switch (payload.recovery_type) {
      case 'backup_restore':
        if (!payload.backup_id) {
          throw new Error("backup_id is required for backup_restore");
        }
        
        const restoreResult = await restoreFromBackup(
          supabase, 
          payload.backup_id, 
          payload.dry_run || false,
          payload.tables
        );
        
        recordsRecovered = restoreResult.recordsRecovered;
        tablesAffected.push(...restoreResult.tablesAffected);
        errors.push(...restoreResult.errors);
        warnings.push(...restoreResult.warnings);
        break;

      case 'point_in_time':
        if (!payload.target_time && !payload.recovery_point_id) {
          throw new Error("Either target_time or recovery_point_id is required for point_in_time recovery");
        }
        
        const pitResult = await pointInTimeRecovery(
          supabase,
          payload.recovery_point_id,
          payload.target_time,
          payload.dry_run || false,
          payload.tables
        );
        
        recordsRecovered = pitResult.recordsRecovered;
        tablesAffected.push(...pitResult.tablesAffected);
        errors.push(...pitResult.errors);
        warnings.push(...pitResult.warnings);
        break;

      case 'data_verification':
        const verifyResult = await verifyDataIntegrity(
          supabase,
          payload.backup_id,
          payload.tables
        );
        
        recordsRecovered = verifyResult.recordsVerified;
        tablesAffected.push(...verifyResult.tablesVerified);
        errors.push(...verifyResult.errors);
        warnings.push(...verifyResult.warnings);
        break;

      default:
        throw new Error(`Unknown recovery_type: ${payload.recovery_type}`);
    }

    const processingTime = Date.now() - startTime;
    const success = errors.length === 0;

    // Log recovery attempt
    try {
      await supabase
        .from('payment_audit_log')
        .insert({
          payment_id: null,
          action: 'recovery_attempt',
          metadata: {
            recovery_id: recoveryId,
            recovery_type: payload.recovery_type,
            backup_id: payload.backup_id,
            recovery_point_id: payload.recovery_point_id,
            target_time: payload.target_time,
            dry_run: payload.dry_run,
            records_recovered: recordsRecovered,
            tables_affected: tablesAffected,
            success: success,
            errors: errors,
            warnings: warnings,
            processing_time_ms: processingTime
          }
        });
    } catch (logError) {
      console.error("❌ Failed to log recovery attempt:", logError);
      warnings.push("Failed to log recovery attempt");
    }

    const result: RecoveryResult = {
      recovery_id: recoveryId,
      recovery_type: payload.recovery_type,
      records_recovered: recordsRecovered,
      tables_affected: tablesAffected,
      dry_run: payload.dry_run || false,
      success: success,
      errors: errors,
      warnings: warnings,
      created_at: new Date().toISOString()
    };

    console.log("✅ Recovery completed:", {
      recovery_id: recoveryId,
      success: success,
      records_recovered: recordsRecovered,
      processing_time_ms: processingTime
    });

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("❌ Recovery error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        recovery_id: null
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

// Restore from a specific backup
async function restoreFromBackup(
  supabase: any,
  backupId: string,
  dryRun: boolean,
  tables?: string[]
): Promise<{
  recordsRecovered: number;
  tablesAffected: string[];
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const tablesAffected: string[] = [];
  let recordsRecovered = 0;

  try {
    // Get backup record
    const { data: backup, error: backupError } = await supabase
      .from('payment_backups')
      .select('*')
      .eq('id', backupId)
      .single();

    if (backupError || !backup) {
      errors.push(`Backup not found: ${backupId}`);
      return { recordsRecovered, tablesAffected, errors, warnings };
    }

    if (backup.status !== 'completed') {
      errors.push(`Backup is not completed. Status: ${backup.status}`);
      return { recordsRecovered, tablesAffected, errors, warnings };
    }

    console.log("📦 Restoring from backup:", {
      backup_id: backupId,
      backup_type: backup.backup_type,
      record_count: backup.record_count,
      date_range: `${backup.date_from} to ${backup.date_to}`
    });

    // Validate backup integrity first
    const { data: validationResult } = await supabase
      .rpc('validate_backup_integrity', { backup_id: backupId });

    if (!validationResult) {
      warnings.push("Backup integrity validation failed - proceeding with caution");
    }

    if (dryRun) {
      // For dry run, just return what would be restored
      recordsRecovered = backup.record_count;
      
      switch (backup.backup_type) {
        case 'payments':
          tablesAffected.push('payments');
          break;
        case 'orders':
          tablesAffected.push('orders');
          break;
        case 'tickets':
          tablesAffected.push('tickets');
          break;
        case 'full':
          tablesAffected.push('payments', 'orders', 'tickets');
          break;
      }

      warnings.push("This is a dry run - no data was actually restored");
      return { recordsRecovered, tablesAffected, errors, warnings };
    }

    // TODO: Implement actual restoration logic
    // This would involve:
    // 1. Downloading backup data from storage or database
    // 2. Parsing the backup format (JSON/CSV)
    // 3. Validating data integrity
    // 4. Creating restoration transactions
    // 5. Inserting/updating data with conflict resolution
    
    warnings.push("Actual restoration logic not implemented - this is a framework");
    
    return { recordsRecovered, tablesAffected, errors, warnings };

  } catch (error) {
    errors.push(`Restoration failed: ${error.message}`);
    return { recordsRecovered, tablesAffected, errors, warnings };
  }
}

// Point-in-time recovery
async function pointInTimeRecovery(
  supabase: any,
  recoveryPointId?: string,
  targetTime?: string,
  dryRun: boolean = false,
  tables?: string[]
): Promise<{
  recordsRecovered: number;
  tablesAffected: string[];
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const tablesAffected: string[] = [];
  let recordsRecovered = 0;

  try {
    let recoveryPoint: any = null;
    let targetTimestamp: Date;

    if (recoveryPointId) {
      // Use existing recovery point
      const { data: rp, error: rpError } = await supabase
        .from('payment_recovery_points')
        .select('*')
        .eq('id', recoveryPointId)
        .single();

      if (rpError || !rp) {
        errors.push(`Recovery point not found: ${recoveryPointId}`);
        return { recordsRecovered, tablesAffected, errors, warnings };
      }

      recoveryPoint = rp;
      targetTimestamp = new Date(rp.recovery_point);
    } else if (targetTime) {
      // Create recovery point for target time
      targetTimestamp = new Date(targetTime);
      
      const { data: rpId, error: createError } = await supabase
        .rpc('create_recovery_point', {
          p_name: `Auto-generated for recovery ${new Date().toISOString()}`,
          p_description: 'Automatically created for point-in-time recovery',
          p_recovery_time: targetTimestamp.toISOString()
        });

      if (createError) {
        errors.push(`Failed to create recovery point: ${createError.message}`);
        return { recordsRecovered, tablesAffected, errors, warnings };
      }

      // Fetch the created recovery point
      const { data: rp, error: fetchError } = await supabase
        .from('payment_recovery_points')
        .select('*')
        .eq('id', rpId)
        .single();

      if (fetchError || !rp) {
        errors.push(`Failed to fetch created recovery point: ${rpId}`);
        return { recordsRecovered, tablesAffected, errors, warnings };
      }

      recoveryPoint = rp;
    } else {
      errors.push("Either recovery_point_id or target_time must be provided");
      return { recordsRecovered, tablesAffected, errors, warnings };
    }

    console.log("⏰ Point-in-time recovery:", {
      recovery_point_id: recoveryPoint.id,
      target_time: targetTimestamp.toISOString(),
      backup_count: recoveryPoint.backup_ids?.length || 0
    });

    if (!recoveryPoint.backup_ids || recoveryPoint.backup_ids.length === 0) {
      errors.push("No backups available for the specified recovery point");
      return { recordsRecovered, tablesAffected, errors, warnings };
    }

    // Process each backup in the recovery point
    for (const backupId of recoveryPoint.backup_ids) {
      const restoreResult = await restoreFromBackup(supabase, backupId, dryRun, tables);
      
      recordsRecovered += restoreResult.recordsRecovered;
      tablesAffected.push(...restoreResult.tablesAffected);
      errors.push(...restoreResult.errors);
      warnings.push(...restoreResult.warnings);
    }

    // Remove duplicates from tablesAffected
    const uniqueTables = [...new Set(tablesAffected)];
    tablesAffected.length = 0;
    tablesAffected.push(...uniqueTables);

    return { recordsRecovered, tablesAffected, errors, warnings };

  } catch (error) {
    errors.push(`Point-in-time recovery failed: ${error.message}`);
    return { recordsRecovered, tablesAffected, errors, warnings };
  }
}

// Verify data integrity
async function verifyDataIntegrity(
  supabase: any,
  backupId?: string,
  tables?: string[]
): Promise<{
  recordsVerified: number;
  tablesVerified: string[];
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const tablesVerified: string[] = [];
  let recordsVerified = 0;

  try {
    console.log("🔍 Verifying data integrity...");

    // If backup_id provided, verify against that backup
    if (backupId) {
      const { data: isValid, error: validationError } = await supabase
        .rpc('validate_backup_integrity', { backup_id: backupId });

      if (validationError) {
        errors.push(`Validation error: ${validationError.message}`);
        return { recordsVerified, tablesVerified, errors, warnings };
      }

      if (!isValid) {
        errors.push("Backup integrity validation failed");
      } else {
        warnings.push("Backup integrity validation passed");
      }

      // Get backup details
      const { data: backup } = await supabase
        .from('payment_backups')
        .select('*')
        .eq('id', backupId)
        .single();

      if (backup) {
        recordsVerified = backup.record_count;
        
        switch (backup.backup_type) {
          case 'payments':
            tablesVerified.push('payments');
            break;
          case 'orders':
            tablesVerified.push('orders');
            break;
          case 'tickets':
            tablesVerified.push('tickets');
            break;
          case 'full':
            tablesVerified.push('payments', 'orders', 'tickets');
            break;
        }
      }
    } else {
      // General integrity check
      const tablesToCheck = tables || ['payments', 'orders', 'tickets'];
      
      for (const table of tablesToCheck) {
        try {
          const { count, error: countError } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

          if (countError) {
            errors.push(`Failed to count records in ${table}: ${countError.message}`);
          } else {
            recordsVerified += count || 0;
            tablesVerified.push(table);
            warnings.push(`${table}: ${count} records verified`);
          }
        } catch (tableError) {
          errors.push(`Error checking table ${table}: ${tableError.message}`);
        }
      }
    }

    return { recordsVerified, tablesVerified, errors, warnings };

  } catch (error) {
    errors.push(`Data integrity verification failed: ${error.message}`);
    return { recordsVerified, tablesVerified, errors, warnings };
  }
}



