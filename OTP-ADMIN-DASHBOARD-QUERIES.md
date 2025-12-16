# OTP Admin Dashboard Queries

Quick SQL queries to run in Supabase SQL Editor for troubleshooting OTP issues.

## 🔍 Quick Diagnostics

### 1. Recent OTP Activity (Last Hour)
```sql
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
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### 2. Check Specific Phone Number
```sql
-- Replace with the phone number you're troubleshooting
SELECT 
  phone,
  code,
  created_at,
  expires_at,
  verified,
  attempts,
  EXTRACT(EPOCH FROM (expires_at - NOW()))/60 as minutes_until_expiry
FROM otp_codes
WHERE phone = '+22675581026'  -- Change this
ORDER BY created_at DESC
LIMIT 5;
```

### 3. Failed OTP Sends (Not Verified, Expired)
```sql
SELECT 
  phone,
  COUNT(*) as failed_attempts,
  MAX(created_at) as last_attempt,
  MAX(attempts) as max_attempts
FROM otp_codes
WHERE verified = false
  AND expires_at < NOW()
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY phone
ORDER BY failed_attempts DESC
LIMIT 20;
```

### 4. Success Rate by Country
```sql
SELECT 
  SUBSTRING(phone, 1, 4) as country_code,
  COUNT(*) as total_sends,
  COUNT(*) FILTER (WHERE verified = true) as verified,
  ROUND(100.0 * COUNT(*) FILTER (WHERE verified = true) / COUNT(*), 2) as success_rate
FROM otp_codes
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY SUBSTRING(phone, 1, 4)
ORDER BY total_sends DESC;
```

### 5. Phones Never Receiving Verification
```sql
SELECT 
  phone,
  COUNT(*) as total_sends,
  MAX(created_at) as last_sent,
  BOOL_OR(verified = true) as ever_verified
FROM otp_codes
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY phone
HAVING BOOL_OR(verified = true) = false
ORDER BY total_sends DESC;
```

---

## 🛠️ Common Issues & SQL Checks

### Issue: OTP Not Stored in Database
```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'otp_codes'
);
```

### Issue: OTP Expiring Too Fast
```sql
-- Check OTP validity periods
SELECT 
  phone,
  created_at,
  expires_at,
  EXTRACT(EPOCH FROM (expires_at - created_at))/60 as validity_minutes
FROM otp_codes
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY validity_minutes ASC;
```

### Issue: Multiple OTPs for Same Phone
```sql
-- Find phones with multiple active OTPs
SELECT 
  phone,
  COUNT(*) as active_otps,
  ARRAY_AGG(code ORDER BY created_at DESC) as codes,
  ARRAY_AGG(created_at ORDER BY created_at DESC) as timestamps
FROM otp_codes
WHERE expires_at > NOW()
  AND verified = false
GROUP BY phone
HAVING COUNT(*) > 1
ORDER BY active_otps DESC;
```

---

## 📊 Analytics Queries

### Daily OTP Statistics
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_sends,
  COUNT(*) FILTER (WHERE verified = true) as verified,
  COUNT(*) FILTER (WHERE expires_at < NOW() AND verified = false) as expired,
  ROUND(100.0 * COUNT(*) FILTER (WHERE verified = true) / COUNT(*), 2) as success_rate
FROM otp_codes
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Peak Usage Times
```sql
SELECT 
  EXTRACT(HOUR FROM created_at) as hour,
  COUNT(*) as total_sends,
  COUNT(*) FILTER (WHERE verified = true) as verified
FROM otp_codes
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hour;
```

---

## 🧹 Cleanup Queries

### Delete Expired OTPs (Older than 24 hours)
```sql
DELETE FROM otp_codes
WHERE expires_at < NOW() - INTERVAL '24 hours';
```

### Delete Verified OTPs (Older than 7 days)
```sql
DELETE FROM otp_codes
WHERE verified = true
  AND created_at < NOW() - INTERVAL '7 days';
```

---

**Note:** Always backup before running DELETE queries!

