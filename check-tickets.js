// Quick script to check tickets in the database
// Run with: node check-tickets.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwmlagvsivxqocklxbbo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3bWxhZ3ZzaXZ4cW9ja2x4YmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyNzMwMjYsImV4cCI6MjA1MTg0OTAyNn0.ylTM28oYPVjotPmEn9TSZGPy4EQW2pbWgNLRqWYduLc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTickets() {
  console.log('🔍 Checking database...\n');

  // First, check orders (especially free ticket orders)
  console.log('📦 Checking orders...');
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(`
      id,
      user_id,
      event_id,
      status,
      payment_method,
      total,
      created_at,
      ticket_quantities,
      event:events (
        id,
        title,
        status
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  if (ordersError) {
    console.error('❌ Error fetching orders:', ordersError);
  } else {
    console.log(`📊 Found ${orders?.length || 0} orders\n`);
    
    if (orders && orders.length > 0) {
      // Check for free ticket orders
      const freeOrders = orders.filter(o => 
        o.payment_method?.toUpperCase().includes('FREE') ||
        o.total === 0 ||
        !o.total
      );
      
      console.log(`🎫 Free ticket orders: ${freeOrders.length}`);
      freeOrders.forEach(order => {
        console.log(`\n  Order ID: ${order.id}`);
        console.log(`  User ID: ${order.user_id || 'N/A'}`);
        console.log(`  Event: ${order.event?.title || 'N/A'} (${order.event?.status || 'N/A'})`);
        console.log(`  Payment Method: ${order.payment_method || 'N/A'}`);
        console.log(`  Total: ${order.total || 0}`);
        console.log(`  Status: ${order.status}`);
        console.log(`  Ticket Quantities: ${JSON.stringify(order.ticket_quantities)}`);
      });
    }
  }

  // Now check tickets
  console.log('\n\n🎟️  Checking tickets...');
  const { data: tickets, error } = await supabase
    .from('tickets')
    .select(`
      id,
      qr_code,
      status,
      scanned_at,
      created_at,
      user_id,
      event_id,
      ticket_type_id,
      order_id,
      event:events (
        id,
        title,
        status
      ),
      ticket_type:ticket_types (
        id,
        name
      ),
      order:orders (
        id,
        status,
        payment_method,
        total,
        user_id
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('❌ Error fetching tickets:', error);
    return;
  }

  console.log(`📊 Found ${tickets?.length || 0} tickets (showing last 50)\n`);

  if (!tickets || tickets.length === 0) {
    console.log('No tickets found in database.');
    return;
  }

  // Group by user
  const ticketsByUser = {};
  tickets.forEach(ticket => {
    const userId = ticket.user_id || 'no-user';
    if (!ticketsByUser[userId]) {
      ticketsByUser[userId] = [];
    }
    ticketsByUser[userId].push(ticket);
  });

  console.log(`👥 Tickets grouped by ${Object.keys(ticketsByUser).length} users:\n`);

  Object.entries(ticketsByUser).forEach(([userId, userTickets]) => {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`User ID: ${userId}`);
    console.log(`Total tickets: ${userTickets.length}`);
    
    // Count by status
    const statusCounts = {};
    userTickets.forEach(t => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    });
    console.log(`Status breakdown:`, statusCounts);

    // Check for free tickets
    const freeTickets = userTickets.filter(t => 
      t.order?.payment_method?.toUpperCase().includes('FREE') ||
      t.order?.total === 0 ||
      !t.order?.total
    );
    
    if (freeTickets.length > 0) {
      console.log(`\n🎫 FREE TICKETS (${freeTickets.length}):`);
      freeTickets.forEach(t => {
        console.log(`  - Ticket ID: ${t.id.slice(0, 8)}...`);
        console.log(`    Event: ${t.event?.title || 'N/A'} (${t.event?.status || 'N/A'})`);
        console.log(`    Order: ${t.order_id?.slice(0, 8)}...`);
        console.log(`    Payment Method: ${t.order?.payment_method || 'N/A'}`);
        console.log(`    Order Total: ${t.order?.total || 0}`);
        console.log(`    Status: ${t.status}`);
        console.log(`    Scanned: ${t.scanned_at ? 'YES' : 'NO'}`);
        console.log('');
      });
    }

    // Show recent tickets
    console.log(`\n📋 Recent tickets (last 5):`);
    userTickets.slice(0, 5).forEach(t => {
      console.log(`  - ${t.id.slice(0, 8)}... | ${t.event?.title || 'N/A'} | Status: ${t.status} | Scanned: ${t.scanned_at ? 'YES' : 'NO'}`);
    });
  });

  // Summary
  console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log('📈 SUMMARY:');
  console.log(`Total tickets: ${tickets.length}`);
  console.log(`Valid tickets: ${tickets.filter(t => t.status === 'VALID').length}`);
  console.log(`Unscanned tickets: ${tickets.filter(t => !t.scanned_at).length}`);
  console.log(`Free tickets: ${tickets.filter(t => 
    t.order?.payment_method?.toUpperCase().includes('FREE') ||
    t.order?.total === 0 ||
    !t.order?.total
  ).length}`);
  console.log(`Tickets with published events: ${tickets.filter(t => t.event?.status === 'PUBLISHED').length}`);
}

checkTickets().catch(console.error);

