# Email Update Impact Analysis

## Current Architecture

### ✅ **SAFE TO UPDATE** - The architecture uses UUID-based relationships

The application uses **`user_id` (UUID)** as the primary identifier across all tables, NOT email. This means email updates are **generally safe** and won't break relationships.

### Database Relationships (All use `user_id`, not email)

```sql
-- All these use user_id (UUID), not email:
- profiles.user_id → auth.users.id
- orders.user_id → auth.users.id  
- tickets.user_id → auth.users.id
- notifications.user_id → auth.users.id
- ticket_transfers.sender_id → auth.users.id
- ticket_transfers.recipient_id → auth.users.id
```

## Impact Analysis

### ✅ **1. Authentication & Login** - SAFE

**Current State:**
- Phone signup creates temp email: `{phoneDigits}@temba.temp`
- Login works with both:
  - Phone → constructs temp email → authenticates
  - Email → authenticates directly

**After Email Update:**
- ✅ User can still login with phone (logic constructs temp email)
- ✅ User can login with new email
- ⚠️ **CRITICAL**: User can NO LONGER login with old temp email
- ⚠️ **CRITICAL**: User must remember their new email or phone

**Recommendation:** 
- Warn user before updating: "You'll need to use this new email to login"
- Consider allowing phone + password login even after email update

### ✅ **2. Orders & Tickets** - SAFE

**Current State:**
- Orders linked by `user_id` (UUID)
- Tickets linked by `user_id` (UUID)

**After Email Update:**
- ✅ All existing orders remain accessible
- ✅ All existing tickets remain accessible
- ✅ No data loss or broken relationships

### ⚠️ **3. Guest Order Linking** - POTENTIAL ISSUE

**Current State:**
- Guest orders created with `guest_email`
- Function `link_guest_orders_on_signup()` links orders by email match:

```sql
UPDATE orders
SET user_id = NEW.id
WHERE guest_email = NEW.email;
```

**After Email Update (BEFORE Signup):**
- ⚠️ If user updates email in profile before linking guest orders, the match will fail
- ⚠️ Guest orders won't be automatically linked if email doesn't match

**After Email Update (AFTER Signup):**
- ✅ Already linked by `user_id`, so email change doesn't matter

**Recommendation:**
- Prevent email updates until all guest orders are linked
- OR: Update guest order linking to also check phone number
- OR: Show warning if user has pending guest orders

### ✅ **4. Notifications** - SAFE (but check email delivery)

**Current State:**
- Notifications linked by `user_id` (UUID)
- Email notifications sent to `profiles.email` or `auth.users.email`

**After Email Update:**
- ✅ Notification history remains (linked by `user_id`)
- ✅ Future notifications will use new email
- ⚠️ Old email notifications won't be delivered

### ✅ **5. Profile Display** - SAFE

**Current State:**
- Profile displays name, phone, email
- Falls back to phone/email prefix if name missing

**After Email Update:**
- ✅ Display logic uses `profile.email` which will update
- ✅ No visual breaking

### ⚠️ **6. Ticket Transfers** - MOSTLY SAFE

**Current State:**
- Transfers linked by `sender_id` and `recipient_id` (UUIDs)
- Transfer requests can use email for non-registered users

**After Email Update:**
- ✅ Existing transfers remain valid (linked by UUID)
- ⚠️ If pending transfer uses old email, recipient lookup might fail
- ⚠️ New transfers will use new email (good)

### ⚠️ **7. Payment Records** - NEED TO VERIFY

**Current State:**
- Payments might store email for receipts/invoices
- Check `payments` table structure

**After Email Update:**
- ⚠️ Historical payment receipts might have old email
- ✅ Future payments will use new email

**Recommendation:**
- Check if payments table stores email separately
- Consider updating email in payment records if stored

## Implementation Recommendations

### Option A: **Simple Email Update** (Current Approach)

```typescript
// In ProfileInfo component
const handleEmailUpdate = async (newEmail: string) => {
  // 1. Update Supabase Auth email
  await supabase.auth.updateUser({ email: newEmail });
  
  // 2. Update profile email
  await supabase
    .from('profiles')
    .update({ email: newEmail })
    .eq('user_id', user.id);
  
  // 3. Verify email (Supabase requires verification)
  // User will receive verification email
}
```

**Pros:**
- Simple implementation
- Supabase handles email verification
- Maintains data integrity

**Cons:**
- User must verify new email before it's active
- Cannot use new email for login until verified
- Old email still works until verified

### Option B: **Email Update with Guest Order Check** (Recommended)

