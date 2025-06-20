-- Create fraud_checks table
CREATE TABLE IF NOT EXISTS fraud_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  ip text NOT NULL,
  device_id text NOT NULL,
  amount numeric NOT NULL,
  risk_score integer NOT NULL,
  reasons text,
  created_at timestamptz DEFAULT now()
);

-- Create high_risk_orders table
CREATE TABLE IF NOT EXISTS high_risk_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  event_id uuid REFERENCES events ON DELETE CASCADE,
  amount numeric NOT NULL,
  risk_level text NOT NULL,
  reasons text,
  ip text NOT NULL,
  device_id text NOT NULL,
  reviewed boolean DEFAULT false,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE fraud_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE high_risk_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for fraud_checks
CREATE POLICY "Admins can view fraud checks"
  ON fraud_checks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

CREATE POLICY "System can insert fraud checks"
  ON fraud_checks FOR INSERT
  WITH CHECK (true);

-- Create policies for high_risk_orders
CREATE POLICY "Admins can manage high risk orders"
  ON high_risk_orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_fraud_checks_user_id ON fraud_checks(user_id);
CREATE INDEX idx_fraud_checks_created_at ON fraud_checks(created_at);
CREATE INDEX idx_high_risk_orders_user_id ON high_risk_orders(user_id);
CREATE INDEX idx_high_risk_orders_reviewed ON high_risk_orders(reviewed);
CREATE INDEX idx_high_risk_orders_created_at ON high_risk_orders(created_at);

-- Create view for fraud analytics
CREATE OR REPLACE VIEW fraud_analytics AS
SELECT
  DATE_TRUNC('day', fc.created_at) as date,
  COUNT(*) as total_checks,
  AVG(fc.risk_score) as avg_risk_score,
  COUNT(CASE WHEN fc.risk_score >= 70 THEN 1 END) as high_risk_count,
  COUNT(CASE WHEN fc.risk_score >= 40 AND fc.risk_score < 70 THEN 1 END) as medium_risk_count,
  COUNT(CASE WHEN fc.risk_score < 40 THEN 1 END) as low_risk_count,
  STRING_AGG(DISTINCT fc.reasons, ', ') as common_reasons
FROM fraud_checks fc
GROUP BY DATE_TRUNC('day', fc.created_at)
ORDER BY date DESC;

-- Create function to get fraud stats
CREATE OR REPLACE FUNCTION get_fraud_stats(
  p_start_date timestamptz DEFAULT NOW() - INTERVAL '30 days',
  p_end_date timestamptz DEFAULT NOW()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_checks', COUNT(*),
    'high_risk_count', COUNT(CASE WHEN risk_score >= 70 THEN 1 END),
    'medium_risk_count', COUNT(CASE WHEN risk_score >= 40 AND risk_score < 70 THEN 1 END),
    'low_risk_count', COUNT(CASE WHEN risk_score < 40 THEN 1 END),
    'avg_risk_score', AVG(risk_score),
    'top_reasons', (
      SELECT jsonb_agg(reason_count)
      FROM (
        SELECT 
          UNNEST(STRING_TO_ARRAY(reasons, ', ')) as reason,
          COUNT(*) as count
        FROM fraud_checks
        WHERE created_at BETWEEN p_start_date AND p_end_date
        GROUP BY reason
        ORDER BY count DESC
        LIMIT 5
      ) reason_count
    )
  )
  INTO v_result
  FROM fraud_checks
  WHERE created_at BETWEEN p_start_date AND p_end_date;

  RETURN v_result;
END;
$$;

-- Grant necessary permissions
GRANT SELECT ON fraud_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_fraud_stats TO authenticated;