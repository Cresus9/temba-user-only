// =====================================================
// TEST PENDING TRANSFER DETECTION
// =====================================================

console.log('🧪 Testing pending transfer detection...');

// Step 1: Check if user is logged in as yabresi@gmail.com
const { data: { user }, error: userError } = await supabase.auth.getUser();
console.log('👤 Current user:', user?.email);

if (user?.email !== 'yabresi@gmail.com') {
  console.log('⚠️ Please log in as yabresi@gmail.com to test this');
  console.log('Current user:', user?.email);
} else {
  console.log('✅ Logged in as correct user:', user.email);
  
  // Step 2: Check for pending transfers (this should now find the test transfer)
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
    .eq('recipient_email', 'yabresi@gmail.com');

  console.log('📧 Pending transfers found:', transfers);
  console.log('❌ Error:', error);

  if (transfers && transfers.length > 0) {
    console.log('✅ Found', transfers.length, 'pending transfers!');
    
    // Step 3: Test the AuthContext logic manually
    console.log('🔍 Testing AuthContext logic...');
    
    const enrichedTransfers = await Promise.all(
      transfers.map(async (transfer) => {
        // Get sender info
        const { data: sender } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('user_id', transfer.sender_id)
          .single();

        // Get ticket info
        const { data: ticket } = await supabase
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
          .eq('id', transfer.ticket_id)
          .single();

        return {
          ...transfer,
          sender: sender || { name: 'Unknown', email: 'unknown@example.com' },
          ticket: ticket || null
        };
      })
    );

    console.log('🎫 Enriched transfers:', enrichedTransfers);
    
    // Step 4: Test claiming the transfer
    if (enrichedTransfers.length > 0) {
      const firstTransfer = enrichedTransfers[0];
      console.log('🔄 Testing claim for transfer:', firstTransfer.id);
      
      const { data: claimResult, error: claimError } = await supabase.functions.invoke('claim-pending-transfer', {
        body: { transferId: firstTransfer.id }
      });
      
      console.log('🎯 Claim result:', claimResult);
      console.log('❌ Claim error:', claimError);
      
      if (claimResult?.success) {
        console.log('✅ Transfer claimed successfully!');
        
        // Check if ticket ownership was transferred
        const { data: updatedTicket, error: ticketError } = await supabase
          .from('tickets')
          .select('user_id, status')
          .eq('id', firstTransfer.ticket_id)
          .single();
        
        console.log('🎫 Updated ticket ownership:', updatedTicket);
        console.log('❌ Ticket error:', ticketError);
      }
    }
  } else {
    console.log('❌ No pending transfers found. The test transfer may not have been created.');
  }
}

console.log('✅ Test completed!');
