# Mobile App Quick Reference - Recent Updates

## 🚀 Quick Summary

The web app has been updated with phone-first authentication. Mobile app needs to implement:

1. **Method Selection** (Phone/Email toggle)
2. **Country Code Selector** (Flag-based dropdown)
3. **Phone Password Reset** (OTP flow)
4. **Consistent UX** (Match web app design)

---

## 📱 Key Changes

### 1. Signup & Login Pages
- **Default Method**: Phone (was Email)
- **New Component**: Country code selector with flags
- **Phone Input**: Now accepts local number only (country code separate)
- **Validation**: Real-time with visual feedback

### 2. Password Reset
- **New Flow**: Phone-based reset with OTP verification
- **New Endpoint**: `POST /functions/v1/reset-password-phone`
- **Multi-Step**: Input → OTP → Password → Success

### 3. Country Code Selector
- **Component**: `CountryCodeSelector.tsx`
- **Features**: Flag display, searchable, 30+ countries
- **Default**: Burkina Faso (+226)

---

## 🔧 Implementation Checklist

### Signup Screen
```typescript
// State
const [method, setMethod] = useState<'phone' | 'email'>('phone');
const [countryCode, setCountryCode] = useState('+226');
const [localPhone, setLocalPhone] = useState('');

// Combine for API
const fullPhone = `${countryCode}${localPhone.replace(/\s/g, '')}`;
```

### Login Screen
```typescript
// Same state structure as signup
// Combine before calling login API
const loginValue = method === 'phone' 
  ? `${countryCode}${localPhone.replace(/\s/g, '')}`
  : email;
```

### Password Reset Screen
```typescript
// Multi-step flow
type Step = 'input' | 'verify-otp' | 'reset-password' | 'success';

// Step 1: Send OTP
await sendOTP(fullPhone);

// Step 2: Verify OTP
await verifyOTP(fullPhone, otpCode);

// Step 3: Reset password
await resetPasswordWithPhone(fullPhone, newPassword, otpCode);
```

---

## 🌍 Country Code Selector

### Required Countries (Priority)
- 🇧🇫 Burkina Faso (+226) - **Default**
- 🇨🇮 Côte d'Ivoire (+225)
- 🇬🇭 Ghana (+233)
- 🇸🇳 Sénégal (+221)
- 🇲🇱 Mali (+223)
- 🇳🇪 Niger (+227)
- 🇹🇬 Togo (+228)
- 🇧🇯 Bénin (+229)
- 🇳🇬 Nigeria (+234)

### Data Structure
```typescript
interface Country {
  code: string;      // 'BF'
  name: string;      // 'Burkina Faso'
  flag: string;      // '🇧🇫'
  dialCode: string;  // '+226'
}
```

---

## 🔌 API Endpoints

### New: Phone Password Reset
```
POST /functions/v1/reset-password-phone
Body: {
  phone: "+22670123456",
  newPassword: "password123",
  otpCode: "123456" // Optional
}
```

### Existing (No Changes)
- `POST /functions/v1/send-otp`
- `POST /functions/v1/verify-otp`
- `POST /functions/v1/signup`
- Standard login endpoint

---

## ✅ Testing Priorities

1. **Phone Signup** with country code
2. **Phone Login** with country code
3. **Phone Password Reset** (full OTP flow)
4. **Method Switching** (Phone ↔ Email)
5. **Country Code Selection** (all countries)
6. **Error Handling** (invalid inputs, expired OTP)

---

## 📄 Full Documentation

See `WEB-APP-UPDATES-MOBILE-INTEGRATION-REPORT.md` for complete details.

---

**Last Updated:** January 2025

