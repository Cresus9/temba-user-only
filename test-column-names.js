// =====================================================
// TEST CORRECT COLUMN NAMES
// =====================================================
// Copy and paste this into the browser console

console.log('🧪 Testing correct column names...');

// Step 1: Check current user
const { data: { user }, error: userError } = await supabase.auth.getUser();
console.log('👤 Current user:', user?.email, 'ID:', user?.id);

if (!user) {
  console.log('❌ No user logged in');
} else if (user.email !== 'gtr@gmail.com') {
  console.log('❌ Not logged in as gtr@gmail.com - please log in as gtr@gmail.com');
} else {
  console.log('✅ Testing as gtr@gmail.com');
  
  // Step 2: Test the ticket query with correct column names
  console.log('🔍 Testing ticket query with correct column names...');
  
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select(`
      id,
      event_id,
      ticket_type_id,
      status,
      event:events (
        title,
        date,
        venue
      )
    `)
    .eq('id', '621ee431-4bcb-4038-b609-51d09dbe7848')
    .single();
  
  console.log('🎫 Ticket result:', ticket);
  console.log('❌ Ticket error:', ticketError);
  
  if (ticket) {
    console.log('✅ SUCCESS! Ticket query worked with correct column names!');
    console.log('📋 Event details:', ticket.event);
    
    if (ticket.event) {
      console.log('🎉 Event title:', ticket.event.title);
      console.log('📅 Event date:', ticket.event.date);
      console.log('📍 Event venue:', ticket.event.venue);
    }
    
    console.log('🎁 The PendingTransfersNotification should now work completely!');
    
  } else {
    console.log('❌ Ticket query still failed');
    console.log('🔍 Error details:', ticketError);
  }
}

console.log('✅ Test completed!');
