// =====================================================
// TEST RLS FIX
// =====================================================

console.log('🧪 Testing RLS fix for gtr@gmail.com...');

// Step 1: Check current user
const { data: { user }, error: userError } = await supabase.auth.getUser();
console.log('👤 Current user:', user?.email, 'ID:', user?.id);

if (!user) {
  console.log('❌ No user logged in');
} else if (user.email !== 'gtr@gmail.com') {
  console.log('❌ Not logged in as gtr@gmail.com - please log in as gtr@gmail.com');
} else {
  console.log('✅ Testing as gtr@gmail.com');
  
  // Step 2: Test the exact AuthContext query
  console.log('🔍 Testing AuthContext query after RLS fix...');
  
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

  console.log('🔍 Query result:', transfers);
  console.log('❌ Query error:', error);
  
  if (transfers && transfers.length > 0) {
    console.log('✅ SUCCESS! Found pending transfers!');
    console.log('📊 Number of pending transfers:', transfers.length);
    
    // Show the transfer details
    transfers.forEach((transfer, index) => {
      console.log(`📋 Transfer ${index + 1}:`, {
        id: transfer.id,
        ticket_id: transfer.ticket_id,
        sender_id: transfer.sender_id,
        recipient_email: transfer.recipient_email,
        status: transfer.status,
        created_at: transfer.created_at
      });
    });
    
    console.log('🎉 The PendingTransfersNotification should now show!');
    console.log('🎁 Look for the floating gift icon in the bottom-right corner');
    
  } else {
    console.log('❌ Still no pending transfers found');
    console.log('🔍 This means the RLS policy fix might not have worked');
    
    // Let's test a broader query to see what transfers exist
    console.log('🔍 Testing broader query...');
    const { data: allTransfers, error: allError } = await supabase
      .from('ticket_transfers')
      .select('id, recipient_email, status, created_at')
      .eq('recipient_email', 'gtr@gmail.com');
    
    console.log('📋 All transfers for gtr@gmail.com:', allTransfers);
    console.log('❌ All transfers error:', allError);
  }
}

console.log('✅ Test completed!');
