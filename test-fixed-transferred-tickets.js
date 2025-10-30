// =====================================================
// TEST FIXED TRANSFERRED TICKETS SERVICE
// =====================================================

console.log('🧪 Testing fixed transferredTicketsService...');

// Step 1: Check current user
const { data: { user }, error: userError } = await supabase.auth.getUser();
console.log('👤 Current user:', user?.email, 'ID:', user?.id);

if (!user) {
  console.log('❌ No user logged in - please log in as hermanyabre5@gmail.com');
} else {
  // Step 2: Test the fixed service
  console.log('🔍 Testing fixed transferredTicketsService...');
  
  try {
    // Import the service
    const { transferredTicketsService } = await import('/src/services/transferredTicketsService.ts');
    
    // Test getTransferredTickets
    console.log('📋 Testing getTransferredTickets...');
    const transferredTickets = await transferredTicketsService.getTransferredTickets();
    console.log('🎁 Transferred tickets result:', transferredTickets);
    console.log('📊 Number of transferred tickets:', transferredTickets.length);
    
    // Test getTransferredTicketsCount
    console.log('📊 Testing getTransferredTicketsCount...');
    const count = await transferredTicketsService.getTransferredTicketsCount();
    console.log('🔢 Transferred tickets count:', count);
    
    // Verify the data structure
    if (transferredTickets.length > 0) {
      console.log('✅ Sample transferred ticket structure:');
      console.log('📋 Transfer ID:', transferredTickets[0].id);
      console.log('🎫 Ticket ID:', transferredTickets[0].ticket_id);
      console.log('👤 Sender:', transferredTickets[0].sender);
      console.log('🎫 Ticket details:', transferredTickets[0].ticket);
      console.log('🎭 Event:', transferredTickets[0].ticket?.event);
      console.log('🎟️ Ticket type:', transferredTickets[0].ticket?.ticket_type);
    }
    
  } catch (error) {
    console.log('❌ Error testing service:', error);
    console.log('💡 This might be expected in console - test in the actual app');
  }
}

console.log('✅ Test completed!');
