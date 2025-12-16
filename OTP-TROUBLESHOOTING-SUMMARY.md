# OTP Troubleshooting - Summary

## 🎯 Most Common Issues (90% of cases)

### 1. Geo Permissions Not Enabled ⚠️ **MOST COMMON**
**Symptom**: Error code `21408` or SMS fails for specific countries

**Solution**:
1. Go to [Twilio Console](https://console.twilio.com) → **Settings** → **Geo Permissions**
2. Enable SMS for:
   - 🇧🇫 **Burkina Faso (BF)** - **REQUIRED!**
   - Other countries as needed
3. Wait 5-10 minutes for changes to propagate

**Check**: Twilio Console → Monitor → Logs → Look for error code 21408

---

### 2. Invalid Phone Number Format
**Symptom**: Error code `21211`

**Solution**: Ensure phone is in E.164 format
- ✅ `+22675581026`
- ❌ `22675581026` (missing +)
- ❌ `075581026` (local format)

---

### 3. Twilio Trial Account Limitations
**Symptom**: SMS only works for verified numbers

**Solution**: Upgrade Twilio account to paid plan

---

## 🛠️ Diagnostic Tools Created

### 1. **QUICK-OTP-TROUBLESHOOTING.md**
   - Quick reference for common issues
   - Step-by-step fixes
   - Most common: Geo Permissions

### 2. **OTP-TROUBLESHOOTING-GUIDE.md**
   - Comprehensive troubleshooting guide
   - All error codes explained
   - Detailed solutions

### 3. **diagnose-otp-issue.sh**
   - Shell script for quick diagnostics
   - Checks configuration
   - Tests OTP sending
   - Usage: `./diagnose-otp-issue.sh +22675581026`

### 4. **test-otp-sending.js**
   - Node.js diagnostic tool
   - Tests OTP sending
   - Checks database
   - Usage: `node test-otp-sending.js +22675581026`

### 5. **check-otp-issues.sql**
   - SQL queries for database diagnostics
   - Check OTP records
   - Analyze success rates
   - Run in Supabase SQL Editor

### 6. **OTP-ADMIN-DASHBOARD-QUERIES.md**
   - Ready-to-use SQL queries
   - Analytics and monitoring
   - Cleanup queries

---

## 📋 Troubleshooting Checklist

When user reports not receiving OTP:

1. ✅ **Check Twilio Console Logs** (First step!)
   - Go to Monitor → Logs → Messaging
   - Search for phone number
   - Check status and error codes

2. ✅ **Verify Geo Permissions**
   - Twilio Console → Settings → Geo Permissions
   - Ensure Burkina Faso is enabled

3. ✅ **Check Phone Format**
   - Must be E.164: `+22675581026`
   - Use diagnostic script to validate

4. ✅ **Verify Twilio Credentials**
   ```bash
   supabase secrets list | grep TWILIO
   ```

5. ✅ **Check Supabase Logs**
   ```bash
   supabase functions logs send-otp --project-ref uwmlagvsivxqocklxbbo | tail -20
   ```

6. ✅ **Check Database**
   ```sql
   SELECT * FROM otp_codes 
   WHERE phone = '+22675581026'
   ORDER BY created_at DESC;
   ```

7. ✅ **Test OTP Sending**
   ```bash
   ./diagnose-otp-issue.sh +22675581026
   ```

---

## 🔍 Enhanced Logging

The `send-otp` function now includes:
- Detailed error logging with Twilio error codes
- Phone number normalization logging
- Request ID tracking
- Timestamp logging

**View logs**:
```bash
supabase functions logs send-otp --project-ref uwmlagvsivxqocklxbbo
```

---

## 📊 Monitoring Recommendations

### Key Metrics to Track:
1. **OTP Send Success Rate** (should be >90%)
2. **Twilio Error Codes** (especially 21408, 21211)
3. **Delivery Time** (should be <30 seconds)
4. **Verification Rate** (percentage of sent OTPs verified)

### Set Up Alerts:
- Alert if success rate drops below 90%
- Alert on error code 21408 (Geo Permissions)
- Alert on error code 21211 (Format issues)

---

## 🚀 Quick Actions

### Immediate Fixes:
1. **Enable Geo Permissions** (5 minutes)
2. **Verify Phone Format** (1 minute)
3. **Check Twilio Account Status** (2 minutes)
4. **Review Recent Logs** (5 minutes)

### Long-term Solutions:
1. **Upgrade Twilio Account** (if on trial)
2. **Set Up Monitoring** (track success rates)
3. **Implement Rate Limiting** (prevent abuse)
4. **Add Retry Logic** (handle temporary failures)

---

## 📞 Support Resources

- **Twilio Console**: https://console.twilio.com
- **Twilio Support**: https://support.twilio.com
- **Twilio Status**: https://status.twilio.com
- **Twilio Error Codes**: https://www.twilio.com/docs/api/errors
- **Supabase Logs**: Dashboard → Edge Functions → Logs

---

**Remember**: 90% of OTP delivery issues are due to Geo Permissions not being enabled!

