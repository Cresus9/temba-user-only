// =====================================================
// DEBUG COMPLETE TRANSFER FLOW
// =====================================================

console.log('🔍 Debugging complete transfer flow...');

// Step 1: Check current user
const { data: { user }, error: userError } = await supabase.auth.getUser();
console.log('👤 Current user:', user?.email, 'ID:', user?.id);

if (!user) {
  console.log('❌ No user logged in');
} else {
  // Step 2: Check if this is gtr@gmail.com
  if (user.email === 'gtr@gmail.com') {
    console.log('✅ Testing as gtr@gmail.com');
    
    // Step 3: Check user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, name, email, phone')
      .eq('user_id', user.id)
      .single();
    
    console.log('👤 Profile:', profile);
    console.log('❌ Profile error:', profileError);
    
    // Step 4: Check pending transfers by email
    console.log('📧 Checking pending transfers by email...');
    const { data: emailTransfers, error: emailError } = await supabase
      .from('ticket_transfers')
      .select('*')
      .eq('recipient_email', 'gtr@gmail.com')
      .eq('status', 'PENDING');
    
    console.log('📧 Email transfers:', emailTransfers);
    console.log('❌ Email transfers error:', emailError);
    
    // Step 5: Check all transfers to gtr@gmail.com (any status)
    console.log('📋 Checking all transfers to gtr@gmail.com...');
    const { data: allTransfers, error: allError } = await supabase
      .from('ticket_transfers')
      .select('*')
      .eq('recipient_email', 'gtr@gmail.com');
    
    console.log('📋 All transfers to gtr@gmail.com:', allTransfers);
    console.log('❌ All transfers error:', allError);
    
    // Step 6: Check if there are any pending transfers at all
    console.log('🌍 Checking all pending transfers in system...');
    const { data: allPending, error: allPendingError } = await supabase
      .from('ticket_transfers')
      .select('*')
      .eq('status', 'PENDING');
    
    console.log('🌍 All pending transfers:', allPending);
    console.log('❌ All pending transfers error:', allPendingError);
    
    // Step 7: Check recent transfers (last 5)
    console.log('🕒 Checking recent transfers...');
    const { data: recentTransfers, error: recentError } = await supabase
      .from('ticket_transfers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log('🕒 Recent transfers:', recentTransfers);
    console.log('❌ Recent transfers error:', recentError);
    
  } else {
    console.log('❌ Not logged in as gtr@gmail.com - please log in as gtr@gmail.com to test');
  }
}

console.log('✅ Debug completed!');
