-- Rollback for 07a (roll back 07b first).
DROP FUNCTION IF EXISTS public.notif_ticket_scanned(uuid);
DROP FUNCTION IF EXISTS public.notif_message_attendees(uuid, uuid[], text);
