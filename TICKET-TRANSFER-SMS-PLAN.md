# Ticket Transfer SMS Notification Plan

## Overview
Send SMS notifications to recipients when they receive a ticket transfer via phone number. This improves user experience by alerting users immediately when tickets are transferred to them.

## Current State

### ✅ Already Available
- Twilio SMS integration (used in `send-otp` function)
- Phone number normalization in transfer flow
- Transfer records store `recipient_phone`
- Event information accessible via ticket lookup

### ⚠️ Missing
- SMS sending logic in `transfer-ticket` function
- Event details retrieval for SMS content
- SMS message templates (French)
- Error handling for SMS failures (shouldn't block transfer)

## Implementation Plan

### Step 1: Create SMS Helper Function
**File**: `supabase/functions/transfer-ticket/index.ts`

Create a reusable function to send SMS via Twilio (reuse pattern from `send-otp`):

```typescript
async function sendSMS(phoneNumber: string, message: string): Promise<boolean> {
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.warn('Twilio configuration missing - skipping SMS')
    return false
  }

  // Normalize phone number
  const normalizedPhone = phoneNumber.replace(/\s/g, '').startsWith('+')
    ? phoneNumber.replace(/\s/g, '')
    : '+' + phoneNumber.replace(/\s/g, '')

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`
  const formData = new URLSearchParams()
  formData.append('To', normalizedPhone)
  formData.append('From', twilioPhoneNumber)
  formData.append('Body', message)

  try {
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Twilio SMS error:', errorText)
      return false
    }

    const data = await response.json()
    console.log('SMS sent successfully:', data.sid)
    return true
  } catch (error) {
    console.error('SMS sending error:', error)
    return false
  }
}
```

### Step 2: Get Event Information
**Location**: Before sending notifications (around line 275)

We need to get event details to include in the SMS:

```typescript
// Get event information for SMS
let eventTitle = 'événement'
let eventDate = ''
if (ticket.event_id) {
  const { data: event } = await supabase
    .from('events')
    .select('title, date, time')
    .eq('id', ticket.event_id)
    .single()
  
  if (event) {
    eventTitle = event.title || 'événement'
    eventDate = event.date ? new Date(event.date).toLocaleDateString('fr-FR') : ''
  }
}
```

### Step 3: Create SMS Message Templates
**Location**: Helper function or inline

**For Registered Users (Instant Transfer):**
```
🎫 Vous avez reçu un billet!

${senderName} vous a transféré un billet pour "${eventTitle}"${eventDate ? ' - ' + eventDate : ''}.

${message ? '\nMessage: ' + message : ''}

Accédez à votre compte Temba pour voir votre billet.
```

**For Non-Registered Users (Pending Transfer):**
```
🎫 Billet transféré!

${senderName} vous a transféré un billet pour "${eventTitle}"${eventDate ? ' - ' + eventDate : ''}.

${message ? '\nMessage: ' + message : ''}

Inscrivez-vous sur Temba avec ce numéro pour recevoir votre billet.
```

### Step 4: Integrate SMS Sending
**Location**: After transfer record is created (around line 300)

```typescript
// Send SMS notification if phone number provided
if (normalizedRecipientPhone) {
  try {
    // Get sender name
    const senderName = sender?.name || 'Quelqu\'un'
    
    // Determine message based on transfer status
    const smsMessage = recipientUserId
      ? `🎫 Vous avez reçu un billet!\n\n${senderName} vous a transféré un billet pour "${eventTitle}"${eventDate ? ' - ' + eventDate : ''}.${message ? '\n\nMessage: ' + message : ''}\n\nAccédez à votre compte Temba pour voir votre billet.`
      : `🎫 Billet transféré!\n\n${senderName} vous a transféré un billet pour "${eventTitle}"${eventDate ? ' - ' + eventDate : ''}.${message ? '\n\nMessage: ' + message : ''}\n\nInscrivez-vous sur Temba avec ce numéro pour recevoir votre billet.`
    
    await sendSMS(normalizedRecipientPhone, smsMessage)
    console.log('SMS notification sent to:', normalizedRecipientPhone)
  } catch (smsError) {
    // Don't fail the transfer if SMS fails
    console.error('Failed to send SMS notification:', smsError)
  }
}
```

### Step 5: Handle Edge Cases

1. **Phone number format**: Already normalized in `normalizedRecipientPhone`
2. **Twilio not configured**: Log warning but don't fail transfer
3. **SMS sending fails**: Log error but don't fail transfer (non-critical)
4. **Phone number invalid**: Twilio will reject, log error, continue
5. **Cost considerations**: SMS costs money - consider rate limiting if needed

## Message Examples

### Example 1: Registered User (French)
```
🎫 Vous avez reçu un billet!

