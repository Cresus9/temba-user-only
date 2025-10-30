// =====================================================
// TEST CREATE AND CLAIM TRANSFER
// =====================================================

console.log('🧪 Testing create and claim transfer flow...');

// Step 1: Check if user is logged in
const { data: { user }, error: userError } = await supabase.auth.getUser();
console.log('👤 Current user:', user?.email);

if (!user) {
  console.log('❌ No user logged in. Please log in first.');
} else {
  // Step 2: Find a ticket owned by this user
  console.log('🔍 Looking for tickets owned by user...');
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
    console.log('❌ No valid tickets found for this user. Cannot test transfer.');
    console.log('💡 You need to buy a ticket first, or use a different user who has tickets.');
  } else {
    console.log('✅ Found', userTickets.length, 'valid tickets');
    
    // Step 3: Create a test transfer
    const testTicket = userTickets[0];
    const testRecipientEmail = 'test-recipient@example.com';
    
    console.log('🔄 Creating test transfer for ticket:', testTicket.id);
    console.log('📧 Transferring to:', testRecipientEmail);
    
    const { data: transferData, error: transferError } = await supabase
      .from('ticket_transfers')
      .insert({
        ticket_id: testTicket.id,
        sender_id: user.id,
        recipient_email: testRecipientEmail,
        recipient_name: 'Test Recipient',
        message: 'Test transfer for debugging',
        status: 'PENDING'
      })
      .select()
      .single();
    
    console.log('📤 Transfer created:', transferData);
    console.log('❌ Transfer error:', transferError);
    
    if (transferData) {
      console.log('✅ Test transfer created successfully!');
      console.log('🆔 Transfer ID:', transferData.id);
      
      // Step 4: Now test claiming the transfer
      console.log('🔍 Testing claim functionality...');
      
      // First, let's check if the transfer appears in pending transfers
      const { data: pendingTransfers, error: pendingError } = await supabase
        .from('ticket_transfers')
        .select('*')
        .eq('status', 'PENDING')
        .eq('recipient_email', testRecipientEmail);
      
      console.log('📋 Pending transfers for', testRecipientEmail, ':', pendingTransfers);
      console.log('❌ Pending error:', pendingError);
      
      if (pendingTransfers && pendingTransfers.length > 0) {
        console.log('✅ Pending transfer found! Now testing claim...');
        
        // Test the claim function
        const { data: claimResult, error: claimError } = await supabase.functions.invoke('claim-pending-transfer', {
          body: { transferId: transferData.id }
        });
        
        console.log('🎯 Claim result:', claimResult);
        console.log('❌ Claim error:', claimError);
      }
    }
  }
}

console.log('✅ Test completed!');
