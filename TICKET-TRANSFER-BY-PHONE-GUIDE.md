# How to Transfer Tickets via Phone Number

## Overview

Users can transfer tickets to other people using either email or phone number. When transferring via phone number, the system automatically sends an SMS notification to the recipient.

---

## User Flow: Transferring a Ticket by Phone

### Step 1: Open Transfer Modal
1. Go to **"Mes Billets"** (My Tickets) in your profile
2. Click on a ticket you want to transfer
3. Click **"Transférer le billet"** (Transfer Ticket) button
   - ⚠️ **Note:** Free tickets cannot be transferred

### Step 2: Select Phone Transfer Method
1. In the transfer modal, you'll see two options:
   - **Email** 📧
   - **Phone** 📱
2. Click on the **"Phone"** button to select phone transfer

### Step 3: Enter Recipient Details
1. **Phone Number** (Required):
   - Enter the recipient's phone number
   - Format: `+226 70 12 34 56` or `+22670123456`
   - The system automatically normalizes the format
   - Must be in E.164 format (with country code)

2. **Recipient Name** (Optional):
   - Enter the recipient's name
   - This will be included in the SMS notification

3. **Message** (Optional):
   - Add a personal message
   - This will be included in the transfer notification

### Step 4: Confirm Transfer
1. Click **"Transférer le billet"** button
2. Review the confirmation screen
3. Click **"Confirmer le transfert"** to complete

---

## What Happens After Transfer

### For Registered Users (with Temba account)
1. ✅ **Instant Transfer**: Ticket is immediately transferred to their account
2. 📱 **SMS Notification**: They receive an SMS with:
   - Sender's name
   - Event title
   - Event date and time
   - Link to view ticket in their account
3. 🔔 **In-App Notification**: They also receive an in-app notification
4. 🎫 **Ticket Available**: Ticket appears in their "Mes Billets" immediately

**SMS Message Example:**
```
🎫 [Sender Name] vous a transféré un billet pour "[Event Title]" (ven. 19 déc. à 19:00). Connectez-vous si vous avez un compte, ou inscrivez-vous avec le même numéro pour récupérer votre billet : https://tembas.com/signup
```

### For Unregistered Users (no Temba account)
1. ⏳ **Pending Transfer**: Ticket transfer is saved but not yet assigned
2. 📱 **SMS Notification**: They receive an SMS with:
   - Sender's name
   - Event title
   - Event date and time
   - Signup link with instructions
3. 🔐 **Auto-Assignment**: When they sign up with the same phone number, the ticket is automatically assigned to their account

**SMS Message Example:**
```
🎫 [Sender Name] vous a transféré un billet pour "[Event Title]" (ven. 19 déc. à 19:00). Connectez-vous si vous avez un compte, ou inscrivez-vous avec le même numéro pour récupérer votre billet : https://tembas.com/signup
```

---

## Technical Details

### Phone Number Format
- **Required Format**: E.164 format with country code
- **Example**: `+22670123456` (Burkina Faso)
- **Normalization**: System automatically:
  - Removes spaces
  - Adds `+` prefix if missing
  - Validates format

### Transfer Process
1. **Validation**: Phone number is validated before transfer
2. **Lookup**: System checks if recipient has a Temba account
3. **Transfer Record**: Created in `ticket_transfers` table with:
   - `recipient_phone`: Normalized phone number
   - `status`: `PENDING` or `COMPLETED`
4. **SMS Sending**: Automatic SMS via Twilio (non-blocking)
5. **Ticket Assignment**: 
   - Immediate for registered users
   - On signup for unregistered users

### SMS Configuration
The system uses Twilio for SMS notifications. Required environment variables:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

---

## Code Implementation

### Frontend Component
**File:** `src/components/tickets/TransferTicketModal.tsx`

**Key Features:**
- Phone/Email method selection
- Phone number input with validation
- Normalization using `normalizePhone()` utility
- Confirmation step before transfer

**Phone Input:**
```typescript
<input
  type="tel"
  value={formData.recipientPhone}
  onChange={(e) => handleInputChange('recipientPhone', e.target.value)}
  placeholder="+226 70 12 34 56"
/>
```

### Backend Function
**File:** `supabase/functions/transfer-ticket/index.ts`

**Key Features:**
- Phone number normalization
- Recipient lookup by phone
- SMS notification sending
- Support for registered and unregistered users

