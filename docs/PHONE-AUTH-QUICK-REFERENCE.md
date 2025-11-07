# Phone Authentication - Quick Reference Guide

## For Mobile App Developers

### API Endpoints

| Endpoint | Method | Purpose | Request Body |
|----------|--------|---------|--------------|
| `/functions/v1/send-otp` | POST | Send OTP code | `{ "phone": "+22675581026" }` |
| `/functions/v1/verify-otp` | POST | Verify OTP code | `{ "phone": "+22675581026", "code": "123456" }` |
| `/functions/v1/signup` | POST | Create account | `{ "email": "22675581026@temba.temp", "password": "...", "name": "...", "phone": "+22675581026" }` |
| `/auth/v1/token` | POST | Login | `{ "email": "22675581026@temba.temp", "password": "..." }` |

### Headers Required

```typescript
{
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'apikey': SUPABASE_ANON_KEY
}
```

### Phone Number Normalization

```typescript
// Input variations → Output
"75581026"        → "+22675581026"
"075581026"       → "+22675581026"
"22675581026"     → "+22675581026"
"+22675581026"    → "+22675581026"
```

**Rule**: Always normalize to E.164 format (`+[country][number]`) before API calls.

### Signup Flow (3 Steps)

```
1. Send OTP
   POST /functions/v1/send-otp
   Body: { "phone": "+22675581026" }
   → User receives SMS with 6-digit code

2. Verify OTP
   POST /functions/v1/verify-otp
   Body: { "phone": "+22675581026", "code": "123456" }
   → Returns: { "valid": true }

3. Create Account
   POST /functions/v1/signup
   Body: {
     "email": "22675581026@temba.temp",  // Construct from phone digits
     "password": "userpassword123",
     "name": "John Doe",
     "phone": "+22675581026"
   }
   → Account created, user logged in
```

### Login Flow

```
1. User enters phone number: +22675581026

2. Construct temporary email:
   - Remove non-digits: 22675581026
   - Add @temba.temp: 22675581026@temba.temp

3. Login with Supabase Auth:
   POST /auth/v1/token?grant_type=password
   Body: {
     "email": "22675581026@temba.temp",
     "password": "userpassword123"
   }
   → Returns session token
```

### Code Snippets

#### Send OTP
```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/send-otp`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ANON_KEY}`,
    'apikey': ANON_KEY
  },
  body: JSON.stringify({ phone: normalizePhone(phone) })
});
```

#### Verify OTP
```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-otp`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ANON_KEY}`,
    'apikey': ANON_KEY
  },
  body: JSON.stringify({
    phone: normalizePhone(phone),
    code: code.trim()
  })
});

const result = await response.json();
const isValid = result.valid === true;
```

#### Signup with Phone
```typescript
const phoneDigits = normalizePhone(phone).replace(/[^0-9]/g, '');
const tempEmail = `${phoneDigits}@temba.temp`;

const response = await fetch(`${SUPABASE_URL}/functions/v1/signup`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ANON_KEY}`,
    'apikey': ANON_KEY
  },
  body: JSON.stringify({
    email: tempEmail,
    password: password,
    name: name,
    phone: normalizePhone(phone)
  })
});
```

#### Login with Phone
```typescript
const phoneDigits = normalizePhone(phone).replace(/[^0-9]/g, '');
const tempEmail = `${phoneDigits}@temba.temp`;

const { data, error } = await supabase.auth.signInWithPassword({
  email: tempEmail,
  password: password
});
```

### Phone Normalization Function

```typescript
function normalizePhone(phone: string, defaultCountryCode: string = '226'): string {
  if (!phone) return '';
  
  // Remove all non-numeric except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Remove leading zeros
  if (!cleaned.startsWith('+')) {
    cleaned = cleaned.replace(/^0+/, '');
  }
  
  // If already has +, return as is
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // Default to country code if missing
  return `+${defaultCountryCode}${cleaned}`;
}
```

### Validation Function

```typescript
function isValidPhone(phone: string): boolean {
  const normalized = normalizePhone(phone, '');
  return /^\+\d{7,15}$/.test(normalized);
}
```

### Error Messages (French)

| Error | Message |
|-------|---------|
| Invalid format | `Format de numéro de téléphone invalide` |
| OTP expired | `Code expiré. Veuillez demander un nouveau code` |
| OTP invalid | `Code invalide. Veuillez réessayer` |
| Too many attempts | `Trop de tentatives. Veuillez demander un nouveau code` |
| Already registered | `Un compte existe déjà avec ce numéro. Veuillez vous connecter` |

### OTP Specifications

- **Length**: 6 digits
- **Expiration**: 10 minutes
- **Max Attempts**: 5 per OTP
- **Reuse**: One-time use (marked as verified after use)
- **Format**: Numeric only (0-9)

### Temporary Email Format

For phone-only signups, the email format is:
```
{phoneDigits}@temba.temp
```

Example:
- Phone: `+22675581026`
- Phone digits: `22675581026`
- Email: `22675581026@temba.temp`

### Database Schema Reference

**otp_codes table**:
- `phone` (TEXT, UNIQUE): E.164 format
- `code` (TEXT): 6-digit OTP
- `expires_at` (TIMESTAMPTZ): Expiration time
- `verified` (BOOLEAN): Verification status
- `attempts` (INTEGER): Attempt count

**profiles table**:
- `phone` (TEXT): E.164 format
- `phone_verified` (BOOLEAN): True if verified via OTP
- `name` (TEXT): User's actual name (not phone digits)

### Testing

Use these test phone numbers (ensure Twilio Geo Permissions enabled):
- Burkina Faso: `+22675581026`
- USA: `+19174732044`
- France: `+33612345678`

### Complete Implementation Checklist

- [ ] Phone validation utility
- [ ] Send OTP API call
- [ ] Verify OTP API call
- [ ] Signup API call
- [ ] Login API call (phone support)
- [ ] Temporary email construction
- [ ] Error handling (French messages)
- [ ] Loading states
- [ ] OTP input UI (6 digits)
- [ ] Resend OTP functionality

---

**See `PHONE-AUTHENTICATION-IMPLEMENTATION-REPORT.md` for complete details.**

