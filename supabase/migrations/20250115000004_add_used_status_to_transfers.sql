-- Add 'USED' status to ticket_transfers table
ALTER TABLE public.ticket_transfers 
DROP CONSTRAINT IF EXISTS ticket_transfers_status_check;

ALTER TABLE public.ticket_transfers 
ADD CONSTRAINT ticket_transfers_status_check CHECK (
  status = ANY (
    ARRAY[
      'PENDING'::text,
      'COMPLETED'::text,
      'REJECTED'::text,
      'CANCELLED'::text,
      'USED'::text
    ]
  )
);
