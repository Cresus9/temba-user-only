// =====================================================
// CHECK TRANSFERS FOR yabresi@gmail.com
// =====================================================

console.log('🔍 Checking transfers for yabresi@gmail.com...');

// Get user ID for yabresi@gmail.com
const { data: userProfile, error: profileError } = await supabase
  .from('profiles')
  .select('user_id, name, email')
  .eq('email', 'yabresi@gmail.com')
  .single();

console.log('👤 User profile:', userProfile);
console.log('❌ Profile error:', profileError);

if (userProfile) {
  const userId = userProfile.user_id;
  
  // Check transfers where yabresi@gmail.com is the recipient
  console.log('📥 Checking transfers TO yabresi@gmail.com...');
  const { data: receivedTransfers, error: receivedError } = await supabase
    .from('ticket_transfers')
    .select(`
      id,
      ticket_id,
      sender_id,
      recipient_id,
      recipient_email,
      status,
      created_at,
      sender:profiles!ticket_transfers_sender_id_fkey (
        name,
        email
      )
    `)
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false });

  console.log('📥 Received transfers:', receivedTransfers);
  console.log('❌ Received transfers error:', receivedError);

  // Check transfers where yabresi@gmail.com is the sender
  console.log('📤 Checking transfers FROM yabresi@gmail.com...');
  const { data: sentTransfers, error: sentError } = await supabase
    .from('ticket_transfers')
    .select(`
      id,
      ticket_id,
      sender_id,
      recipient_id,
      recipient_email,
      status,
      created_at,
      recipient:profiles!ticket_transfers_recipient_id_fkey (
        name,
        email
      )
    `)
    .eq('sender_id', userId)
    .order('created_at', { ascending: false });

  console.log('📤 Sent transfers:', sentTransfers);
  console.log('❌ Sent transfers error:', sentError);

  // Check all transfers in the system
  console.log('🌍 Checking ALL transfers in system...');
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

  console.log('🌍 All transfers:', allTransfers);
  console.log('❌ All transfers error:', allError);

  // Check the specific ticket mentioned
  console.log('🎫 Checking specific ticket: 7e83ed03-4f50-4ebe-918c-f835402bcd7b');
  const { data: specificTicket, error: ticketError } = await supabase
    .from('tickets')
    .select(`
      id,
      user_id,
      status,
      event:events (
        title
      )
    `)
    .eq('id', '7e83ed03-4f50-4ebe-918c-f835402bcd7b')
    .single();

  console.log('🎫 Specific ticket:', specificTicket);
  console.log('❌ Specific ticket error:', ticketError);
}

console.log('✅ Check completed!');
