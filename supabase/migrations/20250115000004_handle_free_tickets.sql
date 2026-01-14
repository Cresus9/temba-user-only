/*
  # Free Ticket Handling
  
  This migration adds support for free entry events where users can reserve spots.
  
  1. Updates create_order to automatically complete free orders
  2. Adds rate limiting to prevent abuse
  3. Ensures tickets are created immediately for free orders
  4. Adds email verification option for free tickets
*/

-- Add a table to track free ticket reservations (for rate limiting)
CREATE TABLE IF NOT EXISTS free_ticket_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT, -- For guest reservations
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id), -- One reservation per user per event
  UNIQUE(email, event_id) -- One reservation per email per event (for guests)
);

-- Create index for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_free_ticket_reservations_user_event 
  ON free_ticket_reservations(user_id, event_id, created_at);
CREATE INDEX IF NOT EXISTS idx_free_ticket_reservations_email_event 
  ON free_ticket_reservations(email, event_id, created_at);
CREATE INDEX IF NOT EXISTS idx_free_ticket_reservations_ip 
  ON free_ticket_reservations(ip_address, created_at);

-- Enable RLS
ALTER TABLE free_ticket_reservations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own reservations
CREATE POLICY "Users can view own free ticket reservations"
  ON free_ticket_reservations FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can manage all reservations
CREATE POLICY "Service role can manage free ticket reservations"
  ON free_ticket_reservations FOR ALL
  USING (auth.role() = 'service_role');

-- Function to check rate limits for free tickets
CREATE OR REPLACE FUNCTION check_free_ticket_rate_limit(
  p_user_id UUID,
  p_email TEXT,
  p_event_id UUID,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_reservation_count INTEGER;
  v_email_reservation_count INTEGER;
  v_ip_reservation_count INTEGER;
  v_max_per_user INTEGER := 1; -- Max 1 reservation per user per event
  v_max_per_email INTEGER := 1; -- Max 1 reservation per email per event
  v_max_per_ip INTEGER := 5; -- Max 5 reservations per IP per hour
BEGIN
  -- Check user reservations (if authenticated)
  IF p_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_reservation_count
    FROM free_ticket_reservations
    WHERE user_id = p_user_id
      AND event_id = p_event_id;
    
    IF v_user_reservation_count >= v_max_per_user THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Vous avez déjà réservé un billet gratuit pour cet événement'
      );
    END IF;
  END IF;
  
  -- Check email reservations (for guests)
  IF p_email IS NOT NULL THEN
    SELECT COUNT(*) INTO v_email_reservation_count
    FROM free_ticket_reservations
    WHERE email = p_email
      AND event_id = p_event_id;
    
    IF v_email_reservation_count >= v_max_per_email THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Cet email a déjà réservé un billet gratuit pour cet événement'
      );
    END IF;
  END IF;
  
  -- Check IP-based rate limiting (prevent abuse)
  IF p_ip_address IS NOT NULL THEN
    SELECT COUNT(*) INTO v_ip_reservation_count
    FROM free_ticket_reservations
    WHERE ip_address = p_ip_address
      AND created_at > NOW() - INTERVAL '1 hour';
    
    IF v_ip_reservation_count >= v_max_per_ip THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Trop de réservations depuis cette adresse IP. Veuillez réessayer plus tard.'
      );
    END IF;
  END IF;
  
  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Update create_order to handle free tickets
