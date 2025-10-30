// =====================================================
// TEST TRANSFER TO yabresi@gmail.com
// =====================================================

console.log('🧪 Testing transfer TO yabresi@gmail.com...');

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
    // Step 3: Transfer to yabresi@gmail.com
    const testTicket = userTickets[0];
    
    console.log('🔄 Testing transfer to yabresi@gmail.com...');
    console.log('📤 From:', user.email, '(ID:', user.id, ')');
    console.log('📥 To: yabresi@gmail.com');
    console.log('🎫 Ticket:', testTicket.id);

    const { data: transferResult, error: transferError } = await supabase.functions.invoke('transfer-ticket', {
      body: {
        ticketId: testTicket.id,
        recipientEmail: 'yabresi@gmail.com',
        recipientName: 'Yabresi Test',
        message: 'Test transfer to yabresi@gmail.com'
      }
    });

    console.log('📤 Transfer result:', transferResult);
    console.log('❌ Transfer error:', transferError);

    if (transferResult?.success) {
      console.log('✅ Transfer successful!');
      
      // Step 4: Check if the transfer was created correctly
      console.log('🔍 Checking transfer record...');
      const { data: transferRecord, error: recordError } = await supabase
        .from('ticket_transfers')
        .select('*')
        .eq('ticket_id', testTicket.id)
        .order('created_at', { ascending: false })
        .limit(1);

      console.log('📋 Transfer record:', transferRecord);
      console.log('❌ Record error:', recordError);

      // Step 5: Check if ticket ownership was transferred
      console.log('🔍 Checking ticket ownership...');
      const { data: updatedTicket, error: ticketError } = await supabase
        .from('tickets')
        .select('user_id, status')
        .eq('id', testTicket.id)
        .single();

      console.log('🎫 Updated ticket:', updatedTicket);
      console.log('❌ Ticket error:', ticketError);

      // Step 6: Check if yabresi@gmail.com can see the transferred ticket
      console.log('🔍 Checking if yabresi@gmail.com can see the ticket...');
      const { data: yabresiProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', 'yabresi@gmail.com')
        .single();

      if (yabresiProfile) {
        const { data: yabresiTickets, error: yabresiTicketsError } = await supabase
          .from('tickets')
          .select('id, user_id, status')
          .eq('user_id', yabresiProfile.user_id);

        console.log('🎫 yabresi@gmail.com tickets:', yabresiTickets);
        console.log('❌ yabresi@gmail.com tickets error:', yabresiTicketsError);
      }
    }
  }
}

console.log('✅ Test completed!');
