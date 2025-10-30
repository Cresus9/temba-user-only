-- =====================================================
-- FIX TICKET TRANSFERS RLS POLICY
-- =====================================================

-- First, let's see the current policies
SELECT 
    'CURRENT POLICIES' as info,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'ticket_transfers';

-- Drop the existing select policy
DROP POLICY IF EXISTS "ticket_transfers_select_policy" ON ticket_transfers;

-- Create a new select policy that allows users to see transfers where:
-- 1. They are the sender (sender_id = auth.uid())
-- 2. They are the recipient (recipient_id = auth.uid()) 
-- 3. They are the intended recipient by email (recipient_email = auth.jwt() ->> 'email' AND recipient_id IS NULL)
CREATE POLICY "ticket_transfers_select_policy" ON ticket_transfers
  FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid() OR 
    recipient_id = auth.uid() OR 
    (recipient_email = (auth.jwt() ->> 'email') AND recipient_id IS NULL)
  );

-- Test the policy with the exact query
SELECT 
    'TEST AFTER POLICY FIX' as info,
    id,
    ticket_id,
    sender_id,
    recipient_id,
    recipient_email,
    status,
    created_at
FROM ticket_transfers
WHERE status = 'PENDING'
  AND recipient_email = 'gtr@gmail.com';