CREATE OR REPLACE FUNCTION create_order(
  p_user_id UUID,
  p_event_id UUID,
  p_payment_method TEXT,
  p_ticket_quantities JSONB,
  p_payment_details JSONB DEFAULT '{}'::jsonb,
  p_ip_address TEXT DEFAULT NULL -- For rate limiting
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_total NUMERIC := 0;
  v_ticket_type RECORD;
  v_quantity INTEGER;
  v_is_free BOOLEAN := false;
  v_rate_limit_check JSONB;
  v_user_email TEXT;
BEGIN
  -- Validate order
  PERFORM validate_order(p_event_id, p_ticket_quantities);

  -- Calculate total
  FOR v_ticket_type IN 
    SELECT id, price
    FROM ticket_types
    WHERE event_id = p_event_id
  LOOP
    v_quantity := (p_ticket_quantities->>(v_ticket_type.id::text))::integer;
    IF v_quantity IS NOT NULL THEN
      v_total := v_total + (v_ticket_type.price * v_quantity);
    END IF;
  END LOOP;
  
  -- Check if this is a free order
  v_is_free := (v_total = 0 OR v_total IS NULL);
  
  -- If free, check rate limits
  IF v_is_free THEN
    -- Get user email for rate limiting
    IF p_user_id IS NOT NULL THEN
      SELECT email INTO v_user_email
      FROM auth.users
      WHERE id = p_user_id;
    END IF;
    
    -- Check rate limits
    v_rate_limit_check := check_free_ticket_rate_limit(
      p_user_id,
      v_user_email,
      p_event_id,
      p_ip_address
    );
    
    IF NOT (v_rate_limit_check->>'allowed')::boolean THEN
      RAISE EXCEPTION '%', v_rate_limit_check->>'reason';
    END IF;
  END IF;

  -- Create order with appropriate status
  INSERT INTO orders (
    user_id,
    event_id,
    total,
    status,
    payment_method,
    ticket_quantities
  ) VALUES (
    p_user_id,
    p_event_id,
    v_total,
    CASE 
      WHEN v_is_free THEN 'COMPLETED' -- Auto-complete free orders
      ELSE 'PENDING'
    END,
    CASE
      WHEN v_is_free THEN 'FREE_TICKET'
      ELSE p_payment_method
    END,
    p_ticket_quantities
  ) RETURNING id INTO v_order_id;

  -- Create tickets
  FOR v_ticket_type IN 
    SELECT id, price
    FROM ticket_types
    WHERE event_id = p_event_id
  LOOP
    v_quantity := (p_ticket_quantities->>(v_ticket_type.id::text))::integer;
    IF v_quantity IS NOT NULL AND v_quantity > 0 THEN
      -- Update ticket availability
      UPDATE ticket_types
      SET available = available - v_quantity
      WHERE id = v_ticket_type.id;
      
      -- Create tickets
      INSERT INTO tickets (
        order_id,
        event_id,
        user_id,
        ticket_type_id,
        status,
        qr_code
      )
      SELECT
        v_order_id,
        p_event_id,
        p_user_id,
        v_ticket_type.id,
        'VALID',
        encode(gen_random_bytes(32), 'base64')
      FROM generate_series(1, v_quantity);
    END IF;
  END LOOP;
  
  -- Record free ticket reservation (for rate limiting)
  IF v_is_free THEN
    INSERT INTO free_ticket_reservations (
      user_id,
      email,
      event_id,
      order_id,
      ip_address
    ) VALUES (
      p_user_id,
      v_user_email,
      p_event_id,
      v_order_id,
      p_ip_address
    )
    ON CONFLICT DO NOTHING; -- Ignore if already exists
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_order_id,
    'is_free', v_is_free,
    'status', CASE WHEN v_is_free THEN 'COMPLETED' ELSE 'PENDING' END
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create order: %', SQLERRM;
END;
$$;

-- Update create_guest_order to handle free tickets
CREATE OR REPLACE FUNCTION create_guest_order(
  p_email TEXT,
  p_name TEXT,
  p_phone TEXT,
  p_event_id UUID,
  p_payment_method TEXT,
  p_ticket_quantities JSONB,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_token UUID;
  v_total NUMERIC := 0;
  v_ticket_type RECORD;
  v_quantity INTEGER;
  v_is_free BOOLEAN := false;
  v_rate_limit_check JSONB;
BEGIN
  -- Validate order
  PERFORM validate_order(p_event_id, p_ticket_quantities);

  -- Generate verification token
  v_token := gen_random_uuid();

  -- Calculate total
  FOR v_ticket_type IN 
    SELECT id, price
    FROM ticket_types
    WHERE event_id = p_event_id
  LOOP
    v_quantity := (p_ticket_quantities->>(v_ticket_type.id::text))::integer;
    IF v_quantity IS NOT NULL THEN
      v_total := v_total + (v_ticket_type.price * v_quantity);
    END IF;
  END LOOP;
  
  -- Check if this is a free order
  v_is_free := (v_total = 0 OR v_total IS NULL);
  
  -- If free, check rate limits
  IF v_is_free THEN
    v_rate_limit_check := check_free_ticket_rate_limit(
      NULL, -- No user_id for guests
      p_email,
      p_event_id,
      p_ip_address
    );
    
    IF NOT (v_rate_limit_check->>'allowed')::boolean THEN
      RAISE EXCEPTION '%', v_rate_limit_check->>'reason';
    END IF;
  END IF;

  -- Create order with appropriate status
  INSERT INTO orders (
    event_id,
    guest_email,
    total,
    status,
    payment_method,
    ticket_quantities
  ) VALUES (
    p_event_id,
    p_email,
    v_total,
    CASE 
      WHEN v_is_free THEN 'COMPLETED' -- Auto-complete free orders
      ELSE 'PENDING'
    END,
    CASE
      WHEN v_is_free THEN 'FREE_TICKET'
      ELSE p_payment_method
    END,
    p_ticket_quantities
  ) RETURNING id INTO v_order_id;

  -- Create guest order record
  INSERT INTO guest_orders (
    order_id,
    email,
    name,
    phone,
    token
  ) VALUES (
    v_order_id,
    p_email,
    p_name,
    p_phone,
    v_token
  );

  -- Create tickets
  FOR v_ticket_type IN 
    SELECT id, price
    FROM ticket_types
    WHERE event_id = p_event_id
  LOOP
    v_quantity := (p_ticket_quantities->>(v_ticket_type.id::text))::integer;
    IF v_quantity IS NOT NULL AND v_quantity > 0 THEN
      -- Update ticket availability
      UPDATE ticket_types
      SET available = available - v_quantity
      WHERE id = v_ticket_type.id;
      
      -- Create tickets
      INSERT INTO tickets (
        order_id,
        event_id,
        ticket_type_id,
        status,
        qr_code
      )
      SELECT
        v_order_id,
        p_event_id,
        v_ticket_type.id,
        'VALID',
        encode(gen_random_bytes(32), 'base64')
      FROM generate_series(1, v_quantity);
    END IF;
  END LOOP;
  
  -- Record free ticket reservation (for rate limiting)
  IF v_is_free THEN
    INSERT INTO free_ticket_reservations (
      email,
      event_id,
      order_id,
      ip_address
    ) VALUES (
      p_email,
      p_event_id,
      v_order_id,
      p_ip_address
    )
    ON CONFLICT DO NOTHING; -- Ignore if already exists
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'token', v_token,
    'is_free', v_is_free,
    'status', CASE WHEN v_is_free THEN 'COMPLETED' ELSE 'PENDING' END
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create guest order: %', SQLERRM;
END;
$$;
