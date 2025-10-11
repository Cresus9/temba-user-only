-- Fix missing calculate_service_fees RPC function
-- This creates the missing function that the frontend is trying to call

CREATE OR REPLACE FUNCTION calculate_service_fees(
  p_event_id uuid,
  p_ticket_selections jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_buyer_fees numeric := 0;
  v_total_organizer_fees numeric := 0;
  v_fee_breakdown jsonb := '[]'::jsonb;
  v_selection jsonb;
  v_ticket_type_id text;
  v_quantity integer;
  v_price numeric;
  v_subtotal numeric;
  v_fee_amount numeric;
  v_rule record;
BEGIN
  -- Loop through each ticket selection
  FOR v_selection IN SELECT * FROM jsonb_array_elements(p_ticket_selections)
  LOOP
    v_ticket_type_id := v_selection->>'ticket_type_id';
    v_quantity := (v_selection->>'quantity')::integer;
    v_price := (v_selection->>'price')::numeric;
    v_subtotal := v_price * v_quantity;
    
    -- Find applicable service fee rule (priority: TICKET_TYPE > EVENT > GLOBAL)
    SELECT r.* INTO v_rule
    FROM service_fee_rules AS r
    WHERE r.active = true
      AND (
        (r.scope = 'TICKET_TYPE' AND r.ticket_type_id = v_ticket_type_id::uuid) OR
        (r.scope = 'EVENT' AND r.event_id = p_event_id) OR
        (r.scope = 'GLOBAL')
      )
    ORDER BY 
      CASE r.scope 
        WHEN 'TICKET_TYPE' THEN 1
        WHEN 'EVENT' THEN 2
        WHEN 'GLOBAL' THEN 3
      END,
      r.priority DESC NULLS LAST
    LIMIT 1;
    
    -- Calculate fee if rule found
    IF v_rule IS NOT NULL THEN
      -- Calculate fee based on type
      IF v_rule.fee_type = 'PERCENTAGE' THEN
        v_fee_amount := v_subtotal * COALESCE(v_rule.fee_value, 0);
      ELSIF v_rule.fee_type = 'FIXED' THEN
        v_fee_amount := COALESCE(v_rule.fee_value, 0) * v_quantity;
      ELSE
        -- Default to percentage
        v_fee_amount := v_subtotal * COALESCE(v_rule.fee_value, 0.02); -- 2% default
      END IF;
      
      -- Apply min/max limits
      IF v_rule.minimum_fee IS NOT NULL AND v_fee_amount < v_rule.minimum_fee THEN
        v_fee_amount := v_rule.minimum_fee;
      END IF;
      
      IF v_rule.maximum_fee IS NOT NULL AND v_fee_amount > v_rule.maximum_fee THEN
        v_fee_amount := v_rule.maximum_fee;
      END IF;
      
      -- Add to appropriate total
      IF COALESCE(v_rule.applies_to, 'BUYER') = 'BUYER' THEN
        v_total_buyer_fees := v_total_buyer_fees + v_fee_amount;
      ELSIF v_rule.applies_to = 'ORGANIZER' THEN
        v_total_organizer_fees := v_total_organizer_fees + v_fee_amount;
      ELSE
        -- Split between buyer and organizer
        v_total_buyer_fees := v_total_buyer_fees + (v_fee_amount / 2);
        v_total_organizer_fees := v_total_organizer_fees + (v_fee_amount / 2);
      END IF;
      
      -- Add to breakdown
      v_fee_breakdown := v_fee_breakdown || jsonb_build_object(
        'rule_id', v_rule.id,
        'rule_name', COALESCE(v_rule.name, 'Service Fee'),
        'scope', v_rule.scope,
        'fee_type', v_rule.fee_type,
        'fee_amount', v_fee_amount,
        'applies_to', COALESCE(v_rule.applies_to, 'BUYER'),
        'ticket_type_id', v_ticket_type_id,
        'base_amount', v_subtotal
      );
    ELSE
      -- No rule found, apply default 2% buyer fee
      v_fee_amount := v_subtotal * 0.02;
      v_total_buyer_fees := v_total_buyer_fees + v_fee_amount;
      
      v_fee_breakdown := v_fee_breakdown || jsonb_build_object(
        'rule_id', null,
        'rule_name', 'Default Service Fee',
        'scope', 'GLOBAL',
        'fee_type', 'PERCENTAGE',
        'fee_amount', v_fee_amount,
        'applies_to', 'BUYER',
        'ticket_type_id', v_ticket_type_id,
        'base_amount', v_subtotal
      );
    END IF;
  END LOOP;
  
  -- Return result
  RETURN jsonb_build_object(
    'total_buyer_fees', v_total_buyer_fees,
    'total_organizer_fees', v_total_organizer_fees,
    'fee_breakdown', v_fee_breakdown
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_service_fees(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_service_fees(uuid, jsonb) TO anon;
