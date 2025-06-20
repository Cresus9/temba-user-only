-- Create view for ticket transfer details
CREATE OR REPLACE VIEW ticket_transfer_details AS
SELECT 
  tt.*,
  sp.name as sender_name,
  sp.email as sender_email,
  rp.name as recipient_name,
  rp.email as recipient_email,
  e.title as event_title,
  e.date as event_date,
  e.time as event_time,
  ttype.name as ticket_type_name,
  ttype.price as ticket_type_price
FROM ticket_transfers tt
JOIN tickets t ON t.id = tt.ticket_id
JOIN events e ON e.id = t.event_id
JOIN ticket_types ttype ON ttype.id = t.ticket_type_id
JOIN profiles sp ON sp.user_id = tt.sender_id
JOIN profiles rp ON rp.user_id = tt.recipient_id;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their transfers" ON ticket_transfers;
DROP POLICY IF EXISTS "Users can create transfers" ON ticket_transfers;
DROP POLICY IF EXISTS "Users can update their transfers" ON ticket_transfers;

-- Create updated policies
CREATE POLICY "ticket_transfers_select_policy"
  ON ticket_transfers FOR SELECT
  USING (
    sender_id = auth.uid() OR 
    recipient_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

CREATE POLICY "ticket_transfers_insert_policy"
  ON ticket_transfers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets
      WHERE tickets.id = ticket_id
      AND tickets.user_id = auth.uid()
      AND tickets.status = 'VALID'
      AND tickets.transfer_id IS NULL
    )
  );

CREATE POLICY "ticket_transfers_update_policy"
  ON ticket_transfers FOR UPDATE
  USING (
    sender_id = auth.uid() OR 
    recipient_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Grant access to the view
GRANT SELECT ON ticket_transfer_details TO authenticated;