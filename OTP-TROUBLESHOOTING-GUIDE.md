# OTP Code Delivery Troubleshooting Guide

## 🔍 Common Issues & Solutions

### Issue 1: Twilio Configuration Missing

**Symptoms:**
- Error: "SMS service configuration missing"
- No SMS sent at all

**Check:**
```bash
# Verify Twilio secrets are set
supabase secrets list | grep TWILIO
```

**Solution:**
```bash
supabase secrets set TWILIO_ACCOUNT_SID=your_account_sid
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token
supabase secrets set TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

---

### Issue 2: Geo Permissions Not Enabled

**Symptoms:**
- Error code: `21408` - "Permission denied"
- SMS fails for specific countries (especially Burkina Faso)

**Check:**
1. Log in to [Twilio Console](https://console.twilio.com)
2. Go to **Settings** → **Geo Permissions**
3. Verify these countries are enabled:
   - 🇧🇫 **Burkina Faso (BF)** - Required!
   - 🇨🇮 Côte d'Ivoire (CI)
   - 🇬🇭 Ghana (GH)
   - 🇸🇳 Senegal (SN)
   - Any other countries you support

**Solution:**
- Enable SMS for required countries in Twilio Console
- Wait a few minutes for changes to propagate

---

### Issue 3: Invalid Phone Number Format

**Symptoms:**
- Error code: `21211` - "Invalid phone number format"
- Phone number not normalized correctly

**Check:**
```javascript
// Test phone normalization
const phone = "+22675581026"; // Should be E.164 format
console.log(/^\+\d{7,15}$/.test(phone)); // Should be true
```

**Common Format Issues:**
- Missing `+` prefix
- Wrong country code
- Too many/few digits
- Special characters

**Solution:**
- Ensure phone is in E.164 format: `+[country code][number]`
- Example: `+22675581026` (Burkina Faso)

---

### Issue 4: Twilio Trial Account Limitations

**Symptoms:**
- SMS works for verified numbers only
- SMS fails for unverified numbers

**Check:**
1. Go to Twilio Console → **Phone Numbers** → **Verified Caller IDs**
2. Check if you're on a trial account

**Solution:**
- Upgrade Twilio account to paid plan
- Or verify all phone numbers you need to send to (not practical)

---

### Issue 5: SMS Service Not Available for Number/Region

**Symptoms:**
- Error code: `21608` or `21614`
- "SMS service is not available for this phone number"

**Possible Causes:**
- Carrier doesn't support SMS
- Number is a landline (not mobile)
- Region/country restrictions
- Number is invalid or disconnected

**Solution:**
- Verify the phone number is a valid mobile number
- Check if the carrier supports SMS
- Try with a different phone number
- Contact Twilio support if issue persists

---

### Issue 6: Rate Limiting

**Symptoms:**
- SMS works sometimes, fails other times
- Error: "Too many requests"

**Check:**
- Twilio Console → **Monitor** → **Logs**
- Look for rate limit errors

**Solution:**
- Implement rate limiting on your side
- Add delays between OTP requests
- Upgrade Twilio plan if needed

---

### Issue 7: Phone Number Normalization Issues

**Symptoms:**
- OTP sent to wrong number
- Number format incorrect

**Check:**
```sql
-- Check OTP codes in database
SELECT phone, code, created_at, expires_at, verified
FROM otp_codes
ORDER BY created_at DESC
LIMIT 10;
```

**Solution:**
- Verify normalization logic in `send-otp` function
- Test with various input formats
- Ensure country code is correctly added

---

## 🛠️ Diagnostic Tools

### 1. Test OTP Sending

Use the diagnostic script to test OTP sending:

```bash
node test-otp-sending.js +22675581026
```

### 2. Check Edge Function Logs

```bash
# View recent logs
supabase functions logs send-otp --project-ref uwmlagvsivxqocklxbbo

# Filter for errors
supabase functions logs send-otp --project-ref uwmlagvsivxqocklxbbo | grep -i error
```

### 3. Check Twilio Logs

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Monitor** → **Logs** → **Messaging**
3. Filter by your phone number or date
4. Check for:
   - Failed messages
   - Error codes
   - Delivery status

### 4. Verify Database OTP Storage

```sql
-- Check if OTP is being stored
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
WHERE phone = '+22675581026'
ORDER BY created_at DESC
LIMIT 5;
```

### 5. Test Phone Number Format

```sql
-- Test normalization for various inputs
SELECT 
  '75581026' as input,
  normalize_phone('75581026') as normalized;

