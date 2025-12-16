-- OTP Troubleshooting SQL Queries
-- Run these in Supabase SQL Editor to diagnose OTP issues

-- 1. Check recent OTP sends (last 24 hours)
SELECT 
  phone,
  code,
  created_at,
  expires_at,
  verified,
  attempts,
  CASE 
    WHEN expires_at < NOW() THEN 'EXPIRED'
    WHEN verified = true THEN 'VERIFIED'
    ELSE 'ACTIVE'
  END as status,
  EXTRACT(EPOCH FROM (expires_at - created_at))/60 as validity_minutes
FROM otp_codes
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 50;

-- 2. Check OTP success rate by phone number
SELECT 
  phone,
  COUNT(*) as total_sends,
  COUNT(*) FILTER (WHERE verified = true) as verified_count,
  COUNT(*) FILTER (WHERE expires_at < NOW() AND verified = false) as expired_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE verified = true) / COUNT(*), 2) as verification_rate,
  MAX(created_at) as last_sent
FROM otp_codes
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY phone
ORDER BY total_sends DESC
LIMIT 20;

-- 3. Check for phones with multiple failed attempts
SELECT 
  phone,
  COUNT(*) as total_attempts,
  MAX(attempts) as max_attempts,
  COUNT(*) FILTER (WHERE verified = false AND expires_at < NOW()) as expired_unverified,
  MAX(created_at) as last_attempt
FROM otp_codes
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND verified = false
GROUP BY phone
HAVING COUNT(*) > 3
ORDER BY total_attempts DESC;

-- 4. Check OTP expiration issues
SELECT 
  phone,
  code,
  created_at,
  expires_at,
  verified,
  EXTRACT(EPOCH FROM (expires_at - created_at))/60 as validity_minutes,
  EXTRACT(EPOCH FROM (NOW() - expires_at))/60 as minutes_since_expiry
FROM otp_codes
WHERE expires_at < NOW()
  AND verified = false
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- 5. Find phones that never received verification
SELECT 
  phone,
  COUNT(*) as total_sends,
  MAX(created_at) as last_sent,
  MAX(expires_at) as last_expiry,
  BOOL_OR(verified = true) as ever_verified
FROM otp_codes
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY phone
HAVING BOOL_OR(verified = true) = false
ORDER BY total_sends DESC
LIMIT 20;

-- 6. Check for specific phone number
-- Replace '+22675581026' with the phone number you're troubleshooting
SELECT 
  phone,
  code,
  created_at,
  expires_at,
  verified,
  attempts,
  CASE 
    WHEN expires_at < NOW() THEN 'EXPIRED'
    WHEN verified = true THEN 'VERIFIED'
    ELSE 'ACTIVE'
  END as status
FROM otp_codes
WHERE phone = '+22675581026'  -- Change this phone number
ORDER BY created_at DESC
LIMIT 10;

-- 7. Check OTP codes by country code
SELECT 
  SUBSTRING(phone, 1, 4) as country_code,
  COUNT(*) as total_sends,
  COUNT(*) FILTER (WHERE verified = true) as verified,
  COUNT(*) FILTER (WHERE expires_at < NOW() AND verified = false) as expired,
  ROUND(100.0 * COUNT(*) FILTER (WHERE verified = true) / COUNT(*), 2) as success_rate
FROM otp_codes
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY SUBSTRING(phone, 1, 4)
ORDER BY total_sends DESC;

