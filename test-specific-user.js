// =====================================================
// TEST SPECIFIC USER TRANSFERS
// =====================================================

console.log('🔍 Testing specific user transfers...');

// Test with yabresi@gmail.com (most recent user)
const testEmail = 'yabresi@gmail.com';
console.log('👤 Testing with email:', testEmail);

// Check if user is logged in
const { data: { user }, error: userError } = await supabase.auth.getUser();
console.log('👤 Current logged in user:', user?.email);

if (user?.email !== testEmail) {
  console.log('⚠️ Please log in as', testEmail, 'to test this specific user');
  console.log('Current user:', user?.email);
} else {
  console.log('✅ Logged in as correct user:', testEmail);
  
  // Test pending transfers query
  console.log('🔍 Checking for pending transfers...');
  const { data: transfers, error } = await supabase
    .from('ticket_transfers')
    .select(`
      id,
      ticket_id,
      sender_id,
      recipient_email,
      recipient_phone,
      recipient_name,
      message,
      status,
      created_at
    `)
    .eq('status', 'PENDING')
    .eq('recipient_email', testEmail);

  console.log('📧 Pending transfers for', testEmail, ':', transfers);
  console.log('❌ Error:', error);

  if (transfers && transfers.length > 0) {
    console.log('✅ Found', transfers.length, 'pending transfers!');
    
    // Test getting ticket info for first transfer
    const firstTransfer = transfers[0];
    console.log('🔍 Getting ticket info for transfer:', firstTransfer.id);
    
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        id,
        event_id,
        ticket_type_id,
        status,
        event:events (
          title,
          start_date,
          location
        )
      `)
      .eq('id', firstTransfer.ticket_id)
      .single();
    
    console.log('🎫 Ticket info:', ticket);
    console.log('❌ Ticket error:', ticketError);
  } else {
    console.log('ℹ️ No pending transfers found for', testEmail);
  }
  
  // Check user's current tickets
  console.log('🎫 Checking user tickets...');
  const { data: userTickets, error: ticketsError } = await supabase
    .from('tickets')
    .select(`
      id,
      event_id,
      ticket_type_id,
      status,
      created_at,
      event:events (
        title,
        start_date
      )
    `)
    .eq('user_id', user.id);

  console.log('🎫 User tickets:', userTickets);
  console.log('❌ Tickets error:', ticketsError);
}

console.log('✅ Test completed!');
