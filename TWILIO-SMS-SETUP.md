# Twilio SMS Setup for Phone Authentication

## Configuration Requirements

### 1. Twilio Account Setup
- Create a Twilio account at https://www.twilio.com
- Obtain your credentials:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_PHONE_NUMBER` (sender number)

### 2. Enable International SMS

**Important**: You must enable SMS sending to specific countries in your Twilio account.

1. Log in to your Twilio Console
2. Go to **Settings** → **Geo Permissions**
3. Enable SMS for the countries you need:
   - **Burkina Faso (BF)** - Required for West Africa users
   - **USA** - If needed for US numbers
   - Any other countries you plan to support

### 3. Set Environment Variables in Supabase

Add these secrets to your Supabase project:

```bash
supabase secrets set TWILIO_ACCOUNT_SID=your_account_sid
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token
supabase secrets set TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

Or via Supabase Dashboard:
- Go to **Project Settings** → **Edge Functions** → **Secrets**
- Add each secret key-value pair

### 4. Supported Phone Number Formats

The `send-otp` Edge Function accepts:
- E.164 format: `+22675581026` (Burkina Faso)
- E.164 format: `+19174732044` (USA)
- Local format (auto-normalized): `75581026` → `+22675581026`
- Local format with country code: `22675581026` → `+22675581026`

### 5. Testing

Test with a Burkina Faso number:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-otp \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+22675581026"}'
```

### Common Twilio Error Codes

- **21211**: Invalid phone number format
- **21608 / 21614**: SMS service not available for this number/region
- **21408**: Permission denied - country not enabled in Geo Permissions

### Troubleshooting

If SMS fails for Burkina Faso numbers:
1. ✅ Verify **Geo Permissions** includes Burkina Faso (BF)
2. ✅ Check your Twilio account has SMS capabilities enabled
3. ✅ Verify phone number format is correct (`+226XXXXXXXX`)
4. ✅ Check Edge Function logs for detailed Twilio error messages

The improved error handling in `send-otp` will now show specific Twilio error codes and messages for easier debugging.

