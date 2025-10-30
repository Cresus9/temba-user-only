// =====================================================
// TEST TRANSFER TO REGISTERED USER
// =====================================================

console.log('🧪 Testing transfer to registered user...');

// Step 1: Check current user
const { data: { user }, error: userError } = await supabase.auth.getUser();
console.log('👤 Current user:', user?.email, 'ID:', user?.id);

if (!user) {
  console.log('❌ No user logged in');
} else {
  // Step 2: Find a ticket owned by this user
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
    // Step 3: Find another user to transfer to
    console.log('👥 Looking for another user to transfer to...');
    const { data: otherUsers, error: usersError } = await supabase
      .from('profiles')
      .select('user_id, name, email')
      .neq('user_id', user.id)
      .limit(5);

    console.log('👥 Other users:', otherUsers);
    console.log('❌ Users error:', usersError);

    if (!otherUsers || otherUsers.length === 0) {
      console.log('❌ No other users found');
    } else {
      // Step 4: Test transfer to another registered user
      const testTicket = userTickets[0];
      const testRecipient = otherUsers[0];
      
      console.log('🔄 Testing transfer...');
      console.log('📤 From:', user.email, '(ID:', user.id, ')');
      console.log('📥 To:', testRecipient.email, '(ID:', testRecipient.user_id, ')');
      console.log('🎫 Ticket:', testTicket.id);

      const { data: transferResult, error: transferError } = await supabase.functions.invoke('transfer-ticket', {
        body: {
          ticketId: testTicket.id,
          recipientEmail: testRecipient.email,
          recipientName: testRecipient.name,
          message: 'Test transfer to registered user'
        }
      });

      console.log('📤 Transfer result:', transferResult);
      console.log('❌ Transfer error:', transferError);

      if (transferResult?.success) {
        console.log('✅ Transfer successful!');
        
        // Step 5: Check if the transfer was created correctly
        console.log('🔍 Checking transfer record...');
        const { data: transferRecord, error: recordError } = await supabase
          .from('ticket_transfers')
          .select('*')
          .eq('ticket_id', testTicket.id)
          .order('created_at', { ascending: false })
          .limit(1);

        console.log('📋 Transfer record:', transferRecord);
        console.log('❌ Record error:', recordError);

        // Step 6: Check if ticket ownership was transferred
        console.log('🔍 Checking ticket ownership...');
        const { data: updatedTicket, error: ticketError } = await supabase
          .from('tickets')
          .select('user_id, status')
          .eq('id', testTicket.id)
          .single();

        console.log('🎫 Updated ticket:', updatedTicket);
        console.log('❌ Ticket error:', ticketError);
      }
    }
  }
}

console.log('✅ Test completed!');
