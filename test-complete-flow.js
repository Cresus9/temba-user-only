// =====================================================
// TEST COMPLETE PENDING TRANSFER FLOW
// =====================================================
// Copy and paste this into the browser console

console.log('🧪 Testing complete pending transfer flow...');

// Step 1: Check current user
const { data: { user }, error: userError } = await supabase.auth.getUser();
console.log('👤 Current user:', user?.email, 'ID:', user?.id);

if (!user) {
  console.log('❌ No user logged in');
} else if (user.email !== 'gtr@gmail.com') {
  console.log('❌ Not logged in as gtr@gmail.com - please log in as gtr@gmail.com');
} else {
  console.log('✅ Testing as gtr@gmail.com');
  
  // Step 2: Test the complete AuthContext query
  console.log('🔍 Testing complete AuthContext query...');
  
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
    .eq('recipient_email', user.email);

  console.log('🔍 Transfers result:', transfers);
  console.log('❌ Transfers error:', error);
  
  if (transfers && transfers.length > 0) {
    console.log('✅ SUCCESS! Found pending transfers!');
    console.log('📊 Number of pending transfers:', transfers.length);
    
    // Test the enrichment process
    console.log('🔍 Testing complete transfer enrichment...');
    
    for (const transfer of transfers) {
      console.log(`📋 Processing transfer ${transfer.id}...`);
      
      // Get sender info
      const { data: sender, error: senderError } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('user_id', transfer.sender_id)
        .single();
      
      console.log(`👤 Sender:`, sender);
      console.log(`❌ Sender error:`, senderError);
      
      // Get ticket info
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          id,
          event_id,
          ticket_type_id,
          status,
          event:events (
            title,
            date,
            venue
          )
        `)
        .eq('id', transfer.ticket_id)
        .single();
      
      console.log(`🎫 Ticket:`, ticket);
      console.log(`❌ Ticket error:`, ticketError);
      
      if (sender && ticket) {
        console.log('✅ Complete transfer enrichment successful!');
        console.log('📋 Complete enriched transfer:', {
          ...transfer,
          sender,
          ticket
        });
        
        console.log('🎉 The PendingTransfersNotification should now show with complete data!');
        console.log('🎁 Look for the floating gift icon in the bottom-right corner');
        console.log('📱 Click it to see the transfer details with event info');
        
      } else {
        console.log('❌ Transfer enrichment failed');
        if (!sender) console.log('❌ Sender enrichment failed');
        if (!ticket) console.log('❌ Ticket enrichment failed');
      }
    }
    
  } else {
    console.log('❌ No pending transfers found');
  }
}

console.log('✅ Test completed!');
