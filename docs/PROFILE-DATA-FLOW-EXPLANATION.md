# Profile Data Flow Explanation
## How User Information is Fetched and Displayed After Phone Signup

---

## Overview

When a user signs up with a phone number, the system creates a profile with the actual name (not phone digits) and then automatically loads this profile to display throughout the application.

---

## Complete Data Flow

### Step 1: User Signup (Phone Number)

**User Input**:
- Name: "John Doe"
- Phone: "+22675581026"
- Password: "userpassword123"

**What Happens**:
1. User completes signup form
2. Frontend calls `authService.registerWithPhone()`
3. Temporary email is constructed: `22675581026@temba.temp`
4. Signup Edge Function is called

### Step 2: Backend Account Creation

**Location**: `supabase/functions/signup/index.ts`

```typescript
// Creates Supabase Auth user
const { data: authData } = await supabase.auth.admin.createUser({
  email: "22675581026@temba.temp",  // Temporary email
  password: "userpassword123",
  email_confirm: true,
  user_metadata: {
    name: "John Doe",              // ✅ Actual name stored here
    phone: "+22675581026"
  }
});

// Creates profile record
await supabase
  .from('profiles')
  .upsert({
    user_id: authData.user.id,
    name: "John Doe",              // ✅ Actual name (not phone digits)
    email: "22675581026@temba.temp",  // Temporary email
    phone: "+22675581026",         // ✅ Normalized phone
    phone_verified: true,          // ✅ Marked as verified
    ...
  });
```

**Key Points**:
- ✅ `name` field stores the actual name provided by user
- ✅ `phone` field stores normalized phone (+22675581026)
- ✅ `email` field stores temporary email (for Supabase Auth)
- ✅ Profile is created with correct data from the start

### Step 3: Automatic Profile Loading

**Location**: `src/context/AuthContext.tsx`

After signup, Supabase Auth creates a session. The `AuthContext` automatically detects this:

```typescript
// Listen for auth state changes
supabase.auth.onAuthStateChange((_event, session) => {
  setUser(session?.user ?? null);
  if (session?.user) {
    loadProfile(session.user.id);  // ✅ Automatically loads profile
  }
});
```

**Profile Loading Function**:
```typescript
const loadProfile = async (userId: string) => {
  try {
    // Fetch profile from database
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)  // Query by user_id (UUID)
      .single();

    if (error) throw error;
    setProfile(data);  // ✅ Profile stored in context state
    
    // Check for pending transfers
    await checkPendingTransfers();
  } catch (error) {
    console.error('Erreur lors du chargement du profil:', error);
    setProfile(null);
  } finally {
    setLoading(false);
  }
};
```

**What Gets Loaded**:
```typescript
profile = {
  id: "uuid",
  user_id: "auth-user-uuid",
  name: "John Doe",                    // ✅ Actual name
  email: "22675581026@temba.temp",    // Temporary email
  phone: "+22675581026",               // ✅ Normalized phone
  phone_verified: true,
  role: "USER",
  status: "ACTIVE",
  ...
}
```

### Step 4: Display Logic in UI Components

**Location**: `src/pages/Profile.tsx` and `src/pages/Dashboard.tsx`

The frontend uses smart display logic to prioritize the correct information:

```typescript
// Profile.tsx - Display Name Logic
const displayName = profile?.name ||                    // ✅ 1. Actual name
                   (profile?.phone ? formatPhoneForDisplay(profile.phone) : null) ||  // 2. Phone if no name
                   profile?.email?.split('@')[0] ||      // 3. Email prefix (phone digits)
                   user?.email?.split('@')[0] ||         // 4. Fallback
                   'Utilisateur';                        // 5. Default

// Display Identifier (phone or email)
const displayIdentifier = profile?.phone 
  ? formatPhoneForDisplay(profile.phone)  // ✅ Shows: "+226 75 58 10 26"
  : (profile?.email || user?.email || ''); // Fallback to email

// Avatar Initial
const avatarInitial = profile?.name?.[0]?.toUpperCase() ||  // ✅ "J" from "John Doe"
                      profile?.phone?.[1]?.toUpperCase() ||  // Second char of phone (skip +)
                      displayIdentifier[0]?.toUpperCase() || 
                      'U';
```

**Result in UI**:
- **Main heading**: "John Doe" (from `profile.name`)
- **Secondary line**: "+226 75 58 10 26" (from `profile.phone`, formatted)
- **Avatar**: "J" (first letter of name)

---

## Database Query Flow

### Profile Fetch Query

```sql
SELECT *
FROM profiles
WHERE user_id = 'auth-user-uuid'
LIMIT 1;
```

**Returns**:
```json
{
  "id": "profile-uuid",
  "user_id": "auth-user-uuid",
  "name": "John Doe",
  "email": "22675581026@temba.temp",
  "phone": "+22675581026",
  "phone_verified": true,
  "role": "USER",
  "status": "ACTIVE",
  "created_at": "2025-02-01T10:00:00Z",
  "updated_at": "2025-02-01T10:00:00Z"
}
```

---

## Why This Works

### ✅ Correct Data Storage

**During Signup**:
```typescript
// signup/index.ts - Line 156
name,  // Always use the provided name, never fallback to email prefix
```

The signup Edge Function explicitly uses the `name` parameter from the request, ensuring:
- ✅ Actual name is stored (not phone digits)
- ✅ Phone is normalized to E.164 format
- ✅ Profile is created immediately after auth user creation

