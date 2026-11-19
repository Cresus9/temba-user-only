-- Rollback for 03: restore the original queue_notification_delivery and drop the new worker RPCs.
BEGIN;
CREATE OR REPLACE FUNCTION public.queue_notification_delivery(p_notification_id uuid, p_delivery_methods text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  method text;
BEGIN
  FOREACH method IN ARRAY p_delivery_methods LOOP
    INSERT INTO notification_queue (
      notification_id,
      delivery_method,
      status,
      scheduled_for
    ) VALUES (
      p_notification_id,
      method,
      'pending',
      now()
    );
  END LOOP;
END;
$function$;
DROP FUNCTION IF EXISTS public.notif_complete(uuid,text,text,text,jsonb,timestamptz);
DROP FUNCTION IF EXISTS public.notif_claim_batch(int);
DROP FUNCTION IF EXISTS public.notif_enqueue(uuid,text,text,text,text,text,jsonb,text[],text,text,timestamptz,timestamptz);
DROP FUNCTION IF EXISTS public.notif_setting(text);
COMMIT;
