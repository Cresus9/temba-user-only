# Phone Authentication Implementation Report
## Complete Guide for Mobile App Integration

---

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Backend Implementation](#backend-implementation)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Authentication Flows](#authentication-flows)
6. [Frontend Patterns (Web)](#frontend-patterns-web)
7. [Mobile App Implementation Guide](#mobile-app-implementation-guide)
8. [Code Examples](#code-examples)
9. [Error Handling](#error-handling)
10. [Security Considerations](#security-considerations)

---

## System Architecture

### Overview
Temba uses a **phone-first authentication system** that allows users to sign up and login using their phone number. The system uses SMS OTP (One-Time Password) verification via Twilio.

### Key Components

```
┌─────────────────┐
│  Mobile/Web App │
└────────┬────────┘
         │
         ├─► Phone Validation (E.164 format)
         │
         ├─► Send OTP Request
         │   └─► POST /functions/v1/send-otp
         │
         ├─► Verify OTP Request
         │   └─► POST /functions/v1/verify-otp
         │
         └─► Signup/Login Request
             └─► POST /functions/v1/signup
                 POST /auth/v1/token (for login)
```

### Technology Stack
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: PostgreSQL (Supabase)
- **SMS Provider**: Twilio
- **Authentication**: Supabase Auth
- **Phone Format**: E.164 International Format

---

## Backend Implementation

### 1. Send OTP Edge Function

**Location**: `supabase/functions/send-otp/index.ts`

**Purpose**: Generates and sends a 6-digit OTP code via SMS to the user's phone number.

**Key Features**:
- Phone number normalization to E.164 format
- OTP generation (6-digit random code)
- OTP storage in database (expires in 10 minutes)
- SMS sending via Twilio API
- Error handling with specific Twilio error codes

**Flow**:
1. Receive phone number
2. Normalize to E.164 format (`+226XXXXXXXX`)
3. Validate format
4. Generate 6-digit OTP
5. Store in `otp_codes` table with expiration
6. Send SMS via Twilio
7. Return success response

**Environment Variables Required**:
```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Verify OTP Edge Function

**Location**: `supabase/functions/verify-otp/index.ts`

**Purpose**: Verifies the OTP code entered by the user.

**Key Features**:
- Phone number normalization
- OTP validation (6 digits)
- Database lookup for OTP record
- Expiration check (10 minutes)
- Attempt tracking (max 5 attempts)
- Reuse prevention (marks as verified)
- Updates verification status

**Flow**:
1. Receive phone number and OTP code
2. Normalize phone number
3. Validate code format (6 digits)
4. Lookup OTP in database
5. Check expiration
6. Check if already verified
7. Check attempt count (max 5)
8. Verify code matches
9. Increment attempts
10. Mark as verified if correct
11. Return validation result

### 3. Signup Edge Function

**Location**: `supabase/functions/signup/index.ts`

**Purpose**: Creates a new user account after OTP verification.

**Key Features**:
- Supports email and phone signup
- Phone number normalization
- Creates Supabase Auth user
- Creates profile record
- Generates temporary email for phone-only signups (`{phoneDigits}@temba.temp`)
- Welcome email sending
- Profile name storage (not phone digits)

**Important**: For phone signup, the email parameter will be a temporary email like `19174732044@temba.temp`.

---

## Database Schema

### OTP Codes Table

```sql
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,           -- E.164 format: +22675581026
  code TEXT NOT NULL,                   -- 6-digit OTP code
  expires_at TIMESTAMPTZ NOT NULL,      -- Expiration time (10 minutes)
  verified BOOLEAN DEFAULT false,        -- Whether OTP was verified
  attempts INTEGER DEFAULT 0,           -- Verification attempts (max 5)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes**:
- `idx_otp_codes_phone` - Fast phone lookup
- `idx_otp_codes_expires_at` - Expiration queries
- `idx_otp_codes_verified` - Verification status queries

**RLS**: Enabled (only service role can access)

### Profiles Table (Phone Fields)

```sql
-- Relevant columns for phone auth
profiles (
  user_id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,              -- Can be temporary: {phoneDigits}@temba.temp
  phone TEXT,                       -- E.164 format: +22675581026
  phone_verified BOOLEAN,           -- True if phone was verified via OTP
  ...
)
```

---

## API Endpoints

### 1. Send OTP

**Endpoint**: `POST /functions/v1/send-otp`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {SUPABASE_ANON_KEY}
apikey: {SUPABASE_ANON_KEY}
```

**Request Body**:
```json
{
  "phone": "+22675581026"  // or "75581026" (will be normalized)
}
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "phone": "+22675581026"  // Normalized phone
}
```

**Response (Error)**:
```json
{
  "success": false,
  "error": "Invalid phone number format. Please use E.164 format (e.g., +22675581026)"
}
```

**Error Codes**:
- `400`: Invalid phone format
- `500`: SMS sending failed (Twilio error)

### 2. Verify OTP

**Endpoint**: `POST /functions/v1/verify-otp`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {SUPABASE_ANON_KEY}
apikey: {SUPABASE_ANON_KEY}
```

**Request Body**:
```json
{
  "phone": "+22675581026",
  "code": "123456"  // 6-digit code
}
```

**Response (Success)**:
```json
{
  "valid": true,
  "message": "OTP verified successfully"
}
```

**Response (Error)**:
```json
{
  "valid": false,
  "error": "Invalid OTP code. Please try again."
}
```

**Error Cases**:
- `400`: Invalid format, expired, already verified, too many attempts
- `500`: Database error

### 3. Signup (Phone)

**Endpoint**: `POST /functions/v1/signup`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {SUPABASE_ANON_KEY}
apikey: {SUPABASE_ANON_KEY}
```

**Request Body**:
```json
{
  "email": "19174732044@temba.temp",  // Temporary email from phone digits
  "password": "userpassword123",
  "name": "John Doe",
  "phone": "+22675581026"  // Optional but recommended
}
```

**Response (Success)**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "19174732044@temba.temp",
    "name": "John Doe",
    "phone": "+22675581026"
  },
  "session": { ... },
  "message": "Account created successfully"
}
```

### 4. Login (Phone)

**Endpoint**: `POST /auth/v1/token?grant_type=password`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {SUPABASE_ANON_KEY}
apikey: {SUPABASE_ANON_KEY}
```

**Request Body**:
```json
{
  "email": "19174732044@temba.temp",  // Construct from phone: {phoneDigits}@temba.temp
  "password": "userpassword123"
}
```

**Response**: Standard Supabase Auth token response

---

## Authentication Flows

### Flow 1: Phone Signup (New User)

```
1. User enters phone number
   └─► Validate and normalize: +22675581026

2. Request OTP
   └─► POST /functions/v1/send-otp
   └─► Backend generates 6-digit code
   └─► Stores in database (expires 10 min)
   └─► Sends SMS via Twilio

3. User receives SMS
   └─► "Votre code de vérification Temba est: 123456. Valide pendant 10 minutes."

4. User enters OTP code
   └─► POST /functions/v1/verify-otp
   └─► Backend validates code
   └─► Returns valid: true

5. User completes signup form
   └─► Name, Password entered
   └─► POST /functions/v1/signup
   └─► Email: {phoneDigits}@temba.temp
   └─► Phone: +22675581026
   └─► Backend creates:
       - Supabase Auth user
       - Profile record
   └─► User logged in automatically
```

### Flow 2: Phone Login (Existing User)

```
1. User enters phone number
   └─► Validate: +22675581026

2. Construct temporary email
   └─► Remove non-digits: 22675581026
   └─► Email: 22675581026@temba.temp

3. Login with email + password
   └─► POST /auth/v1/token?grant_type=password
   └─► Email: 22675581026@temba.temp
   └─► Password: user_password
   └─► Returns session token

4. Load user profile
   └─► Profile contains actual name and phone
   └─► Display name (not phone digits)
```

### Flow 3: Phone Number Normalization

```
Input variations → Normalized output:

"75581026"           → "+22675581026"
"075581026"          → "+22675581026"
"22675581026"        → "+22675581026"
"+22675581026"       → "+22675581026"
"+1 917 473 2044"    → "+19174732044"
"19174732044"        → "+19174732044"
```

**Algorithm**:
1. Remove all non-numeric characters except `+`
2. Remove leading zeros
3. If starts with `+`, check if country code exists
4. If no country code detected, default to `+226` (Burkina Faso)
5. Return `+[country][number]`

---

## Frontend Patterns (Web)

### Phone Validation Utility

**Location**: `src/utils/phoneValidation.ts`

**Key Functions**:
```typescript
// Normalize phone to E.164 format
normalizePhone(phone: string, defaultCountryCode?: string): string

// Validate phone format
isValidPhone(phone: string): boolean

// Detect if input is phone or email
detectInputType(input: string): 'phone' | 'email' | 'unknown'

// Get phone info (country, code, etc.)
getPhoneInfo(phone: string): { normalized, countryCode, countryName }

// Format for display
formatPhoneForDisplay(phone: string): string
```

### Auth Service

**Location**: `src/services/authService.ts`

**Key Methods**:
```typescript
// Send OTP
sendOTP(phone: string): Promise<{ success: boolean, message?: string }>

// Verify OTP
verifyOTP(phone: string, code: string): Promise<boolean>

// Register with phone
registerWithPhone(data: {
  name: string;
  phone: string;
  password: string;
}): Promise<void>

// Login (supports phone)
login(emailOrPhone: string, password: string): Promise<AuthResponse>
```

### Signup Flow (Web)

**Location**: `src/pages/SignUp.tsx`

**Steps**:
1. User enters phone number
2. Auto-detect input type (phone vs email)
3. If phone: Show "Send Verification Code" button
4. User clicks → `sendOTP()` called
5. Show OTP input field
6. User enters 6-digit code
7. User clicks "Verify" → `verifyOTP()` called
8. If valid: Show success, enable signup form
9. User enters name and password
10. Submit → `registerWithPhone()` called
11. Account created, user logged in

### Login Flow (Web)

**Location**: `src/pages/Login.tsx`

**Steps**:
1. User enters phone or email
2. Auto-detect input type
3. If phone: Construct temp email (`{phoneDigits}@temba.temp`)
4. Call `login(emailOrPhone, password)`
5. If phone: `authService.login()` constructs temp email internally
6. Authenticate with Supabase Auth
7. Load profile (contains actual name, not phone digits)

---

## Mobile App Implementation Guide

### Prerequisites

1. **Install Dependencies** (React Native example):
```bash
npm install @supabase/supabase-js
npm install react-native-phone-number-input  # Optional: for phone input UI
npm install libphonenumber-js  # Optional: for phone validation
```

2. **Environment Variables**:
```typescript
const SUPABASE_URL = 'https://your-project.supabase.co'
const SUPABASE_ANON_KEY = 'your-anon-key'
```

### Step 1: Phone Validation Utility (Mobile)

```typescript
// utils/phoneValidation.ts (React Native)

/**
 * Normalize phone number to E.164 format
 */
export const normalizePhone = (phone: string, defaultCountryCode: string = '226'): string => {
  if (!phone) return '';
  
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Remove leading zeros
  if (!cleaned.startsWith('+')) {
    cleaned = cleaned.replace(/^0+/, '');
  }
  
  // If already has +, return as is (assuming valid E.164)
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // Default to Burkina Faso (+226) if no country code
  return `+${defaultCountryCode}${cleaned}`;
};

/**
 * Validate phone format (E.164)
 */
export const isValidPhone = (phone: string): boolean => {
  const normalized = normalizePhone(phone, '');
  return /^\+\d{7,15}$/.test(normalized);
};

/**
 * Format phone for display
 */
export const formatPhoneForDisplay = (phone: string): string => {
  const normalized = normalizePhone(phone);
  // Format: +226 75 58 10 26
  if (normalized.startsWith('+226') && normalized.length === 12) {
    const digits = normalized.substring(4);
    return `+226 ${digits.substring(0, 2)} ${digits.substring(2, 4)} ${digits.substring(4, 6)} ${digits.substring(6, 8)}`;
  }
  return normalized;
};
```

### Step 2: API Service (Mobile)

```typescript
// services/authService.ts (React Native)

import { createClient } from '@supabase/supabase-js';
import { normalizePhone, isValidPhone } from '../utils/phoneValidation';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

class AuthService {
  /**
   * Send OTP to phone number
   */
  async sendOTP(phone: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      if (!isValidPhone(phone)) {
        throw new Error('Format de numéro de téléphone invalide');
      }

      const normalizedPhone = normalizePhone(phone);

      const response = await fetch(`${supabaseUrl}/functions/v1/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({ phone: normalizedPhone }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to send OTP' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to send OTP`);
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('Erreur envoi OTP:', error);
      throw new Error(error.message || 'Échec de l\'envoi du code de vérification');
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(phone: string, code: string): Promise<boolean> {
    try {
      if (!isValidPhone(phone)) {
        throw new Error('Format de numéro de téléphone invalide');
      }

      if (!code || code.length !== 6) {
        throw new Error('Le code de vérification doit contenir 6 chiffres');
      }

      const normalizedPhone = normalizePhone(phone);

      const response = await fetch(`${supabaseUrl}/functions/v1/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          phone: normalizedPhone,
          code: code.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to verify OTP' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to verify OTP`);
      }

      const result = await response.json();
      return result.valid === true;
    } catch (error: any) {
      console.error('Erreur vérification OTP:', error);
      throw new Error(error.message || 'Échec de la vérification du code');
    }
  }

  /**
   * Register with phone number
   */
  async registerWithPhone(data: {
    name: string;
    phone: string;
    password: string;
  }): Promise<void> {
    try {
      const normalizedPhone = normalizePhone(data.phone);
      const phoneDigits = normalizedPhone.replace(/[^0-9]/g, '');
      const tempEmail = `${phoneDigits}@temba.temp`;

      const response = await fetch(`${supabaseUrl}/functions/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          email: tempEmail,
          password: data.password,
          name: data.name,
          phone: normalizedPhone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to register' }));
        throw new Error(errorData.error || 'Échec de l\'inscription');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Échec de l\'inscription');
      }

      // Login after signup
      await this.login(normalizedPhone, data.password);
    } catch (error: any) {
      console.error('Erreur inscription:', error);
      throw new Error(error.message || 'Échec de l\'inscription');
    }
  }

  /**
   * Login with phone or email
   */
  async login(emailOrPhone: string, password: string) {
    try {
      let emailForAuth = emailOrPhone;

      // Detect if input is phone number
      const isPhone = /^[\d+\s\-\(\)]+$/.test(emailOrPhone) && emailOrPhone.replace(/\D/g, '').length >= 7;

      if (isPhone) {
        // Construct temporary email from phone
        const normalizedPhone = normalizePhone(emailOrPhone);
        const phoneDigits = normalizedPhone.replace(/[^0-9]/g, '');
        emailForAuth = `${phoneDigits}@temba.temp`;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailForAuth,
        password,
      });

      if (error) throw error;

      return {
        user: data.user,
        session: data.session,
      };
    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      throw new Error(error.message || 'Échec de la connexion');
    }
  }
}

export const authService = new AuthService();
```

### Step 3: Signup Screen (React Native Example)

```typescript
// screens/SignUpScreen.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { authService } from '../services/authService';
import { normalizePhone, isValidPhone } from '../utils/phoneValidation';

export default function SignUpScreen() {
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'phone' | 'otp' | 'form'>('phone');
  const [loading, setLoading] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const handleSendOTP = async () => {
    if (!isValidPhone(phone)) {
      Alert.alert('Erreur', 'Format de numéro de téléphone invalide');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.sendOTP(phone);
      if (result.success) {
        setStep('otp');
        Alert.alert('Succès', 'Code de vérification envoyé par SMS !');
      } else {
        Alert.alert('Erreur', result.error || 'Échec de l\'envoi du code');
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Échec de l\'envoi du code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      Alert.alert('Erreur', 'Le code doit contenir 6 chiffres');
      return;
    }

    setLoading(true);
    try {
      const isValid = await authService.verifyOTP(phone, otpCode);
      if (isValid) {
        setOtpVerified(true);
        setStep('form');
        Alert.alert('Succès', 'Code vérifié avec succès !');
      } else {
        Alert.alert('Erreur', 'Code invalide. Veuillez réessayer.');
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Échec de la vérification');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!name.trim() || !password.trim() || password.length < 8) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs. Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setLoading(true);
    try {
      await authService.registerWithPhone({
        name: name.trim(),
        phone,
        password,
      });
      Alert.alert('Succès', 'Compte créé avec succès !');
      // Navigate to home/dashboard
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Échec de la création du compte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      {step === 'phone' && (
        <>
          <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
            Inscription
          </Text>
          
          <TextInput
            placeholder="Numéro de téléphone (+22675581026)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={{ borderWidth: 1, padding: 12, marginBottom: 20, borderRadius: 8 }}
          />

          <TouchableOpacity
            onPress={handleSendOTP}
            disabled={loading}
            style={{ backgroundColor: '#f97316', padding: 15, borderRadius: 8 }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
                Envoyer le code
              </Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {step === 'otp' && (
        <>
          <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
            Vérification
          </Text>
          
          <Text style={{ marginBottom: 10 }}>
            Code envoyé à {phone}
          </Text>

          <TextInput
            placeholder="Code de vérification (6 chiffres)"
            value={otpCode}
            onChangeText={setOtpCode}
            keyboardType="number-pad"
            maxLength={6}
            style={{ borderWidth: 1, padding: 12, marginBottom: 20, borderRadius: 8 }}
          />

          <TouchableOpacity
            onPress={handleVerifyOTP}
            disabled={loading}
            style={{ backgroundColor: '#f97316', padding: 15, borderRadius: 8, marginBottom: 10 }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
                Vérifier
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setStep('phone')}>
            <Text style={{ textAlign: 'center', color: '#666' }}>
              Changer le numéro
            </Text>
          </TouchableOpacity>
        </>
      )}

      {step === 'form' && (
        <>
          <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
            Compléter votre profil
          </Text>

          <TextInput
            placeholder="Nom complet"
            value={name}
            onChangeText={setName}
            style={{ borderWidth: 1, padding: 12, marginBottom: 15, borderRadius: 8 }}
          />

          <TextInput
            placeholder="Mot de passe (min. 8 caractères)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={{ borderWidth: 1, padding: 12, marginBottom: 20, borderRadius: 8 }}
          />

          <TouchableOpacity
            onPress={handleSignup}
            disabled={loading}
            style={{ backgroundColor: '#f97316', padding: 15, borderRadius: 8 }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
                Créer le compte
              </Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
```

### Step 4: Login Screen (React Native Example)

```typescript
// screens/LoginScreen.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { authService } from '../services/authService';
import { detectInputType } from '../utils/phoneValidation';

export default function LoginScreen() {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!emailOrPhone.trim() || !password.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      await authService.login(emailOrPhone, password);
      Alert.alert('Succès', 'Connexion réussie !');
      // Navigate to home/dashboard
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Échec de la connexion');
    } finally {
      setLoading(false);
    }
  };

  const inputType = detectInputType(emailOrPhone);
  const isPhone = inputType === 'phone';

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Connexion
      </Text>

      <Text style={{ marginBottom: 5 }}>
        {isPhone ? '📱 Téléphone' : isPhone === false ? '📧 Email' : 'Email ou téléphone'}
      </Text>

      <TextInput
        placeholder={isPhone ? "+226 75 58 10 26" : "nom@exemple.com"}
        value={emailOrPhone}
        onChangeText={setEmailOrPhone}
        keyboardType={isPhone ? "phone-pad" : "email-address"}
        autoCapitalize="none"
        style={{ borderWidth: 1, padding: 12, marginBottom: 15, borderRadius: 8 }}
      />

      <TextInput
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, padding: 12, marginBottom: 20, borderRadius: 8 }}
      />

      <TouchableOpacity
        onPress={handleLogin}
        disabled={loading}
        style={{ backgroundColor: '#f97316', padding: 15, borderRadius: 8 }}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            Se connecter
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
```

---

## Code Examples

### Complete Mobile Implementation (React Native)

**File Structure**:
```
mobile-app/
├── services/
│   └── authService.ts
├── utils/
│   └── phoneValidation.ts
├── screens/
│   ├── SignUpScreen.tsx
│   └── LoginScreen.tsx
└── App.tsx
```

### Key Implementation Details

1. **Phone Normalization**: Always normalize to E.164 before API calls
2. **OTP Flow**: Send → Verify → Signup (must verify before signup)
3. **Temporary Email**: Construct `{phoneDigits}@temba.temp` for phone login
4. **Error Handling**: Show user-friendly French error messages
5. **Loading States**: Show loading indicators during API calls

---

## Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid phone number format` | Phone not in E.164 | Normalize phone before sending |
| `OTP code not found or expired` | Code expired (>10 min) | Request new OTP |
| `OTP code has already been used` | Code verified twice | Request new OTP |
| `Too many verification attempts` | 5+ failed attempts | Request new OTP |
| `Failed to send SMS` | Twilio error | Check Twilio config, phone number |
| `A user with this email already exists` | Phone already registered | User should login instead |

### Error Handling Pattern

```typescript
try {
  const result = await authService.sendOTP(phone);
  // Handle success
} catch (error: any) {
  // Parse error message
  const errorMessage = error.message || 'Une erreur est survenue';
  
  // Show user-friendly message
  Alert.alert('Erreur', errorMessage);
  
  // Log for debugging
  console.error('OTP send error:', error);
}
```

---

## Security Considerations

### ✅ Implemented Security Measures

1. **OTP Expiration**: 10 minutes
2. **Attempt Limiting**: Max 5 attempts per OTP
3. **One-Time Use**: OTP marked as verified after use
4. **Phone Normalization**: Prevents format-based attacks
5. **Database RLS**: Only service role can access OTP codes
6. **Rate Limiting**: Consider implementing on Edge Functions

### 🔒 Recommended Additional Security

1. **Rate Limiting**: Limit OTP requests per phone number (e.g., 3 per hour)
2. **IP-based Limiting**: Prevent abuse from same IP
3. **SMS Delivery Tracking**: Monitor Twilio delivery status
4. **OTP Cleanup**: Periodic cleanup of expired OTPs (function exists)
5. **Password Requirements**: Enforce strong passwords (min 8 chars implemented)

---

## Testing Checklist

### Signup Flow
- [ ] Phone number normalization works
- [ ] OTP sent successfully
- [ ] OTP received via SMS
- [ ] OTP verification works
- [ ] Account creation succeeds
- [ ] User logged in after signup
- [ ] Profile shows correct name (not phone digits)

### Login Flow
- [ ] Phone number login works
- [ ] Temporary email construction correct
- [ ] Password authentication works
- [ ] Profile loads correctly

### Error Cases
- [ ] Invalid phone format handled
- [ ] Expired OTP handled
- [ ] Wrong OTP code handled
- [ ] Too many attempts handled
- [ ] Already registered phone handled

### Edge Cases
- [ ] Different phone formats (with/without +, spaces, etc.)
- [ ] International numbers (US, France, etc.)
- [ ] Resend OTP functionality
- [ ] Change phone number during signup

---

## API Request/Response Examples

### Send OTP Request
```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-otp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"phone": "+22675581026"}'
```

### Verify OTP Request
```bash
curl -X POST https://your-project.supabase.co/functions/v1/verify-otp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"phone": "+22675581026", "code": "123456"}'
```

### Signup Request
```bash
curl -X POST https://your-project.supabase.co/functions/v1/signup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{
    "email": "22675581026@temba.temp",
    "password": "mypassword123",
    "name": "John Doe",
    "phone": "+22675581026"
  }'
```

---

## Summary

### Key Points for Mobile Implementation

1. **Use existing Edge Functions**: No need to rewrite backend
2. **Phone normalization is critical**: Always normalize before API calls
3. **OTP flow**: Send → Verify → Signup (must verify before signup)
4. **Temporary email**: Construct `{phoneDigits}@temba.temp` for phone login
5. **Error handling**: Show user-friendly messages in French
6. **Loading states**: Provide visual feedback during API calls

### Quick Start Checklist

- [ ] Install Supabase client library
- [ ] Create phone validation utility
- [ ] Create auth service with API calls
- [ ] Implement signup screen (phone → OTP → form)
- [ ] Implement login screen (phone/email)
- [ ] Test with real phone numbers
- [ ] Handle errors gracefully
- [ ] Add loading indicators

The backend is production-ready and can be used directly from your mobile app!

