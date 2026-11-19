-- Rollback for 04 (fast kill-switch alternative: UPDATE notification_settings SET value='false' WHERE key='order_confirmed_enabled').
BEGIN;
DROP TRIGGER IF EXISTS zz_notif_order_completed ON public.orders;
DROP FUNCTION IF EXISTS public.notif_on_order_completed();
DROP FUNCTION IF EXISTS public.notif_fr_time(text);
DROP FUNCTION IF EXISTS public.notif_fr_date(date);
COMMIT;
