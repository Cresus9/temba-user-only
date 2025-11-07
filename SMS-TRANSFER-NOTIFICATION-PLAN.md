# SMS Notification Plan for Ticket Transfers

## Overview
Send SMS notifications to recipients when tickets are transferred to them via phone number.

## Current State

### ✅ What Exists:
- Twilio SMS integration (in `send-otp` function)
- Transfer ticket function (`transfer-ticket/index.ts`)
- Phone number support in transfers
- Database stores `recipient_phone` in transfers

### ❌ What's Missing:
- SMS sending logic in transfer function
- Ticket transfer SMS templates
- Event/ticket details fetching for SMS content
- Error handling for SMS failures (shouldn't block transfer)

## Implementation Plan

### Step 1: Create Reusable SMS Helper Function

**Location**: Create `supabase/functions/_shared/sms-service.ts` (or add to existing function)

**Purpose**: Centralized SMS sending logic reusable across functions

**Functionality**:
```typescript
interface SendSMSOptions {
  to: string;           // Phone number in E.164 format
  message: string;      // SMS content
  from?: string;        // Optional sender number (default from env)
}

async function sendSMS(options: SendSMSOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}>
```

**Benefits**:
- Reusable across `send-otp` and `transfer-ticket`
- Consistent error handling
- Centralized Twilio configuration

### Step 2: Enhance Transfer Function to Fetch Event Details

**Location**: `supabase/functions/transfer-ticket/index.ts`

**Current Issue**: Notification code has TODO comment, doesn't fetch event details

**What to Add**:
1. Query event information before sending SMS:
   ```typescript
   const { data: ticketDetails } = await supabase
     .from('tickets')
     .select(`
       id,
       event_id,
       events:event_id (
         title,
         date,
         location
       ),
       ticket_types:ticket_type_id (
         name
       )
     `)
     .eq('id', ticketId)
     .single()
   ```

2. Get sender name from profile
3. Build SMS message with relevant details

### Step 3: SMS Message Templates

**For Registered Users** (Instant Transfer):
```
🎫 Temba: Vous avez reçu un billet!

De: {sender_name}
Événement: {event_title}
Date: {event_date}

Consultez vos billets dans l'app Temba.

Merci d'utiliser Temba! 🎉
```

**For Unregistered Users** (Pending Transfer):
```
🎫 Temba: Un billet vous attend!

Vous avez reçu un billet de {sender_name} pour:
{event_title}
Date: {event_date}

Créez un compte Temba pour recevoir votre billet:
{signup_url}

Merci d'utiliser Temba! 🎉
```

**Short Version** (if character limit):
```
🎫 Temba: Billet reçu de {sender_name} pour {event_title}. Ouvrez l'app pour voir.
```

### Step 4: Integration Points

#### A. In `transfer-ticket/index.ts`

**Location**: After transfer record is created (around line 274)

**Flow**:
1. ✅ Transfer created successfully
2. ✅ Ticket ownership transferred (if registered user)
3. **NEW**: Fetch event details
4. **NEW**: Send SMS if recipient_phone exists
5. ✅ Create in-app notification (existing)
6. ✅ Return success response

**Implementation**:
```typescript
// After transfer record creation
if (normalizedRecipientPhone) {
  try {
    // Fetch event details for SMS
    const { data: eventDetails } = await supabase
      .from('tickets')
      .select(`
        events:event_id (title, date, location),
        ticket_types:ticket_type_id (name)
      `)
      .eq('id', ticketId)
      .single()

    // Build SMS message
    const smsMessage = buildTransferSMS({
      senderName: sender?.name || 'Un utilisateur',
      eventTitle: eventDetails?.events?.title || 'un événement',
      eventDate: eventDetails?.events?.date || '',
      isRegistered: !!recipientUserId,
      signupUrl: 'https://tembas.com/signup'
    })

    // Send SMS
    const smsResult = await sendSMS({
      to: normalizedRecipientPhone,
      message: smsMessage
    })

    if (smsResult.success) {
      console.log('SMS sent successfully:', smsResult.messageId)
    } else {
      console.error('SMS failed (non-blocking):', smsResult.error)
      // Don't fail the transfer if SMS fails
    }
  } catch (smsError) {
    console.error('SMS error (non-blocking):', smsError)
    // Don't fail the transfer if SMS fails
  }
}
```

### Step 5: Handle Edge Cases

#### Scenario 1: Registered User (Has Account)
- ✅ Instant transfer
- ✅ Send SMS with app instructions
- ✅ In-app notification also created

#### Scenario 2: Unregistered User (No Account Yet)
- ✅ Pending transfer created
- ✅ Send SMS with signup invitation
- ✅ Ticket will be claimed on signup

#### Scenario 3: SMS Fails
- ⚠️ Don't fail the transfer (SMS is notification, not critical)
- ⚠️ Log error for monitoring
- ⚠️ Transfer still completes successfully

#### Scenario 4: Invalid Phone Number
- ⚠️ Validate phone format before sending
- ⚠️ Skip SMS if invalid (but transfer still works)

#### Scenario 5: Twilio Not Configured
- ⚠️ Check for Twilio credentials
- ⚠️ Skip SMS gracefully if missing
- ⚠️ Log warning (not error)

### Step 6: Message Length Optimization

**Twilio SMS Limits**:
- Single SMS: 160 characters (GSM-7)
- Multi-part SMS: 1600 characters (automatically split)
- Best practice: Keep under 160 chars for single message

**French Character Count** (considering special chars):
- Accented characters count as 2 characters in some encodings
- Plan for ~140-150 characters to be safe

**Strategy**:
1. Create full message (with all details)
2. If > 140 chars, create short version
3. Or split into multiple messages (use short version + URL)

### Step 7: Cost Considerations

**Twilio Pricing** (approximate):
- Burkina Faso: ~$0.08-0.15 per SMS
- US: ~$0.0075 per SMS

**Recommendations**:
1. Only send SMS for phone-based transfers (not email transfers)
2. Log all SMS sends for cost tracking
3. Consider rate limiting if volume is high
4. Option to disable SMS per user (future feature)

### Step 8: Testing Plan

#### Test Cases:

1. **Registered User Transfer**
   - ✅ User exists with phone number
   - ✅ Transfer succeeds
   - ✅ SMS sent with event details
   - ✅ In-app notification created

2. **Unregistered User Transfer**
   - ✅ Transfer to non-existent phone
   - ✅ Pending transfer created
   - ✅ SMS sent with signup link
   - ✅ Ticket claimed on signup

3. **SMS Failure Handling**
   - ✅ Invalid phone format (skip SMS)
   - ✅ Twilio API error (log, don't fail transfer)
   - ✅ Missing Twilio config (skip gracefully)

4. **Message Length**
   - ✅ Short event name (fits in one SMS)
   - ✅ Long event name (use short version)
   - ✅ French characters (proper encoding)

## Implementation Order

### Phase 1: Core SMS Integration (High Priority)
1. ✅ Create SMS helper function (extract from `send-otp`)
2. ✅ Add SMS sending to `transfer-ticket` function
3. ✅ Fetch event details for SMS content
4. ✅ Basic SMS message template

### Phase 2: Message Optimization (Medium Priority)
5. ✅ Message length handling
6. ✅ Short vs long message versions
7. ✅ Better event date formatting

### Phase 3: Enhanced Features (Low Priority)
8. ✅ SMS delivery status tracking (optional)
9. ✅ SMS preferences (opt-out per user)
10. ✅ SMS analytics/logging

## Code Structure

### File Organization:

```
supabase/functions/
├── _shared/
│   └── sms-service.ts          # NEW: Reusable SMS service
├── send-otp/
│   └── index.ts                # Update: Use shared SMS service
└── transfer-ticket/
    └── index.ts                # Update: Add SMS sending
```

### SMS Service Module:

```typescript
// supabase/functions/_shared/sms-service.ts

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
}

export async function sendSMS(
  to: string,
  message: string
): Promise<SMSResult> {
  // Implementation
}

export function normalizePhoneForSMS(phone: string): string {
  // Normalize to E.164 format
}

export function validatePhoneForSMS(phone: string): boolean {
  // Validate format
}
```

## Security Considerations

1. **Phone Number Privacy**
   - ✅ Only send to phone number provided in transfer
   - ✅ Don't log full phone numbers in errors
   - ✅ Use partial masking in logs: `+226****1026`

2. **SMS Spam Prevention**
   - ✅ Only send for actual transfers (verified in DB)
   - ✅ Rate limiting per phone number (future)
   - ✅ User opt-out mechanism (future)

3. **Error Handling**
   - ✅ Don't expose Twilio errors to users
   - ✅ Log errors internally for debugging
   - ✅ Generic error messages for users

## Monitoring & Analytics

**Metrics to Track**:
1. SMS send attempts
2. SMS success rate
3. SMS failures (by error type)
4. Cost per SMS
5. SMS delivery time

**Logging**:
```typescript
console.log('SMS Transfer Notification:', {
  transferId: transferData.id,
  recipientPhone: normalizedRecipientPhone?.substring(0, 7) + '****',
  eventTitle: eventDetails?.events?.title,
  messageLength: smsMessage.length,
  success: smsResult.success
})
```

## Next Steps

1. ✅ Review and approve plan
2. ✅ Create SMS service module
3. ✅ Integrate into transfer function
4. ✅ Test with real phone numbers
5. ✅ Deploy and monitor

## Questions to Consider

1. **Message Language**: Should SMS be in French only, or detect user language?
2. **Signup URL**: Use full URL or short link?
3. **Retry Logic**: Should we retry failed SMS? (probably not for non-critical notifications)
4. **Delivery Receipts**: Track SMS delivery status? (Twilio webhooks)
5. **Multi-ticket Transfers**: If multiple tickets transferred, send one SMS or multiple?

## Success Criteria

✅ SMS sent successfully when ticket transferred to phone number
✅ SMS includes relevant event details
✅ Transfer completes even if SMS fails
✅ Works for both registered and unregistered users
✅ Messages are clear and under character limit
✅ No impact on transfer performance

