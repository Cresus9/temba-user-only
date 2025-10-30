-- =====================================================
-- CLAIM PENDING TRANSFERS FUNCTION
-- =====================================================

-- Function to claim pending transfers for a user after signup
CREATE OR REPLACE FUNCTION public.claim_pending_transfers_for_user(
  user_email text,
  user_phone text default null
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_transfer_record record;
  v_claimed_count integer := 0;
BEGIN
  -- Get the user ID from the email
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = user_email;
  
  IF v_user_id IS NULL THEN
    RAISE WARNING 'User not found for email: %', user_email;
    RETURN;
  END IF;

  -- Update pending transfers to completed and assign to user
  FOR v_transfer_record IN
    SELECT tt.id, tt.ticket_id, tt.sender_id
    FROM ticket_transfers tt
    WHERE tt.status = 'PENDING'
      AND (
        (user_email IS NOT NULL AND tt.recipient_email = user_email) OR
        (user_phone IS NOT NULL AND tt.recipient_phone = user_phone)
      )
  LOOP
    -- Update the transfer record
    UPDATE ticket_transfers
    SET 
      status = 'COMPLETED',
      recipient_id = v_user_id,
      updated_at = NOW()
    WHERE id = v_transfer_record.id;

    -- Transfer ticket ownership
    UPDATE tickets
    SET 
      user_id = v_user_id,
      updated_at = NOW()
    WHERE id = v_transfer_record.ticket_id
      AND user_id = v_transfer_record.sender_id; -- Ensure ticket still belongs to sender

    -- Create notification for sender
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      metadata
    ) VALUES (
      v_transfer_record.sender_id,
      'Billet récupéré',
      'Votre billet a été récupéré par ' || user_email,
      'ticket_claimed',
      jsonb_build_object(
        'transfer_id', v_transfer_record.id,
        'ticket_id', v_transfer_record.ticket_id,
        'recipient_email', user_email
      )
    );

    v_claimed_count := v_claimed_count + 1;
  END LOOP;

  -- Log the result
  IF v_claimed_count > 0 THEN
    RAISE NOTICE 'Claimed % pending transfers for user %', v_claimed_count, user_email;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.claim_pending_transfers_for_user(text, text) 
TO service_role, authenticated;

-- Add comment
COMMENT ON FUNCTION public.claim_pending_transfers_for_user(text, text) IS 
'Claims all pending ticket transfers for a user after signup based on email/phone match';