**Phone Lookup:**
```typescript
if (recipientPhone) {
  const normalizedPhone = recipientPhone.replace(/\s/g, '').startsWith('+') 
    ? recipientPhone.replace(/\s/g, '')
    : '+' + recipientPhone.replace(/\s/g, '')
  
  // Lookup user by phone
  const { data: recipientUser } = await supabase
    .from('profiles')
    .select('user_id, name, phone')
    .eq('phone', normalizedPhone)
    .single()
}
```

### SMS Sending Function
**Location:** `supabase/functions/transfer-ticket/index.ts`

**Function:** `sendTransferSMS()`

**Features:**
- Automatic SMS sending when phone number is provided
- Non-blocking (transfer succeeds even if SMS fails)
- Includes event details and signup link
- Works for both registered and unregistered users

---

## User Experience

### Visual Flow

```
1. User clicks "Transférer le billet"
   ↓
2. Modal opens with Email/Phone options
   ↓
3. User selects "Phone" method
   ↓
4. User enters phone number (+226 70 12 34 56)
   ↓
5. User optionally adds name and message
   ↓
6. User clicks "Transférer le billet"
   ↓
7. Confirmation screen appears
   ↓
8. User confirms transfer
   ↓
9. Transfer completes
   ↓
10. SMS sent to recipient
```

### Success Messages

**For Registered Users:**
- ✅ "Billet transféré avec succès!" (Ticket transferred successfully!)

**For Unregistered Users:**
- ✅ "Transfert en attente - le destinataire recevra le billet lors de son inscription!" (Transfer pending - recipient will receive ticket upon signup!)

---

## Important Notes

### ✅ What Works
- Transfer to registered users (instant)
- Transfer to unregistered users (pending until signup)
- SMS notifications for both cases
- Phone number normalization
- Automatic ticket assignment on signup

### ⚠️ Restrictions
- **Free tickets cannot be transferred** (by design)
- **Scanned tickets cannot be transferred**
- **Already transferred tickets cannot be re-transferred**
- Phone number must be in valid E.164 format

### 🔒 Security
- Transfer validation at API level
- Phone number normalization prevents duplicates
- SMS sending is non-blocking (doesn't fail transfer if SMS fails)
- Transfer records are tracked in database

---

## Troubleshooting

### Phone Number Not Working
- **Check format**: Must include country code (e.g., `+226` for Burkina Faso)
- **Check normalization**: System automatically normalizes, but ensure you enter a valid number
- **Check validation**: Invalid numbers will show error message

### SMS Not Received
- **Check Twilio configuration**: Ensure environment variables are set
- **Check phone number**: Must be valid and able to receive SMS
- **Non-blocking**: Transfer still succeeds even if SMS fails

### Ticket Not Appearing for Recipient
- **Registered users**: Should appear immediately in "Mes Billets"
- **Unregistered users**: Must sign up with the same phone number
- **Check transfer status**: Should be `COMPLETED` for registered users, `PENDING` for unregistered

---

## Example Scenarios

### Scenario 1: Transfer to Registered User
1. User A transfers ticket to `+22670123456`
2. User B has account with phone `+22670123456`
3. ✅ Ticket immediately transferred to User B
4. 📱 User B receives SMS notification
5. 🎫 Ticket appears in User B's "Mes Billets"

### Scenario 2: Transfer to Unregistered User
1. User A transfers ticket to `+22675581026`
2. No account exists with this phone number
3. ⏳ Transfer saved as `PENDING`
4. 📱 SMS sent to `+22675581026` with signup instructions
5. User signs up with `+22675581026`
6. ✅ Ticket automatically assigned to new account
7. 🎫 Ticket appears in new user's "Mes Billets"

---

## API Reference

### Transfer Ticket Request
```typescript
{
  ticketId: string;
  recipientPhone?: string;  // E.164 format: +22670123456
  recipientName?: string;
  message?: string;
}
```

### Transfer Ticket Response
```typescript
{
  success: boolean;
  transferId?: string;
  instantTransfer?: boolean;  // true if recipient has account
  error?: string;
}
```

---

## Related Documentation

- `TICKET-TRANSFER-SMS-NOTIFICATIONS.md` - SMS notification details
- `docs/UNREGISTERED-USER-FLOW.md` - Unregistered user handling
- `docs/MOBILE-TICKET-TRANSFER-GUIDE.md` - Mobile app integration

---

**Last Updated:** January 18, 2025

