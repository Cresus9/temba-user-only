-- Rollback for 07: restore the open insert policy and the original function bodies; drop the new RPCs.
BEGIN;
ALTER POLICY notifications_insert_system ON public.notifications WITH CHECK (true);
CREATE OR REPLACE FUNCTION public.create_notification_from_template(p_template_type text, p_user_id uuid, p_variables jsonb DEFAULT '{}'::jsonb, p_priority text DEFAULT 'normal'::text, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  template_record notification_templates%ROWTYPE;
  notification_id uuid;
  processed_title text;
  processed_message text;
  var_key text;
  var_value text;
BEGIN
  -- Get template
  SELECT * INTO template_record
  FROM notification_templates
  WHERE type = p_template_type AND active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found: %', p_template_type;
  END IF;

  -- Process title template
  processed_title := template_record.title_template;
  processed_message := template_record.message_template;

  -- Replace variables
  FOR var_key, var_value IN SELECT * FROM jsonb_each_text(p_variables) LOOP
    processed_title := REPLACE(processed_title, '{' || var_key || '}', var_value);
    processed_message := REPLACE(processed_message, '{' || var_key || '}', var_value);
  END LOOP;

  -- Create notification
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    category_id,
    template_id,
    priority,
    expires_at,
    metadata
  ) VALUES (
    p_user_id,
    processed_title,
    processed_message,
    'info',
    template_record.category_id,
    template_record.id,
    p_priority,
    p_expires_at,
    p_variables
  ) RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$function$;
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_user_id uuid, p_notification_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  updated_count integer;
BEGIN
  IF p_notification_ids IS NULL THEN
    -- Mark all unread notifications as read
    UPDATE notifications
    SET read = true, read_at = now(), updated_at = now()
    WHERE user_id = p_user_id AND read = false;
  ELSE
    -- Mark specific notifications as read
    UPDATE notifications
    SET read = true, read_at = now(), updated_at = now()
    WHERE user_id = p_user_id AND id = ANY(p_notification_ids) AND read = false;
  END IF;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$function$;
COMMIT;
