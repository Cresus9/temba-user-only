-- =====================================================
-- FIX TICKETS RLS POLICY WITH CORRECT COLUMN NAMES
-- =====================================================

-- First, let's see the current policies
SELECT 
    'CURRENT TICKETS POLICIES' as info,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'tickets';

-- Check the structure of the events table
SELECT 
    'EVENTS TABLE COLUMNS' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'events' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if the ticket exists and who owns it
SELECT 
    'TICKET OWNER' as info,
    id,
    user_id,
    event_id,
    status
FROM tickets 
WHERE id = '621ee431-4bcb-4038-b609-51d09dbe7848';

-- Check the event for this ticket
SELECT 
    'EVENT FOR TICKET' as info,
    *
FROM events 
WHERE id = (
    SELECT event_id 
    FROM tickets 
    WHERE id = '621ee431-4bcb-4038-b609-51d09dbe7848'
);

-- Drop existing select policy
DROP POLICY IF EXISTS "tickets_select_policy" ON tickets;

-- Create a new select policy that allows users to see:
-- 1. Tickets they own (user_id = auth.uid())
-- 2. Tickets that are part of pending transfers to them
CREATE POLICY "tickets_select_policy" ON tickets
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR 
    id IN (
      SELECT ticket_id 
      FROM ticket_transfers 
      WHERE recipient_email = (auth.jwt() ->> 'email') 
        AND status = 'PENDING'
    )
  );

-- Test the policy with a simple query first
SELECT 
    'TEST SIMPLE TICKET QUERY' as info,
    id,
    event_id,
    ticket_type_id,
    status
FROM tickets 
WHERE id = '621ee431-4bcb-4038-b609-51d09dbe7848';
