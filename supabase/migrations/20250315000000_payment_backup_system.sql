-- =====================================================
-- PAYMENT BACKUP SYSTEM
-- =====================================================
-- This migration creates the backup management system for payments

-- 1. Create payment_backups table to track all backups
CREATE TABLE IF NOT EXISTS payment_backups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('payments', 'orders', 'tickets', 'full')),
  date_from TIMESTAMP WITH TIME ZONE NOT NULL,
  date_to TIMESTAMP WITH TIME ZONE NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  format TEXT NOT NULL DEFAULT 'json' CHECK (format IN ('json', 'csv')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  storage_path TEXT, -- Path in Supabase Storage if stored there
  download_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for backup management
CREATE INDEX IF NOT EXISTS idx_payment_backups_type ON payment_backups(backup_type);
CREATE INDEX IF NOT EXISTS idx_payment_backups_status ON payment_backups(status);
CREATE INDEX IF NOT EXISTS idx_payment_backups_created_at ON payment_backups(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_backups_expires_at ON payment_backups(expires_at);
CREATE INDEX IF NOT EXISTS idx_payment_backups_created_by ON payment_backups(created_by);

-- 2. Create payment_recovery_points table for point-in-time recovery
CREATE TABLE IF NOT EXISTS payment_recovery_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  recovery_point TIMESTAMP WITH TIME ZONE NOT NULL,
  backup_ids UUID[] NOT NULL, -- Array of backup IDs that make up this recovery point
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'corrupted')),
  metadata JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for recovery points
CREATE INDEX IF NOT EXISTS idx_payment_recovery_points_recovery_point ON payment_recovery_points(recovery_point);
CREATE INDEX IF NOT EXISTS idx_payment_recovery_points_status ON payment_recovery_points(status);
CREATE INDEX IF NOT EXISTS idx_payment_recovery_points_created_at ON payment_recovery_points(created_at);

