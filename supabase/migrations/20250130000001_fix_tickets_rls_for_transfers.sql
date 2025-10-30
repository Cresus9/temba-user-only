-- =====================================================
-- FIX TICKETS RLS POLICY FOR PENDING TRANSFERS
-- =====================================================

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