SELECT 
  '075581026' as input,
  normalize_phone('075581026') as normalized;

SELECT 
  '22675581026' as input,
  normalize_phone('22675581026') as normalized;
```

---

## 📊 Monitoring & Alerts

### Key Metrics to Monitor

1. **OTP Send Success Rate**
   - Track successful vs failed OTP sends
   - Alert if success rate drops below 90%

2. **Twilio Error Codes**
   - Monitor specific error codes
   - Track by country/region

3. **Delivery Time**
   - Average time from request to delivery
   - Alert if delivery time > 30 seconds

4. **OTP Verification Rate**
   - Percentage of sent OTPs that are verified
   - Low rate might indicate delivery issues

### Recommended Alerts

```javascript
// Example alert conditions
if (otpSuccessRate < 0.9) {
  alert('OTP success rate below 90%');
}

if (errorCode === '21408') {
  alert('Geo Permissions issue - check Twilio settings');
}

if (errorCode === '21211') {
  alert('Phone format issues detected');
}
```

---

## 🔧 Quick Fixes

### Fix 1: Re-enable Geo Permissions

1. Twilio Console → Settings → Geo Permissions
2. Enable all required countries
3. Save changes
4. Wait 5-10 minutes
5. Test again

### Fix 2: Verify Twilio Credentials

```bash
# Test Twilio credentials
curl -X POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json \
  -u "{AccountSid}:{AuthToken}" \
  -d "From={TwilioPhoneNumber}" \
  -d "To=+22675581026" \
  -d "Body=Test message"
```

### Fix 3: Check Phone Number Format

```javascript
// Validate before sending
function validatePhone(phone) {
  // Must start with +
  if (!phone.startsWith('+')) {
    return { valid: false, error: 'Phone must start with +' };
  }
  
  // Must be 7-15 digits after +
  const digits = phone.substring(1);
  if (!/^\d{7,15}$/.test(digits)) {
    return { valid: false, error: 'Invalid phone number length' };
  }
  
  return { valid: true };
}
```

### Fix 4: Add Retry Logic

```javascript
// Retry OTP sending with exponential backoff
async function sendOTPWithRetry(phone, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await sendOTP(phone);
      return result;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}
```

---

## 📝 Debugging Checklist

When a user reports not receiving OTP:

- [ ] Check Twilio Console logs for that phone number
- [ ] Verify phone number format (E.164)
- [ ] Check if country is enabled in Geo Permissions
- [ ] Verify Twilio credentials are set correctly
- [ ] Check database for OTP record
- [ ] Verify OTP hasn't expired
- [ ] Check if user is on Twilio trial account
- [ ] Verify phone number is mobile (not landline)
- [ ] Check carrier/country SMS support
- [ ] Test with a different phone number
- [ ] Check edge function logs for errors
- [ ] Verify network connectivity

---

## 🆘 Emergency Procedures

### If OTP System Completely Down

1. **Check Twilio Status**: https://status.twilio.com
2. **Verify Credentials**: Test with curl command above
3. **Check Supabase Status**: https://status.supabase.com
4. **Review Recent Deployments**: Check if function was recently updated
5. **Rollback if Needed**: Revert to previous function version

### Temporary Workaround

If SMS is down, you can:
1. Allow manual OTP entry from admin panel
2. Use email as fallback (if user has email)
3. Implement voice call OTP (Twilio supports this)

---

## 📞 Support Contacts

- **Twilio Support**: https://support.twilio.com
- **Supabase Support**: https://supabase.com/support
- **Twilio Status**: https://status.twilio.com

---

## 📚 Additional Resources

- [Twilio SMS Best Practices](https://www.twilio.com/docs/sms/best-practices)
- [Twilio Error Codes](https://www.twilio.com/docs/api/errors)
- [E.164 Phone Format](https://en.wikipedia.org/wiki/E.164)
- [Supabase Edge Functions Logs](https://supabase.com/docs/guides/functions/logs)

---

**Last Updated:** January 2025

