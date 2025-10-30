// =====================================================
// TEST UNREGISTERED TRANSFER FLOW
// =====================================================

console.log('🧪 Testing unregistered transfer flow...');

// Step 1: Check current user
const { data: { user }, error: userError } = await supabase.auth.getUser();
console.log('👤 Current user:', user?.email, 'ID:', user?.id);

if (!user) {
  console.log('❌ No user logged in');
} else {
  // Step 2: Find a ticket owned by current user
  console.log('🎫 Looking for tickets owned by current user...');
  const { data: userTickets, error: ticketsError } = await supabase
    .from('tickets')
    .select(`
      id,
      event_id,
      ticket_type_id,
      status,
      event:events (
        title,
        start_date
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'VALID');

  console.log('🎫 User tickets:', userTickets);
  console.log('❌ Tickets error:', ticketsError);

  if (!userTickets || userTickets.length === 0) {
    console.log('❌ No valid tickets found for this user');
  } else {
    // Step 3: Test transfer to unregistered email
    const testTicket = userTickets[0];
    const unregisteredEmail = 'test-unregistered-' + Date.now() + '@example.com';
    
    console.log('🔄 Testing transfer to unregistered user...');
    console.log('📤 From:', user.email, '(ID:', user.id, ')');
    console.log('📥 To:', unregisteredEmail);
    console.log('🎫 Ticket:', testTicket.id);

    const { data: transferResult, error: transferError } = await supabase.functions.invoke('transfer-ticket', {
      body: {
        ticketId: testTicket.id,
        recipientEmail: unregisteredEmail,
        recipientName: 'Test Unregistered User',
        message: 'Test transfer to unregistered user'
      }
    });

    console.log('📤 Transfer result:', transferResult);
    console.log('❌ Transfer error:', transferError);

    if (transferResult?.success) {
      console.log('✅ Transfer successful!');
      
      // Step 4: Check if the transfer was created as PENDING
      console.log('🔍 Checking transfer record...');
      const { data: transferRecord, error: recordError } = await supabase
        .from('ticket_transfers')
        .select('*')
        .eq('ticket_id', testTicket.id)
        .order('created_at', { ascending: false })
        .limit(1);

      console.log('📋 Transfer record:', transferRecord);
      console.log('❌ Record error:', recordError);

      // Step 5: Check if ticket ownership is still with original owner
      console.log('🔍 Checking ticket ownership...');
      const { data: updatedTicket, error: ticketError } = await supabase
        .from('tickets')
        .select('user_id, status')
        .eq('id', testTicket.id)
        .single();

      console.log('🎫 Updated ticket:', updatedTicket);
      console.log('❌ Ticket error:', ticketError);

      // Step 6: Simulate what happens when unregistered user signs up
      console.log('🔍 Simulating unregistered user signup...');
      console.log('📧 Email to check:', unregisteredEmail);
      
      // Check if pending transfers would be found for this email
      const { data: pendingTransfers, error: pendingError } = await supabase
        .from('ticket_transfers')
        .select('*')
        .eq('recipient_email', unregisteredEmail)
        .eq('status', 'PENDING');

      console.log('📧 Pending transfers for unregistered email:', pendingTransfers);
      console.log('❌ Pending transfers error:', pendingError);
    }
  }
}

console.log('✅ Test completed!');
