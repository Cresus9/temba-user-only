-- Rollback for 20261120090000_order_ticket_holds_oversell_guard.sql
-- Run AFTER rolling the edge functions back (the new edge code also tolerates the
-- RPC being absent, so the order does not strictly matter).

SELECT cron.unschedule('release-expired-order-ticket-holds')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'release-expired-order-ticket-holds');

BEGIN;

DROP TRIGGER IF EXISTS zz_order_ticket_holds_on_order_status ON public.orders;
DROP FUNCTION IF EXISTS public.order_ticket_holds_on_order_status();
DROP FUNCTION IF EXISTS public.release_expired_order_ticket_holds();
DROP FUNCTION IF EXISTS public.reserve_order_tickets(uuid, integer);
DROP FUNCTION IF EXISTS public.release_order_ticket_holds(uuid);

-- Live definition as of 2026-11-20 (read from Temba-EU before the change).
CREATE OR REPLACE FUNCTION public.update_ticket_type_available()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- For INSERT operations
  IF TG_OP = 'INSERT' THEN
    UPDATE ticket_types 
    SET available = quantity - (
      SELECT COUNT(*) 
      FROM tickets 
      WHERE ticket_type_id = NEW.ticket_type_id 
      AND status IN ('VALID', 'USED')
    )
    WHERE id = NEW.ticket_type_id;
    RETURN NEW;
  END IF;

  -- For DELETE operations
  IF TG_OP = 'DELETE' THEN
    UPDATE ticket_types 
    SET available = quantity - (
      SELECT COUNT(*) 
      FROM tickets 
      WHERE ticket_type_id = OLD.ticket_type_id 
      AND status IN ('VALID', 'USED')
    )
    WHERE id = OLD.ticket_type_id;
    RETURN OLD;
  END IF;

  -- For UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    -- Update both old and new ticket type if ticket_type_id changed
    IF OLD.ticket_type_id != NEW.ticket_type_id THEN
      UPDATE ticket_types 
      SET available = quantity - (
        SELECT COUNT(*) 
        FROM tickets 
        WHERE ticket_type_id = OLD.ticket_type_id 
        AND status IN ('VALID', 'USED')
      )
      WHERE id = OLD.ticket_type_id;
    END IF;

    UPDATE ticket_types 
    SET available = quantity - (
      SELECT COUNT(*) 
      FROM tickets 
      WHERE ticket_type_id = NEW.ticket_type_id 
      AND status IN ('VALID', 'USED')
    )
    WHERE id = NEW.ticket_type_id;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$function$;

-- Give back stock that was still held, using the old formula, only for the
-- ticket types that had a live hold.
UPDATE public.ticket_types tt
SET available = tt.quantity - (
  SELECT COUNT(*) FROM public.tickets k
  WHERE k.ticket_type_id = tt.id AND k.status IN ('VALID', 'USED'))
WHERE tt.id IN (SELECT DISTINCT ticket_type_id FROM public.order_ticket_holds WHERE status = 'active');

DROP FUNCTION IF EXISTS public.recompute_ticket_type_available(uuid);
DROP TABLE IF EXISTS public.order_ticket_holds;

COMMIT;
