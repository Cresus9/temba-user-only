// =====================================================
// TEST GTR FIX
// =====================================================

console.log('🧪 Testing GTR fix...');

// Step 1: Check current user
const { data: { user }, error: userError } = await supabase.auth.getUser();
console.log('👤 Current user:', user?.email, 'ID:', user?.id);

if (!user) {
  console.log('❌ No user logged in');
} else if (user.email !== 'gtr@gmail.com') {
  console.log('❌ Not logged in as gtr@gmail.com - please log in as gtr@gmail.com');
} else {
  console.log('✅ Testing as gtr@gmail.com');
  
  // Step 2: Check user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, name, email, phone')
    .eq('user_id', user.id)
    .single();
  
  console.log('👤 Profile:', profile);
  console.log('❌ Profile error:', profileError);
  
  // Step 3: Test the AuthContext checkPendingTransfers function directly
  console.log('🔍 Testing checkPendingTransfers function...');
  
  // This is the exact query from AuthContext
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

  console.log('🔍 checkPendingTransfers result:', transfers);
  console.log('❌ checkPendingTransfers error:', error);
  
  if (transfers && transfers.length > 0) {
    console.log('✅ Found pending transfers!');
    console.log('📊 Number of pending transfers:', transfers.length);
    
    // Test the enrichment process
    console.log('🔍 Testing transfer enrichment...');
    
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
            start_date,
            location
          )
        `)
        .eq('id', transfer.ticket_id)
        .single();
      
      console.log(`🎫 Ticket:`, ticket);
      console.log(`❌ Ticket error:`, ticketError);
      
      if (sender && ticket) {
        console.log('✅ Transfer enrichment successful!');
        console.log('📋 Enriched transfer:', {
          ...transfer,
          sender,
          ticket
        });
      } else {
        console.log('❌ Transfer enrichment failed');
      }
    }
  } else {
    console.log('❌ No pending transfers found');
  }
  
  // Step 4: Check if PendingTransfersNotification should show
  console.log('🔍 Checking if PendingTransfersNotification should show...');
  console.log('📊 Pending transfers count:', transfers?.length || 0);
  
  if (transfers && transfers.length > 0) {
    console.log('✅ PendingTransfersNotification should show the floating gift icon!');
    console.log('🎁 Look for the floating gift icon in the bottom-right corner');
  } else {
    console.log('❌ PendingTransfersNotification should not show');
  }
}

console.log('✅ Test completed!');
