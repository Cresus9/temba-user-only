// =====================================================
// TEST CLAIM TRANSFER FUNCTION
// =====================================================
// Copy and paste this into the browser console

console.log('🧪 Testing claim transfer function...');

// Step 1: Check current user
const { data: { user }, error: userError } = await supabase.auth.getUser();
console.log('👤 Current user:', user?.email, 'ID:', user?.id);

if (!user) {
  console.log('❌ No user logged in');
} else if (user.email !== 'gtr@gmail.com') {
  console.log('❌ Not logged in as gtr@gmail.com - please log in as gtr@gmail.com');
} else {
  console.log('✅ Testing as gtr@gmail.com');
  
  // Step 2: Get pending transfers
  console.log('🔍 Getting pending transfers...');
  
  const { data: transfers, error: transfersError } = await supabase
    .from('ticket_transfers')
    .select(`
      id,
      ticket_id,
      sender_id,
      recipient_email,
      status,
      created_at
    `)
    .eq('status', 'PENDING')
    .eq('recipient_email', user.email);

  console.log('📋 Pending transfers:', transfers);
  console.log('❌ Transfers error:', transfersError);
  
  if (transfers && transfers.length > 0) {
    const transfer = transfers[0];
    console.log('🎯 Testing claim for transfer:', transfer.id);
    
    // Step 3: Test the claim function
    console.log('🔍 Testing claim-pending-transfer function...');
    
    const { data: claimResult, error: claimError } = await supabase.functions.invoke('claim-pending-transfer', {
      body: { transferId: transfer.id },
      headers: {
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      }
    });
    
    console.log('🎫 Claim result:', claimResult);
    console.log('❌ Claim error:', claimError);
    
    if (claimResult?.success) {
      console.log('✅ SUCCESS! Ticket claimed successfully!');
      console.log('🎉 The ticket should now appear in "Billets Reçus"');
      
      // Check if the transfer status was updated
      const { data: updatedTransfer } = await supabase
        .from('ticket_transfers')
        .select('id, status, recipient_id')
        .eq('id', transfer.id)
        .single();
      
      console.log('📋 Updated transfer status:', updatedTransfer);
      
      // Check if the ticket ownership was transferred
      const { data: updatedTicket } = await supabase
        .from('tickets')
        .select('id, user_id')
        .eq('id', transfer.ticket_id)
        .single();
      
      console.log('🎫 Updated ticket ownership:', updatedTicket);
      
    } else {
      console.log('❌ Claim failed:', claimResult?.error || claimError);
    }
    
  } else {
    console.log('❌ No pending transfers found');
  }
}

console.log('✅ Test completed!');
