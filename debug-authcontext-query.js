// =====================================================
// DEBUG AUTHCONTEXT QUERY
// =====================================================

console.log('🔍 Debugging AuthContext query...');

// Get current user
const { data: { user }, error: userError } = await supabase.auth.getUser();
console.log('👤 Current user:', user?.email);

if (!user) {
  console.log('❌ No user logged in');
} else {
  // Test 1: Check if transfer exists by ID
  console.log('🔍 Test 1: Check transfer by ID...');
  const { data: transferById, error: byIdError } = await supabase
    .from('ticket_transfers')
    .select('*')
    .eq('id', '4074de0b-84af-45c3-8415-a1fe36c9e084');
  
  console.log('📋 Transfer by ID:', transferById);
  console.log('❌ Error:', byIdError);

  // Test 2: Check all pending transfers
  console.log('🔍 Test 2: Check all pending transfers...');
  const { data: allPending, error: allPendingError } = await supabase
    .from('ticket_transfers')
    .select('*')
    .eq('status', 'PENDING');
  
  console.log('📋 All pending transfers:', allPending);
  console.log('❌ Error:', allPendingError);

  // Test 3: Check for yabresi@gmail.com specifically
  console.log('🔍 Test 3: Check for yabresi@gmail.com...');
  const { data: forEmail, error: forEmailError } = await supabase
    .from('ticket_transfers')
    .select('*')
    .eq('status', 'PENDING')
    .eq('recipient_email', 'yabresi@gmail.com');
  
  console.log('📧 Transfers for yabresi@gmail.com:', forEmail);
  console.log('❌ Error:', forEmailError);

  // Test 4: Test the exact AuthContext query
  console.log('🔍 Test 4: AuthContext exact query...');
  const { data: authContextQuery, error: authContextError } = await supabase
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
    .or(`recipient_email.eq.${user.email},recipient_phone.eq.${null}`);

  console.log('🔍 AuthContext query result:', authContextQuery);
  console.log('❌ AuthContext error:', authContextError);

  // Test 5: Test with simplified query
  console.log('🔍 Test 5: Simplified query...');
  const { data: simplified, error: simplifiedError } = await supabase
    .from('ticket_transfers')
    .select('*')
    .eq('status', 'PENDING')
    .eq('recipient_email', user.email);

  console.log('📧 Simplified query result:', simplified);
  console.log('❌ Simplified error:', simplifiedError);
}

console.log('✅ Debug completed!');
