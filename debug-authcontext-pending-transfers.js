// =====================================================
// DEBUG AUTHCONTEXT PENDING TRANSFERS
// =====================================================

console.log('🔍 Debugging AuthContext Pending Transfers...');

// Get current user
const { data: { user }, error: userError } = await supabase.auth.getUser();
console.log('👤 Current user:', user?.email);
console.log('❌ User error:', userError);

if (!user) {
  console.log('❌ No user logged in. Please log in first.');
  return;
}

// Get user profile
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', user.id)
  .single();

console.log('👤 User profile:', profile);
console.log('❌ Profile error:', profileError);

// Check for pending transfers with user email
console.log('🔍 Checking for pending transfers with email:', user.email);
const { data: transfersByEmail, error: emailError } = await supabase
  .from('ticket_transfers')
  .select('*')
  .eq('status', 'PENDING')
  .eq('recipient_email', user.email);

console.log('📧 Transfers by email:', transfersByEmail);
console.log('❌ Email error:', emailError);

// Check for pending transfers with user phone
if (profile?.phone) {
  console.log('🔍 Checking for pending transfers with phone:', profile.phone);
  const { data: transfersByPhone, error: phoneError } = await supabase
    .from('ticket_transfers')
    .select('*')
    .eq('status', 'PENDING')
    .eq('recipient_phone', profile.phone);

  console.log('📱 Transfers by phone:', transfersByPhone);
  console.log('❌ Phone error:', phoneError);
}

// Check for any pending transfers (for debugging)
console.log('🔍 Checking for ALL pending transfers...');
const { data: allPendingTransfers, error: allError } = await supabase
  .from('ticket_transfers')
  .select('*')
  .eq('status', 'PENDING');

console.log('📋 All pending transfers:', allPendingTransfers);
console.log('❌ All error:', allError);

// Check user's current tickets
console.log('🎫 Checking user tickets...');
const { data: userTickets, error: ticketsError } = await supabase
  .from('tickets')
  .select(`
    id,
    event_id,
    ticket_type_id,
    status,
    created_at,
    event:events (
      title,
      start_date
    )
  `)
  .eq('user_id', user.id);

console.log('🎫 User tickets:', userTickets);
console.log('❌ Tickets error:', ticketsError);

console.log('✅ Debug completed!');
