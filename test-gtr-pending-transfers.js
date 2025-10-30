// =====================================================
// TEST GTR PENDING TRANSFERS
// =====================================================

console.log('🧪 Testing pending transfers for gtr@gmail.com...');

// Step 1: Check current user
const { data: { user }, error: userError } = await supabase.auth.getUser();
console.log('👤 Current user:', user?.email, 'ID:', user?.id);

if (!user) {
  console.log('❌ No user logged in - please log in as gtr@gmail.com');
} else {
  // Step 2: Check user's profile
  console.log('👤 User profile check...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, name, email, phone')
    .eq('user_id', user.id)
    .single();

  console.log('👤 Profile:', profile);
  console.log('❌ Profile error:', profileError);

  // Step 3: Check pending transfers by email
  console.log('📧 Checking pending transfers by email...');
  const { data: emailTransfers, error: emailError } = await supabase
    .from('ticket_transfers')
    .select(`
      id,
      ticket_id,
      sender_id,
      recipient_email,
      status,
      created_at
    `)
    .eq('recipient_email', user.email)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false });

  console.log('📧 Email transfers:', emailTransfers);
  console.log('❌ Email transfers error:', emailError);

  // Step 4: Check pending transfers by phone (if user has phone)
  if (profile?.phone) {
    console.log('📱 Checking pending transfers by phone...');
    const { data: phoneTransfers, error: phoneError } = await supabase
      .from('ticket_transfers')
      .select(`
        id,
        ticket_id,
        sender_id,
        recipient_phone,
        status,
        created_at
      `)
      .eq('recipient_phone', profile.phone)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    console.log('📱 Phone transfers:', phoneTransfers);
    console.log('❌ Phone transfers error:', phoneError);
  }

  // Step 5: Check all pending transfers in system
  console.log('🌍 Checking all pending transfers...');
  const { data: allPending, error: allPendingError } = await supabase
    .from('ticket_transfers')
    .select(`
      id,
      ticket_id,
      sender_id,
      recipient_id,
      recipient_email,
      recipient_phone,
      status,
      created_at
    `)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false });

  console.log('🌍 All pending transfers:', allPending);
  console.log('❌ All pending transfers error:', allPendingError);

  // Step 6: Test the AuthContext checkPendingTransfers function
  console.log('🔍 Testing AuthContext checkPendingTransfers...');
  
  // Simulate what AuthContext does
  const { data: authContextTransfers, error: authContextError } = await supabase
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

  console.log('🔍 AuthContext transfers result:', authContextTransfers);
  console.log('❌ AuthContext transfers error:', authContextError);
}

console.log('✅ Test completed!');
