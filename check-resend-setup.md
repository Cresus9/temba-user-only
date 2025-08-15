# Resend Setup Checklist

## 🔍 Debug Steps:

### 1. **Environment Variable**
- [ ] `RESEND_API_KEY` is set in Supabase Edge Functions
- [ ] API key starts with `re_` (your key: `re_4bCym6ve_Nh2hrTqJhnVZuFws4A41ubfp`)

### 2. **Domain Verification**
- [ ] `tembas.com` domain is added to Resend
- [ ] Domain is verified (DNS records added)
- [ ] `support@tembas.com` is authorized to send emails

### 3. **API Key Permissions**
- [ ] API key has "Full access" permissions
- [ ] API key is not expired or revoked

### 4. **Test the Setup**

Deploy and test the functions:

```bash
# Deploy the test function
supabase functions deploy test-resend --no-verify-jwt

# Test the function
curl -X POST https://your-project-ref.supabase.co/functions/v1/test-resend \
  -H "Authorization: Bearer your-anon-key"
```

### 5. **Common Solutions**

**If domain not verified:**
- Add DNS records to your domain
- Use a verified domain temporarily: `onboarding@resend.dev`

**If API key issues:**
- Generate a new API key
- Check permissions in Resend dashboard

**If environment variable missing:**
- Add `RESEND_API_KEY` in Supabase dashboard
- Redeploy functions after adding the variable

### 6. **Alternative: Use Resend's Test Domain**

For testing, you can use Resend's test domain:

```typescript
// Change from: 'support@tembas.com'
// To: 'onboarding@resend.dev'
from: 'onboarding@resend.dev',
```

This will work immediately without domain verification. 