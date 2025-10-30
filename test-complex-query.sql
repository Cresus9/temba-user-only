-- =====================================================
-- TEST COMPLEX QUERY FROM TRANSFERRED TICKETS SERVICE
-- =====================================================

-- Test the exact query used by transferredTicketsService
-- This is the complex query with all the joins
SELECT 
    'COMPLEX QUERY TEST' as info,
    tt.id as transfer_id,
    tt.ticket_id,
    tt.sender_id,
    tt.recipient_id,
    tt.recipient_email,
    tt.status as transfer_status,
    tt.created_at as transfer_created,
    t.id as ticket_id_from_join,
    t.qr_code,
    t.status as ticket_status,
    t.scanned_at,
    t.scan_location,
    t.scanned_by,
    e.title as event_title,
    e.date as event_date,
    e.time as event_time,
    e.location as event_location,
    e.image_url as event_image_url,
    tt_type.name as ticket_type_name,
    tt_type.price as ticket_type_price
FROM ticket_transfers tt
LEFT JOIN tickets t ON t.id = tt.ticket_id
LEFT JOIN events e ON e.id = t.event_id
LEFT JOIN ticket_types tt_type ON tt_type.id = t.ticket_type_id
WHERE tt.recipient_id = 'f9857fa4-1502-4abf-ab43-42c25f820753'
  AND tt.status IN ('COMPLETED', 'USED')
ORDER BY tt.created_at DESC;

-- Test without the complex joins to see if that's the issue
SELECT 
    'SIMPLE QUERY TEST' as info,
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
ORDER BY tt.created_at DESC
LIMIT 5;
