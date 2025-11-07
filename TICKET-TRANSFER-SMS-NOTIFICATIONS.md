# Ticket Transfer SMS Notifications

## Overview
SMS notifications are now automatically sent when a ticket is transferred to a phone number, informing recipients (both registered and unregistered users) about the transfer and inviting them to sign up or log in to claim their ticket.

## Implementation Details

### When SMS is Sent
- SMS is sent automatically when a ticket is transferred to a phone number
- Works for both registered and unregistered users
- SMS sending is non-blocking - if it fails, the transfer still completes successfully

### SMS Message Content

#### For Registered Users
```
🎫 [Sender Name] vous a transféré un billet pour "[Event Title]" ([Date] à [Time]). Connectez-vous sur Temba pour voir votre billet : [URL]/profile/my-tickets
```

#### For Unregistered Users
```
🎫 [Sender Name] vous a transféré un billet pour "[Event Title]" ([Date] à [Time]). Inscrivez-vous sur Temba pour récupérer votre billet : [URL]/signup
```

### Technical Implementation

#### Location
- **File**: `supabase/functions/transfer-ticket/index.ts`
- **Function**: `sendTransferSMS()`

#### Key Features
1. **Event Information**: Automatically includes event title, date, and time
2. **Status-Aware**: Different messages for registered vs unregistered users
3. **Error Handling**: Non-blocking - transfer succeeds even if SMS fails
4. **Phone Normalization**: Uses normalized phone numbers (E.164 format)
5. **Twilio Integration**: Uses existing Twilio configuration

#### Configuration Required
The following environment variables must be set in Supabase:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

### Flow

1. **User transfers ticket** → `transfer-ticket` Edge Function is called
2. **Transfer record created** → Stored in `ticket_transfers` table
3. **SMS notification sent** → If recipient phone is provided
4. **Transfer completes** → Regardless of SMS success/failure

### Example Scenarios

#### Scenario 1: Transfer to Registered User
- User A transfers ticket to User B (registered user with phone: +22675581026)
- SMS sent: "🎫 John vous a transféré un billet pour 'Festival de Musique' (ven. 15 mars à 20:00). Connectez-vous sur Temba pour voir votre billet : https://tembas.com/profile/my-tickets"
- User B receives SMS and can log in to see the ticket immediately

#### Scenario 2: Transfer to Unregistered User
- User A transfers ticket to phone +22675581026 (not registered)
- SMS sent: "🎫 John vous a transféré un billet pour 'Festival de Musique' (ven. 15 mars à 20:00). Inscrivez-vous sur Temba pour récupérer votre billet : https://tembas.com/signup"
- Recipient receives SMS with signup invitation
- When they sign up with the same phone number, they automatically receive the ticket

### Error Handling

- **Missing Twilio Configuration**: Logs warning, continues without SMS
- **Twilio API Errors**: Logs error details, transfer still succeeds
- **Invalid Phone Numbers**: Twilio will return error, logged but not blocking

### Logging

All SMS sending attempts are logged:
- Success: `Transfer SMS sent successfully: [Message SID]`
- Failure: `Twilio API error response: [details]`
- Missing Config: `Twilio configuration missing - skipping SMS notification`

### Testing

To test SMS notifications:
1. Transfer a ticket to a phone number (registered or unregistered)
2. Check Supabase logs for SMS sending confirmation
3. Verify recipient receives SMS with correct event details
4. For unregistered users, verify signup link works

### Future Enhancements

- [ ] Email notifications for email-based transfers
- [ ] SMS templates for different languages
- [ ] Retry mechanism for failed SMS
- [ ] SMS delivery status tracking
- [ ] Short URL for signup links (to save SMS characters)

## Deployment

The `transfer-ticket` Edge Function must be deployed to Supabase:

```bash
supabase functions deploy transfer-ticket
```

Ensure Twilio environment variables are configured in Supabase dashboard:
- Settings → Edge Functions → Secrets

