// =====================================================
// TEST COMPLETE TRANSFER FLOW
// =====================================================

console.log('🧪 Testing complete transfer flow...');

// Step 1: Check current user
const { data: { user }, error: userError } = await supabase.auth.getUser();
console.log('👤 Current user:', user?.email);

if (!user) {
  console.log('❌ No user logged in');
} else {
  // Step 2: Check user's current tickets
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

  // Step 3: Check for pending transfers
  console.log('🔍 Checking for pending transfers...');
  const { data: pendingTransfers, error: pendingError } = await supabase
    .from('ticket_transfers')
    .select('*')
    .eq('status', 'PENDING')
    .eq('recipient_email', user.email);

  console.log('📧 Pending transfers:', pendingTransfers);
  console.log('❌ Pending error:', pendingError);

  // Step 4: Check for completed transfers (received tickets)
  console.log('🔍 Checking for completed transfers (received tickets)...');
  const { data: completedTransfers, error: completedError } = await supabase
    .from('ticket_transfers')
    .select('*')
    .eq('status', 'COMPLETED')
    .eq('recipient_id', user.id);

  console.log('✅ Completed transfers:', completedTransfers);
  console.log('❌ Completed error:', completedError);

  // Step 5: Check for sent transfers
  console.log('🔍 Checking for sent transfers...');
  const { data: sentTransfers, error: sentError } = await supabase
    .from('ticket_transfers')
    .select('*')
    .eq('sender_id', user.id);

  console.log('📤 Sent transfers:', sentTransfers);
  console.log('❌ Sent error:', sentError);
}

console.log('✅ Test completed!');