### ✅ Automatic Profile Loading

**AuthContext automatically loads profile**:
- When user signs up → Auth state changes → Profile loaded
- When user logs in → Auth state changes → Profile loaded
- When app loads → Checks existing session → Profile loaded

**No manual profile fetch needed** - it's automatic!

### ✅ Smart Display Logic

**Frontend prioritizes**:
1. `profile.name` (actual name)
2. `profile.phone` (formatted for display)
3. Email prefix (fallback)

This ensures the user always sees their actual name, not phone digits.

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ USER SIGNS UP WITH PHONE                                │
│ Input: name="John Doe", phone="+22675581026"           │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ SIGNUP EDGE FUNCTION                                     │
│ 1. Creates Supabase Auth user                           │
│    email: "22675581026@temba.temp"                      │
│                                                          │
│ 2. Creates Profile record                                │
│    name: "John Doe" ✅                                  │
│    phone: "+22675581026" ✅                             │
│    email: "22675581026@temba.temp"                      │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ SUPABASE AUTH SESSION CREATED                           │
│ Session token returned to frontend                      │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ AUTHCONTEXT DETECTS AUTH STATE CHANGE                   │
│ onAuthStateChange() triggered                            │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ AUTOMATIC PROFILE LOADING                                │
│ loadProfile(userId) called                               │
│                                                          │
│ Query: SELECT * FROM profiles WHERE user_id = userId     │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ PROFILE DATA STORED IN CONTEXT                           │
│ profile = {                                              │
│   name: "John Doe", ✅                                  │
│   phone: "+22675581026", ✅                             │
│   email: "22675581026@temba.temp"                       │
│ }                                                        │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ UI COMPONENTS DISPLAY PROFILE                            │
│                                                          │
│ Profile Page:                                            │
│   Heading: "John Doe" (from profile.name)                │
│   Subtitle: "+226 75 58 10 26" (from profile.phone)     │
│                                                          │
│ Dashboard:                                               │
│   Welcome: "Bienvenue, John Doe !" (from profile.name)  │
└─────────────────────────────────────────────────────────┘
```

---

## Key Implementation Details

### 1. Profile Creation During Signup

**Critical Code** (`supabase/functions/signup/index.ts:156`):
```typescript
name,  // Always use the provided name, never fallback to email prefix
```

This ensures the profile stores the actual name, not phone digits.

### 2. Automatic Profile Loading

**Location**: `src/context/AuthContext.tsx:60-68`

```typescript
supabase.auth.onAuthStateChange((_event, session) => {
  setUser(session?.user ?? null);
  if (session?.user) {
    loadProfile(session.user.id);  // ✅ Automatic
  }
});
```

**When it triggers**:
- After signup
- After login
- On app load (if session exists)
- On token refresh

### 3. Profile Query

**Location**: `src/context/AuthContext.tsx:76-82`

```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', userId)  // Query by UUID, not email
  .single();
```

**Why it works**:
- Uses `user_id` (UUID) - not dependent on email
- Works for both email and phone signups
- Returns complete profile data

### 4. Display Priority Logic

**Location**: `src/pages/Profile.tsx:23-36`

```typescript
// Priority order:
1. profile?.name                    // ✅ Actual name (highest priority)
2. profile?.phone (formatted)       // Phone number (if no name)
3. profile?.email?.split('@')[0]    // Email prefix (phone digits)
4. user?.email?.split('@')[0]       // Fallback
5. 'Utilisateur'                     // Default
```

**Result**: User always sees their actual name, never phone digits.

---

## Mobile App Implementation

### How to Fetch Profile in Mobile App

```typescript
// After signup/login, fetch profile
const fetchProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;  // Contains: name, phone, email, etc.
};
```

### Display Logic for Mobile

```typescript
const displayName = profile?.name ||                    // ✅ Actual name
                   (profile?.phone ? formatPhone(profile.phone) : null) ||
                   'Utilisateur';

const displayIdentifier = profile?.phone 
  ? formatPhoneForDisplay(profile.phone)
  : profile?.email || '';
```

---

## Common Issues and Solutions

### Issue 1: Profile shows phone digits instead of name

**Cause**: Profile was created with phone digits as name (old bug)

**Solution**: Run migration `20250201000001_fix_phone_signup_profiles.sql` to fix existing data

### Issue 2: Profile not loading after signup

**Cause**: AuthContext not detecting auth state change

**Solution**: Ensure `onAuthStateChange` is properly set up in AuthContext

### Issue 3: Profile is null

**Cause**: Profile query failed or profile doesn't exist

**Solution**: 
- Check RLS policies allow profile read
- Verify profile was created during signup
- Check browser console for errors

---

## Summary

### ✅ How It Works

1. **During Signup**: Profile created with actual name and phone
2. **After Signup**: AuthContext automatically loads profile via `user_id`
3. **Display**: Frontend prioritizes `profile.name` over phone/email

### ✅ Key Points

- Profile is queried by `user_id` (UUID), not email
- Profile contains actual name, not phone digits
- Profile loading is automatic (no manual fetch needed)
- Display logic prioritizes name > phone > email

### ✅ For Mobile App

- Use same query: `SELECT * FROM profiles WHERE user_id = userId`
- Profile will contain correct name and phone
- Display logic same as web app

The system is designed to always show the user's actual name, not phone digits!

