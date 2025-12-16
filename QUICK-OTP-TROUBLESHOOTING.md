# Quick OTP Troubleshooting Guide

## 🚨 User Not Receiving OTP Code?

### Step 1: Check Twilio Console (Most Common Issue)

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Monitor** → **Logs** → **Messaging**
3. Search for the phone number
4. Check the **Status** column:
   - ✅ **Delivered**: SMS was sent successfully
   - ❌ **Failed**: Check the error code below

### Step 2: Check Error Codes

**Error Code 21408** - "Permission denied"
- **Fix**: Enable Geo Permissions
  1. Twilio Console → **Settings** → **Geo Permissions**
  2. Enable SMS for **Burkina Faso (BF)** and other required countries
  3. Wait 5-10 minutes
  4. Try again

**Error Code 21211** - "Invalid phone number"
- **Fix**: Check phone format
  - Must be E.164: `+22675581026`
  - No spaces or special characters
  - Correct country code

**Error Code 21608/21614** - "SMS not available"
- **Possible Causes**:
  - Landline (not mobile)
  - Carrier doesn't support SMS
  - Invalid/disconnected number
- **Fix**: Verify it's a valid mobile number

### Step 3: Check Supabase Logs

```bash
# View recent send-otp logs
supabase functions logs send-otp --project-ref uwmlagvsivxqocklxbbo | tail -20

# Filter for errors
supabase functions logs send-otp --project-ref uwmlagvsivxqocklxbbo | grep -i error
```

### Step 4: Verify Twilio Configuration

```bash
# Check if secrets are set
supabase secrets list | grep TWILIO

# Should show:
# TWILIO_ACCOUNT_SID
# TWILIO_AUTH_TOKEN  
# TWILIO_PHONE_NUMBER
```

### Step 5: Test OTP Sending

```bash
# Use the diagnostic script
./diagnose-otp-issue.sh +22675581026

# Or test manually
curl -X POST https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/send-otp \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+22675581026"}'
```

### Step 6: Check Database

Run in Supabase SQL Editor:

```sql
-- Check if OTP was stored
SELECT * FROM otp_codes 
WHERE phone = '+22675581026'  -- Replace with actual number
ORDER BY created_at DESC 
LIMIT 5;
```

---

## ✅ Quick Fixes

### Fix 1: Enable Geo Permissions (Most Common)
1. Twilio Console → Settings → Geo Permissions
2. Enable **Burkina Faso (BF)**
3. Save and wait 5-10 minutes

### Fix 2: Verify Phone Format
- ✅ Correct: `+22675581026`
- ❌ Wrong: `22675581026` (missing +)
- ❌ Wrong: `075581026` (local format)
- ❌ Wrong: `+226 75 58 10 26` (spaces)

### Fix 3: Check Twilio Account Status
- Trial accounts can only send to verified numbers
- Upgrade to paid plan for production use

---

## 📞 Need More Help?

1. **Check Full Guide**: `OTP-TROUBLESHOOTING-GUIDE.md`
2. **SQL Queries**: `OTP-ADMIN-DASHBOARD-QUERIES.md`
3. **Twilio Support**: https://support.twilio.com
4. **Twilio Status**: https://status.twilio.com

---

**Most Common Issue**: Geo Permissions not enabled for Burkina Faso!

