// =====================================================
// CHECK ALL TRANSFERS - SIMPLE
// =====================================================

console.log('🔍 Checking all transfers in database...');

// Check all transfers
const { data: allTransfers, error: allError } = await supabase
  .from('ticket_transfers')
  .select(`
    id,
    ticket_id,
    sender_id,
    recipient_id,
    recipient_email,
    status,
    created_at
  `)
  .order('created_at', { ascending: false });

console.log('📋 All transfers:', allTransfers);
console.log('❌ All transfers error:', allError);

// Check completed transfers specifically
const { data: completedTransfers, error: completedError } = await supabase
  .from('ticket_transfers')
  .select(`
    id,
    ticket_id,
    sender_id,
    recipient_id,
    recipient_email,
    status,
    created_at
  `)
  .eq('status', 'COMPLETED')
  .order('created_at', { ascending: false });

console.log('✅ Completed transfers:', completedTransfers);
console.log('❌ Completed transfers error:', completedError);

// Check current user
const { data: { user } } = await supabase.auth.getUser();
console.log('👤 Current user:', user?.email, 'ID:', user?.id);

if (user) {
  // Check transfers for current user
  const { data: userTransfers, error: userError } = await supabase
    .from('ticket_transfers')
    .select(`
      id,
      ticket_id,
      sender_id,
      recipient_id,
      recipient_email,
      status,
      created_at
    `)
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false });

  console.log('👤 User transfers (as recipient):', userTransfers);
  console.log('❌ User transfers error:', userError);
}

console.log('✅ Check completed!');
