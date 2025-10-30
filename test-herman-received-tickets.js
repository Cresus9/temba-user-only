// =====================================================
// TEST HERMANYABRE5 RECEIVED TICKETS
// =====================================================

console.log('🧪 Testing received tickets for hermanyabre5@gmail.com...');

// Step 1: Check if hermanyabre5@gmail.com is logged in
const { data: { user }, error: userError } = await supabase.auth.getUser();
console.log('👤 Current user:', user?.email, 'ID:', user?.id);

if (!user) {
  console.log('❌ No user logged in - please log in as hermanyabre5@gmail.com');
} else {
  // Step 2: Check user's profile
  console.log('👤 User profile check...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, name, email')
    .eq('user_id', user.id)
    .single();

  console.log('👤 Profile:', profile);
  console.log('❌ Profile error:', profileError);

  // Step 3: Check user's tickets (direct ownership)
  console.log('🎫 Checking user tickets (direct ownership)...');
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
  console.log('❌ User tickets error:', ticketsError);

  // Step 4: Check transferred tickets using the service
  console.log('🎁 Checking transferred tickets using service...');
  try {
    const { data: transferredTickets, error: transferredError } = await supabase
      .from('ticket_transfers')
      .select(`
        id,
        ticket_id,
        sender_id,
        recipient_id,
        recipient_email,
        status,
        created_at,
        ticket:tickets!ticket_transfers_ticket_id_fkey (
          id,
          qr_code,
          status,
          event:events!inner (
            title,
            date,
            time,
            location,
            image_url
          ),
          ticket_type:ticket_types!inner (
            name,
            price
          )
        )
      `)
      .eq('recipient_id', user.id)
      .in('status', ['COMPLETED', 'USED'])
      .order('created_at', { ascending: false });

    console.log('🎁 Transferred tickets:', transferredTickets);
    console.log('❌ Transferred tickets error:', transferredError);
  } catch (error) {
    console.log('❌ Error checking transferred tickets:', error);
  }

  // Step 5: Check all transfers for this user
  console.log('📋 Checking all transfers for this user...');
  const { data: allTransfers, error: allTransfersError } = await supabase
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
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  console.log('📋 All transfers:', allTransfers);
  console.log('❌ All transfers error:', allTransfersError);
}

console.log('✅ Test completed!');
