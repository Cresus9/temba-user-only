-- =====================================================
-- FIX TICKETS RLS POLICY FOR PENDING TRANSFERS
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

-- Check if the ticket exists and who owns it
SELECT 
    'TICKET OWNER' as info,
    id,
    user_id,
    event_id,
    status
FROM tickets 
WHERE id = '621ee431-4bcb-4038-b609-51d09dbe7848';

-- Check if gtr@gmail.com user ID
SELECT 
    'GTR USER ID' as info,
    id,
    email
FROM auth.users 
WHERE email = 'gtr@gmail.com';

-- The issue is that gtr@gmail.com can't access the ticket because they don't own it
-- We need to allow users to see tickets that are part of pending transfers to them

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

-- Test the policy
SELECT 
    'TEST AFTER POLICY FIX' as info,
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
