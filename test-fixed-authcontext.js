// =====================================================
// TEST FIXED AUTHCONTEXT
// =====================================================

console.log('🔧 Testing fixed AuthContext...');

// Test 1: Check if user is logged in
const { data: { user }, error: userError } = await supabase.auth.getUser();
console.log('👤 Current user:', user?.email);

if (!user) {
  console.log('❌ No user logged in. Please log in first.');
} else {
  // Test 2: Check for pending transfers with correct column names
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
    .or(`recipient_email.eq.${user.email}`);

  console.log('📧 Pending transfers result:', transfers);
  console.log('❌ Error:', error);

  if (transfers && transfers.length > 0) {
    console.log('✅ Found pending transfers!');
    
    // Test 3: Try to get ticket info with correct column name
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
    
    if (ticket) {
      console.log('✅ Ticket query successful!');
      console.log('🎫 Ticket type ID:', ticket.ticket_type_id);
      console.log('🎫 Event title:', ticket.event?.title);
    }
  } else {
    console.log('ℹ️ No pending transfers found');
  }
}

console.log('✅ Test completed!');
