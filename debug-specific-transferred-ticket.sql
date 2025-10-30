-- =====================================================
-- DEBUG SPECIFIC TRANSFERRED TICKET
-- =====================================================

-- Check the specific ticket that was transferred
SELECT 
    'SPECIFIC TRANSFERRED TICKET' as info,
    t.id as ticket_id,
    t.user_id as current_owner_id,
    p_owner.name as current_owner_name,
    p_owner.email as current_owner_email,
    t.status as ticket_status,
    e.title as event_title
FROM tickets t
LEFT JOIN profiles p_owner ON p_owner.user_id = t.user_id
LEFT JOIN events e ON e.id = t.event_id
WHERE t.id = '7e83ed03-4f50-4ebe-918c-f835402bcd7b';

-- Check the transfer record for this ticket
SELECT 
    'TRANSFER RECORD FOR TICKET' as info,
    tt.id as transfer_id,
    tt.ticket_id,
    tt.sender_id,
    tt.recipient_id,
    tt.recipient_email,
    tt.status as transfer_status,
    tt.created_at as transfer_created,
    p_sender.name as sender_name,
    p_sender.email as sender_email,
    p_recipient.name as recipient_name,
    p_recipient.email as recipient_email
FROM ticket_transfers tt
LEFT JOIN profiles p_sender ON p_sender.user_id = tt.sender_id
LEFT JOIN profiles p_recipient ON p_recipient.user_id = tt.recipient_id
WHERE tt.ticket_id = '7e83ed03-4f50-4ebe-918c-f835402bcd7b';

-- Test the exact query used by transferredTicketsService
SELECT 
    'TRANSFERRED TICKETS SERVICE QUERY' as info,
    tt.id as transfer_id,
    tt.ticket_id,
    tt.sender_id,
    tt.recipient_id,
    tt.recipient_email,
    tt.status as transfer_status,
    tt.created_at as transfer_created
FROM ticket_transfers tt
WHERE tt.recipient_id = 'f9857fa4-1502-4abf-ab43-42c25f820753'
  AND tt.status IN ('COMPLETED', 'USED')
ORDER BY tt.created_at DESC;

-- Check if the ticket has the required relationships
SELECT 
    'TICKET RELATIONSHIPS' as info,
    t.id as ticket_id,
    t.event_id,
    t.ticket_type_id,
    e.title as event_title,
    tt_type.name as ticket_type_name,
    tt_type.price as ticket_type_price
FROM tickets t
LEFT JOIN events e ON e.id = t.event_id
LEFT JOIN ticket_types tt_type ON tt_type.id = t.ticket_type_id
WHERE t.id = '7e83ed03-4f50-4ebe-918c-f835402bcd7b';