Thierry Yabre vous a transféré un billet pour "Festival de Musique 2025" - 15/03/2025.

Message: Amusez-vous bien au festival!

Accédez à votre compte Temba pour voir votre billet.
```

### Example 2: Non-Registered User (French)
```
🎫 Billet transféré!

Thierry Yabre vous a transféré un billet pour "Festival de Musique 2025" - 15/03/2025.

Message: Profitez bien!

Inscrivez-vous sur Temba avec ce numéro pour recevoir votre billet.
```

### Example 3: Without Personal Message
```
🎫 Vous avez reçu un billet!

Thierry Yabre vous a transféré un billet pour "Concert Jazz" - 20/03/2025.

Accédez à votre compte Temba pour voir votre billet.
```

## Implementation Steps

### Phase 1: Basic SMS (Current Implementation)
1. ✅ Add SMS helper function to `transfer-ticket/index.ts`
2. ✅ Get event information (title, date)
3. ✅ Create SMS message template
4. ✅ Send SMS after transfer (for both registered and non-registered users)
5. ✅ Handle errors gracefully (don't fail transfer if SMS fails)

### Phase 2: Enhanced Features (Future)
1. SMS for sender confirmation ("You transferred a ticket to...")
2. SMS templates with dynamic content
3. SMS delivery status tracking
4. Rate limiting to prevent abuse
5. Multi-language support (French, English)

## Error Handling Strategy

```typescript
// SMS sending should never block transfer success
try {
  await sendSMS(phone, message)
} catch (error) {
  // Log but don't throw - transfer is more important than SMS
  console.error('SMS notification failed:', error)
  // Optionally: Store failed SMS attempt for retry
}
```

## Cost Considerations

- **Twilio Pricing**: ~$0.0075 per SMS (varies by country)
- **Burkina Faso**: Typically $0.03-0.05 per SMS
- **Rate Limiting**: Consider limiting SMS to prevent abuse
- **Fallback**: If Twilio fails, in-app notification still works

## Testing Checklist

- [ ] SMS sent to registered user (phone number)
- [ ] SMS sent to non-registered user (phone number)
- [ ] SMS includes correct event name
- [ ] SMS includes sender name
- [ ] SMS includes personal message (if provided)
- [ ] SMS handles missing event gracefully
- [ ] SMS handles missing sender name gracefully
- [ ] Transfer succeeds even if SMS fails
- [ ] Phone number normalization works
- [ ] Error logging works correctly

## Configuration Required

Ensure these environment variables are set in Supabase:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

Same as used for OTP sending, so should already be configured.

## Security Considerations

- ✅ Phone numbers already validated before transfer
- ✅ SMS sent only to recipient phone (not sender)
- ✅ No sensitive information in SMS (no ticket QR codes)
- ✅ SMS is informational only (not a security token)

## Next Steps

1. Implement SMS helper function
2. Add event information retrieval
3. Create French message templates
4. Integrate SMS sending into transfer flow
5. Test with real phone numbers
6. Monitor SMS delivery rates
7. Adjust message templates based on feedback

