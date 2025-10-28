-- Create ticket_transfers table with our implementation schema
CREATE TABLE IF NOT EXISTS public.ticket_transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  recipient_email text,
  recipient_phone text,
  recipient_name text,
  message text,
  status text NOT NULL DEFAULT 'COMPLETED'::text,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT ticket_transfers_pkey PRIMARY KEY (id),
  CONSTRAINT ticket_transfers_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT ticket_transfers_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT ticket_transfers_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE,
  CONSTRAINT ticket_transfers_status_check CHECK (
    status = ANY (
      ARRAY[
        'PENDING'::text,
        'COMPLETED'::text,
        'REJECTED'::text,
        'CANCELLED'::text
      ]
    )
  )
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_created_at ON public.ticket_transfers USING btree (created_at) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_recipient_id ON public.ticket_transfers USING btree (recipient_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_sender_id ON public.ticket_transfers USING btree (sender_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_status ON public.ticket_transfers USING btree (status) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_ticket_id ON public.ticket_transfers USING btree (ticket_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_recipient_email ON public.ticket_transfers USING btree (recipient_email) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_recipient_phone ON public.ticket_transfers USING btree (recipient_phone) TABLESPACE pg_default;

-- Add RLS policies
ALTER TABLE ticket_transfers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view transfers they sent or received
CREATE POLICY "ticket_transfers_select_policy" ON ticket_transfers
  FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Policy: Users can create transfers for their own tickets
CREATE POLICY "ticket_transfers_insert_policy" ON ticket_transfers
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    ticket_id IN (SELECT id FROM tickets WHERE user_id = auth.uid())
  );

-- Policy: Users can update transfers they sent or received
CREATE POLICY "ticket_transfers_update_policy" ON ticket_transfers
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid())
  WITH CHECK (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Add notification types for ticket transfers
INSERT INTO notification_types (type, name, description) VALUES 
  ('ticket_received', 'Ticket Received', 'Notification when a ticket is transferred to you'),
  ('ticket_sent', 'Ticket Sent', 'Notification when you transfer a ticket to someone'),
  ('transfer_request', 'Transfer Request', 'Notification when someone requests to transfer a ticket to you')
ON CONFLICT (type) DO NOTHING;