```typescript
const handleEmailUpdate = async (newEmail: string) => {
  // 1. Check for pending guest orders
  const { data: guestOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('guest_email', profile.email)
    .is('user_id', null);
  
  if (guestOrders && guestOrders.length > 0) {
    // Warn user about unlinked orders
    toast.warning(`Vous avez ${guestOrders.length} commande(s) en attente. 
                  Mettez à jour votre email après avoir terminé ces commandes.`);
    return;
  }
  
  // 2. Proceed with email update
  // ... (same as Option A)
}
```

### Option C: **Dual Email Support** (Advanced)

Allow users to have:
- **Primary Email**: For login (can be updated)
- **Notification Email**: Optional secondary email for notifications
- **Phone**: Always available for login

**Pros:**
- Users can keep old email for notifications
- More flexible

**Cons:**
- More complex implementation
- Requires schema changes

## Critical Considerations

### 🔴 **1. Email Verification Required**

Supabase requires email verification before the new email becomes active:
- User receives verification email at new address
- Old email remains active until verified
- User should be informed of this requirement

### 🔴 **2. Login Method After Update**

After updating email:
- ✅ Phone login still works (constructs temp email: `{phoneDigits}@temba.temp`)
- ✅ New email login works (after verification)
- ❌ Old temp email login fails (if email was verified)

**Solution:** Always allow phone login as backup

### 🔴 **3. Guest Orders Linking**

If user has guest orders with old email:
- Guest orders won't auto-link if email changes before signup
- Need to link manually or use phone matching

**Solution:** 
```sql
-- Enhanced guest order linking (check phone too)
UPDATE orders o
SET user_id = NEW.id
FROM profiles p
WHERE p.user_id = NEW.id
AND (
  o.guest_email = NEW.email 
  OR o.guest_email = p.email
  OR (o.guest_phone = p.phone AND o.guest_phone IS NOT NULL)
);
```

## Recommended Implementation

### Step 1: Check for Pending Guest Orders

```typescript
const hasPendingGuestOrders = async (currentEmail: string): Promise<boolean> => {
  const { data } = await supabase
    .from('orders')
    .select('id')
    .eq('guest_email', currentEmail)
    .is('user_id', null)
    .limit(1);
  
  return (data && data.length > 0);
};
```

### Step 2: Update Email with Validation

```typescript
const updateEmail = async (newEmail: string) => {
  // Validate new email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    throw new Error('Format d\'email invalide');
  }
  
  // Check if email already exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('email', newEmail)
    .neq('user_id', user.id)
    .single();
  
  if (existing) {
    throw new Error('Cette adresse email est déjà utilisée');
  }
  
  // Update Supabase Auth email (triggers verification)
  const { error: authError } = await supabase.auth.updateUser({
    email: newEmail
  });
  
  if (authError) throw authError;
  
  // Update profile email (will sync via trigger or manual update)
  await supabase
    .from('profiles')
    .update({ email: newEmail, updated_at: new Date().toISOString() })
    .eq('user_id', user.id);
  
  toast.success('Email mis à jour. Vérifiez votre nouvelle adresse email.');
};
```

### Step 3: Enhanced Guest Order Linking (Migration)

```sql
-- Migration: Improve guest order linking
CREATE OR REPLACE FUNCTION link_guest_orders_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Link by email OR phone
  UPDATE orders o
  SET user_id = NEW.id, updated_at = NOW()
  FROM profiles p
  WHERE p.user_id = NEW.id
  AND o.user_id IS NULL
  AND (
    o.guest_email = NEW.email 
    OR o.guest_email = p.email
    OR (o.guest_phone IS NOT NULL AND p.phone IS NOT NULL AND o.guest_phone = p.phone)
  );

  -- Update tickets for linked orders
  UPDATE tickets t
  SET user_id = NEW.id
  WHERE t.user_id IS NULL
  AND t.order_id IN (
    SELECT id FROM orders WHERE user_id = NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Summary

### ✅ **SAFE TO IMPLEMENT**

**Low Risk:**
- Orders & Tickets (UUID-based)
- Notifications (UUID-based)
- Profile display
- Ticket transfers (UUID-based)

**Medium Risk (with fixes):**
- Guest order linking (enhance with phone matching)
- Payment records (check if email stored)

**High Risk (handle carefully):**
- Email verification requirement
- Login method after update

### 🎯 **Recommendation**

1. ✅ **Implement email update** - Architecture supports it
2. ✅ **Add guest order check** - Warn if pending orders
3. ✅ **Enhance guest linking** - Use phone matching too
4. ✅ **Always allow phone login** - Backup authentication method
5. ✅ **Email verification flow** - Follow Supabase's verification process

The architecture is well-designed for email updates. The main considerations are around guest orders and login methods, which can be handled with the recommendations above.

