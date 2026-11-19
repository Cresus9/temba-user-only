-- Pending Thierry's OK. Do not apply until confirmed.
-- These AFTER INSERT triggers on public.orders call the paused project
-- uwmlagvsivxqocklxbbo (order-email / ticket-email) before any payment exists.
-- Ticket mail now goes out from finalize-order, after tickets exist.

DROP TRIGGER IF EXISTS "Ticket" ON public.orders;
DROP TRIGGER IF EXISTS "Ticket-confirmation" ON public.orders;
DROP TRIGGER IF EXISTS send_order_email_trigger ON public.orders;
