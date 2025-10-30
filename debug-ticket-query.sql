-- =====================================================
-- DEBUG TICKET QUERY ISSUE
-- =====================================================

-- Check if the ticket exists
SELECT 
    'TICKET EXISTS' as info,
    id,
    event_id,
    ticket_type_id,
    status,
    user_id
FROM tickets 
WHERE id = '621ee431-4bcb-4038-b609-51d09dbe7848';

-- Check if the event exists
SELECT 
    'EVENT EXISTS' as info,
    id,
    title,
    start_date,
    location
FROM events 
WHERE id = (
    SELECT event_id 
    FROM tickets 
    WHERE id = '621ee431-4bcb-4038-b609-51d09dbe7848'
);

-- Test the exact query that's failing
SELECT 
    'EXACT QUERY TEST' as info,
    t.id,
    t.event_id,
    t.ticket_type_id,
    t.status,
    e.title,
    e.start_date,
    e.location
FROM tickets t
LEFT JOIN events e ON t.event_id = e.id
WHERE t.id = '621ee431-4bcb-4038-b609-51d09dbe7848';

-- Check RLS policies on tickets table
SELECT 
    'TICKETS RLS POLICIES' as info,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'tickets';

-- Check if RLS is enabled on tickets
SELECT 
    'TICKETS RLS STATUS' as info,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'tickets';
