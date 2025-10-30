// =====================================================
// TEST GTR AUTHCONTEXT
// =====================================================

console.log('🧪 Testing AuthContext for gtr@gmail.com...');

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
  
  // Step 3: Test the exact AuthContext query
  console.log('🔍 Testing AuthContext checkPendingTransfers query...');
  
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

  console.log('🔍 AuthContext query result:', transfers);
  console.log('❌ AuthContext query error:', error);
  
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
      
      console.log(`👤 Sender for transfer ${transfer.id}:`, sender);
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
      
      console.log(`🎫 Ticket for transfer ${transfer.id}:`, ticket);
      console.log(`❌ Ticket error:`, ticketError);
    }
  } else {
    console.log('❌ No pending transfers found');
    console.log('🔍 This means the AuthContext should not show any notifications');
  }
  
  // Step 4: Check if there are any transfers at all for this email
  console.log('🔍 Checking all transfers for gtr@gmail.com...');
  const { data: allTransfers, error: allError } = await supabase
    .from('ticket_transfers')
    .select('*')
    .eq('recipient_email', 'gtr@gmail.com');
  
  console.log('📋 All transfers for gtr@gmail.com:', allTransfers);
  console.log('❌ All transfers error:', allError);
}

console.log('✅ Test completed!');
