// =====================================================
// TEST AUTHCONTEXT PENDING TRANSFERS
// =====================================================

// This is a simple test to verify the AuthContext pending transfers logic
// Run this in the browser console after logging in

console.log('Testing AuthContext pending transfers...');

// Test 1: Check if user is logged in
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user?.email);

if (!user) {
  console.log('❌ No user logged in. Please log in first.');
} else {
  console.log('✅ User logged in:', user.email);
  
  // Test 2: Check for pending transfers
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

  if (error) {
    console.log('❌ Error fetching transfers:', error);
  } else {
    console.log('✅ Transfers query successful:', transfers?.length || 0, 'pending transfers');
    
    if (transfers && transfers.length > 0) {
      console.log('📋 Pending transfers:', transfers);
      
      // Test 3: Try to get sender info for first transfer
      const firstTransfer = transfers[0];
      const { data: sender, error: senderError } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('user_id', firstTransfer.sender_id)
        .single();
      
      if (senderError) {
        console.log('❌ Error fetching sender:', senderError);
      } else {
        console.log('✅ Sender info:', sender);
      }
      
      // Test 4: Try to get ticket info for first transfer
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          id,
          event_id,
          ticket_type,
          status,
          event:events (
            title,
            start_date,
            location
          )
        `)
        .eq('id', firstTransfer.ticket_id)
        .single();
      
      if (ticketError) {
        console.log('❌ Error fetching ticket:', ticketError);
      } else {
        console.log('✅ Ticket info:', ticket);
      }
    } else {
      console.log('ℹ️ No pending transfers found for this user');
    }
  }
}

console.log('Test completed!');
