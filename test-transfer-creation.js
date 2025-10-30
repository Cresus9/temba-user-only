// =====================================================
// TEST TRANSFER CREATION
// =====================================================

console.log('🧪 Testing transfer creation to unregistered user...');

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
    // Step 3: Create a test transfer to gtr@gmail.com
    const testTicket = userTickets[0];
    
    console.log('🔄 Creating test transfer to gtr@gmail.com...');
    console.log('📤 From:', user.email, '(ID:', user.id, ')');
    console.log('📥 To: gtr@gmail.com');
    console.log('🎫 Ticket:', testTicket.id);

    const { data: transferResult, error: transferError } = await supabase.functions.invoke('transfer-ticket', {
      body: {
        ticketId: testTicket.id,
        recipientEmail: 'gtr@gmail.com',
        recipientName: 'GTR Test User',
        message: 'Test transfer to gtr@gmail.com'
      }
    });

    console.log('📤 Transfer result:', transferResult);
    console.log('❌ Transfer error:', transferError);

    if (transferResult?.success) {
      console.log('✅ Transfer created successfully!');
      
      // Step 4: Verify the transfer was created
      console.log('🔍 Verifying transfer creation...');
      const { data: transferRecord, error: recordError } = await supabase
        .from('ticket_transfers')
        .select('*')
        .eq('ticket_id', testTicket.id)
        .order('created_at', { ascending: false })
        .limit(1);

      console.log('📋 Transfer record:', transferRecord);
      console.log('❌ Record error:', recordError);
      
      if (transferRecord && transferRecord.length > 0) {
        const transfer = transferRecord[0];
        console.log('✅ Transfer details:');
        console.log('  - ID:', transfer.id);
        console.log('  - Status:', transfer.status);
        console.log('  - Recipient Email:', transfer.recipient_email);
        console.log('  - Recipient ID:', transfer.recipient_id);
        console.log('  - Created:', transfer.created_at);
        
        if (transfer.status === 'PENDING' && transfer.recipient_id === null) {
          console.log('✅ Transfer created correctly for unregistered user!');
        } else {
          console.log('❌ Transfer not created correctly for unregistered user');
        }
      }
    }
  }
}

console.log('✅ Test completed!');
