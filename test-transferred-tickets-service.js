// =====================================================
// TEST TRANSFERRED TICKETS SERVICE
// =====================================================

console.log('🧪 Testing transferredTicketsService for hermanyabre5@gmail.com...');

// Step 1: Check current user
const { data: { user }, error: userError } = await supabase.auth.getUser();
console.log('👤 Current user:', user?.email, 'ID:', user?.id);

if (!user) {
  console.log('❌ No user logged in - please log in as hermanyabre5@gmail.com');
} else {
  // Step 2: Test the exact query used by transferredTicketsService
  console.log('🔍 Testing transferredTicketsService query...');
  
  const { data: transfers, error } = await supabase
    .from('ticket_transfers')
    .select(`
      id,
      ticket_id,
      sender_id,
      recipient_id,
      recipient_email,
      recipient_phone,
      recipient_name,
      message,
      status,
      created_at,
      updated_at,
      ticket:tickets!ticket_transfers_ticket_id_fkey (
        id,
        qr_code,
        status,
        scanned_at,
        scan_location,
        scanned_by,
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

  console.log('🎁 Transferred tickets query result:', transfers);
  console.log('❌ Transferred tickets query error:', error);

  // Step 3: Test without the complex joins to see if that's the issue
  console.log('🔍 Testing simple query...');
  
  const { data: simpleTransfers, error: simpleError } = await supabase
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
    .in('status', ['COMPLETED', 'USED'])
    .order('created_at', { ascending: false });

  console.log('🎁 Simple transfers query result:', simpleTransfers);
  console.log('❌ Simple transfers query error:', simpleError);

  // Step 4: Check if the tickets exist and are accessible
  if (simpleTransfers && simpleTransfers.length > 0) {
    console.log('🔍 Checking if tickets are accessible...');
    
    for (const transfer of simpleTransfers) {
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          id,
          user_id,
          status,
          event:events (
            title,
            date,
            time,
            location,
            image_url
          ),
          ticket_type:ticket_types (
            name,
            price
          )
        `)
        .eq('id', transfer.ticket_id)
        .single();

      console.log(`🎫 Ticket ${transfer.ticket_id}:`, ticket);
      console.log(`❌ Ticket ${transfer.ticket_id} error:`, ticketError);
    }
  }

  // Step 5: Test the actual service
  console.log('🔍 Testing actual transferredTicketsService...');
  
  try {
    // Import the service (this might not work in console, but let's try)
    const { transferredTicketsService } = await import('/src/services/transferredTicketsService.ts');
    const result = await transferredTicketsService.getTransferredTickets();
    console.log('🎁 Service result:', result);
  } catch (serviceError) {
    console.log('❌ Service error:', serviceError);
    console.log('💡 This is expected in console - the service needs to be tested in the actual app');
  }
}

console.log('✅ Test completed!');