-- 3. Create backup_schedules table for automated backups
CREATE TABLE IF NOT EXISTS backup_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('payments', 'orders', 'tickets', 'full')),
  schedule_cron TEXT NOT NULL, -- Cron expression for scheduling
  retention_days INTEGER NOT NULL DEFAULT 30,
  format TEXT NOT NULL DEFAULT 'json' CHECK (format IN ('json', 'csv')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  last_backup_id UUID REFERENCES payment_backups(id) ON DELETE SET NULL,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for backup schedules
CREATE INDEX IF NOT EXISTS idx_backup_schedules_enabled ON backup_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_backup_schedules_next_run_at ON backup_schedules(next_run_at);
CREATE INDEX IF NOT EXISTS idx_backup_schedules_last_run_at ON backup_schedules(last_run_at);

-- 4. Create function to automatically expire old backups
CREATE OR REPLACE FUNCTION cleanup_expired_backups()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  expired_count INTEGER := 0;
BEGIN
  -- Mark expired backups
  UPDATE payment_backups 
  SET status = 'expired', updated_at = NOW()
  WHERE expires_at < NOW() 
    AND status = 'completed';
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  -- Log cleanup activity
  INSERT INTO payment_audit_log (
    payment_id,
    action,
    metadata
  ) VALUES (
    NULL,
    'backup_cleanup',
    jsonb_build_object(
      'expired_backups', expired_count,
      'cleanup_time', NOW()
    )
  );
  
  RETURN expired_count;
END;
$$;

-- 5. Create function to create recovery points
CREATE OR REPLACE FUNCTION create_recovery_point(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_recovery_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  recovery_id UUID;
  backup_ids UUID[];
BEGIN
  -- Get recent backups that cover the recovery time
  SELECT ARRAY_AGG(id) INTO backup_ids
  FROM payment_backups
  WHERE status = 'completed'
    AND date_from <= p_recovery_time
    AND date_to >= p_recovery_time
    AND backup_type = 'full'
  ORDER BY created_at DESC
  LIMIT 5;
  
  -- If no full backups, get individual backups
  IF backup_ids IS NULL OR array_length(backup_ids, 1) = 0 THEN
    SELECT ARRAY_AGG(id) INTO backup_ids
    FROM payment_backups
    WHERE status = 'completed'
      AND date_from <= p_recovery_time
      AND date_to >= p_recovery_time
    ORDER BY created_at DESC
    LIMIT 10;
  END IF;
  
  -- Create recovery point
  INSERT INTO payment_recovery_points (
    name,
    description,
    recovery_point,
    backup_ids,
    metadata
  ) VALUES (
    p_name,
    p_description,
    p_recovery_time,
    backup_ids,
    jsonb_build_object(
      'backup_count', array_length(backup_ids, 1),
      'created_automatically', false
    )
  ) RETURNING id INTO recovery_id;
  
  RETURN recovery_id;
END;
$$;

-- 6. Create function to validate backup integrity
CREATE OR REPLACE FUNCTION validate_backup_integrity(backup_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  backup_record RECORD;
  actual_count INTEGER := 0;
BEGIN
  -- Get backup record
  SELECT * INTO backup_record
  FROM payment_backups
  WHERE id = backup_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Validate record count based on backup type
  CASE backup_record.backup_type
    WHEN 'payments' THEN
      SELECT COUNT(*) INTO actual_count
      FROM payments
      WHERE created_at >= backup_record.date_from
        AND created_at <= backup_record.date_to;
        
    WHEN 'orders' THEN
      SELECT COUNT(*) INTO actual_count
      FROM orders
      WHERE created_at >= backup_record.date_from
        AND created_at <= backup_record.date_to;
        
    WHEN 'tickets' THEN
      SELECT COUNT(*) INTO actual_count
      FROM tickets
      WHERE created_at >= backup_record.date_from
        AND created_at <= backup_record.date_to;
        
    WHEN 'full' THEN
      SELECT (
        (SELECT COUNT(*) FROM payments WHERE created_at >= backup_record.date_from AND created_at <= backup_record.date_to) +
        (SELECT COUNT(*) FROM orders WHERE created_at >= backup_record.date_from AND created_at <= backup_record.date_to) +
        (SELECT COUNT(*) FROM tickets WHERE created_at >= backup_record.date_from AND created_at <= backup_record.date_to)
      ) INTO actual_count;
  END CASE;
  
  -- Compare with recorded count (allow 5% variance for concurrent operations)
  RETURN ABS(actual_count - backup_record.record_count) <= (backup_record.record_count * 0.05);
END;
$$;

-- 7. Create automated backup trigger
CREATE OR REPLACE FUNCTION trigger_daily_backup()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- This function would be called by a cron job or scheduled task
  -- Create daily full backup
  INSERT INTO payment_backups (
    backup_type,
    date_from,
    date_to,
    status,
    expires_at,
    created_at
  ) VALUES (
    'full',
    NOW() - INTERVAL '1 day',
    NOW(),
    'pending',
    NOW() + INTERVAL '30 days',
    NOW()
  );
  
  -- Clean up old backups
  PERFORM cleanup_expired_backups();
END;
$$;

-- 8. Create views for backup monitoring
CREATE OR REPLACE VIEW backup_status_summary AS
SELECT 
  backup_type,
  status,
  COUNT(*) as backup_count,
  SUM(record_count) as total_records,
  SUM(file_size_bytes) as total_size_bytes,
  AVG(file_size_bytes) as avg_size_bytes,
  MIN(created_at) as oldest_backup,
  MAX(created_at) as newest_backup
FROM payment_backups
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY backup_type, status
ORDER BY backup_type, status;

CREATE OR REPLACE VIEW backup_health_check AS
SELECT 
  DATE(created_at) as backup_date,
  COUNT(*) as total_backups,
  COUNT(*) FILTER (WHERE status = 'completed') as successful_backups,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_backups,
  SUM(record_count) as total_records_backed_up,
  SUM(file_size_bytes) as total_size_bytes,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / COUNT(*)) * 100, 
    2
  ) as success_rate_percent
FROM payment_backups
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY backup_date DESC;

-- 9. Enable RLS on backup tables
ALTER TABLE payment_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_recovery_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin access
CREATE POLICY "Only admins can manage backups" ON payment_backups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'ADMIN'
    )
  );

CREATE POLICY "Only admins can manage recovery points" ON payment_recovery_points
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'ADMIN'
    )
  );

CREATE POLICY "Only admins can manage backup schedules" ON backup_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Service role can manage all backup tables
CREATE POLICY "Service role can manage backups" ON payment_backups
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage recovery points" ON payment_recovery_points
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage backup schedules" ON backup_schedules
  FOR ALL USING (auth.role() = 'service_role');

-- 10. Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON backup_status_summary TO authenticated;
GRANT SELECT ON backup_health_check TO authenticated;

-- Grant admin access to backup tables
GRANT ALL ON payment_backups TO authenticated;
GRANT ALL ON payment_recovery_points TO authenticated;
GRANT ALL ON backup_schedules TO authenticated;

-- Grant service role full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 11. Insert default backup schedules
INSERT INTO backup_schedules (
  name,
  backup_type,
  schedule_cron,
  retention_days,
  format,
  enabled
) VALUES 
  ('Daily Full Backup', 'full', '0 2 * * *', 30, 'json', true),
  ('Hourly Payment Backup', 'payments', '0 * * * *', 7, 'json', true),
  ('Weekly Archive Backup', 'full', '0 3 * * 0', 90, 'json', true)
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'Payment backup system created successfully!' as status;


