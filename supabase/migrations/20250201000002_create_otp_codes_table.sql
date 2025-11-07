-- =====================================================
-- CREATE OTP_CODES TABLE
-- =====================================================
-- This migration creates the otp_codes table for storing
-- OTP codes sent via SMS during phone authentication.

-- Create otp_codes table
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_codes_verified ON otp_codes(verified);

-- Enable RLS
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only service role can access otp_codes (Edge Functions use service role)
-- In practice, Edge Functions with service role key can access this table
-- No need for user-level policies since OTP verification happens server-side

-- Create function to clean up expired OTP codes (optional, for maintenance)
CREATE OR REPLACE FUNCTION cleanup_expired_otp_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_codes
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission (for periodic cleanup jobs)
GRANT EXECUTE ON FUNCTION cleanup_expired_otp_codes() TO authenticated;

-- Add comment
COMMENT ON TABLE otp_codes IS 'Stores OTP codes for phone number verification during signup/login';
COMMENT ON COLUMN otp_codes.phone IS 'Phone number in E.164 format (e.g., +22675581026)';
COMMENT ON COLUMN otp_codes.code IS '6-digit OTP code';
COMMENT ON COLUMN otp_codes.expires_at IS 'When the OTP code expires (typically 10 minutes after creation)';
COMMENT ON COLUMN otp_codes.verified IS 'Whether this OTP has been successfully verified';
COMMENT ON COLUMN otp_codes.attempts IS 'Number of verification attempts made';

