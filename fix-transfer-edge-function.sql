-- =====================================================
-- FIX TRANSFER EDGE FUNCTION
-- =====================================================
-- This script shows what needs to be fixed in the transfer-ticket Edge Function

-- The issue is that the transfer-ticket Edge Function is NOT updating ticket ownership
-- Here's what needs to be added to the Edge Function:

/*
// In supabase/functions/transfer-ticket/index.ts
// After creating the transfer record, add this code:

// Update ticket ownership for completed transfers
if (transferData.status === 'COMPLETED' && recipientUserId) {
  console.log('Updating ticket ownership...');
  
  const { error: ownershipError } = await supabase
    .from('tickets')
    .update({ 
      user_id: recipientUserId,
      updated_at: new Date().toISOString()
    })
    .eq('id', ticketId);
    
  if (ownershipError) {
    console.error('Failed to update ticket ownership:', ownershipError);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to update ticket ownership' 
      }),
      { headers: cors }
    );
  }
  
  console.log('Ticket ownership updated successfully');
}
*/

-- For now, let's create a database function that can be called to fix this
-- =====================================================
CREATE OR REPLACE FUNCTION update_ticket_ownership_on_transfer()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only update ownership for completed transfers with a recipient
    IF NEW.status = 'COMPLETED' AND NEW.recipient_id IS NOT NULL THEN
        UPDATE tickets 
        SET 
            user_id = NEW.recipient_id,
            updated_at = NOW()
        WHERE id = NEW.ticket_id;
        
        RAISE NOTICE 'Updated ticket ownership for ticket % to user %', NEW.ticket_id, NEW.recipient_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger to automatically update ownership on transfer completion
-- =====================================================
DROP TRIGGER IF EXISTS update_ticket_ownership_trigger ON ticket_transfers;
CREATE TRIGGER update_ticket_ownership_trigger
    AFTER UPDATE ON ticket_transfers
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_ownership_on_transfer();

-- Test the trigger by updating a transfer status
-- =====================================================
-- This will trigger the ownership update for any transfers that are already COMPLETED
UPDATE ticket_transfers 
SET updated_at = NOW()
WHERE status = 'COMPLETED' 
  AND recipient_id IS NOT NULL;

-- Verify the trigger worked
-- =====================================================
SELECT 
    'Trigger Test Results' as step,
    t.id as ticket_id,
    t.user_id as current_owner,
    p.name as owner_name,
    tt.recipient_id as transfer_recipient,
    r.name as recipient_name,
    CASE 
        WHEN t.user_id = tt.recipient_id THEN '✅ FIXED'
        ELSE '❌ STILL BROKEN'
    END as status
FROM tickets t
LEFT JOIN profiles p ON p.user_id = t.user_id
LEFT JOIN (
    SELECT DISTINCT ON (ticket_id) 
        ticket_id, 
        recipient_id, 
        status
    FROM ticket_transfers 
    WHERE status = 'COMPLETED'
    ORDER BY ticket_id, created_at DESC
) tt ON tt.ticket_id = t.id
LEFT JOIN profiles r ON r.user_id = tt.recipient_id
WHERE tt.ticket_id IS NOT NULL
ORDER BY tt.created_at DESC
LIMIT 10;
