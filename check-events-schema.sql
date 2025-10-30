-- =====================================================
-- CHECK EVENTS TABLE SCHEMA
-- =====================================================

-- Check the structure of the events table
SELECT 
    'EVENTS TABLE COLUMNS' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'events' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there are any events
SELECT 
    'SAMPLE EVENTS' as info,
    *
FROM events 
LIMIT 3;

-- Check the specific event for our ticket
SELECT 
    'EVENT FOR TICKET' as info,
    *
FROM events 
WHERE id = (
    SELECT event_id 
    FROM tickets 
    WHERE id = '621ee431-4bcb-4038-b609-51d09dbe7848'
);
