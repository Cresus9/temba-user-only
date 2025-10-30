# Ticket Transfer System

## 🎫 Overview

The Temba ticket transfer system enables users to transfer event tickets to other users, supporting both instant transfers to registered users and pending transfers to unregistered users. The system provides an airline-style transfer experience where recipients don't need to accept transfers.

## 🏗️ System Architecture

### Core Components
- **Frontend**: React components with TypeScript
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with JWT tokens
- **Real-time**: Supabase Realtime for live updates

### Data Flow
```
User Transfer Request → Frontend Validation → Edge Function → Database Update → RLS Policy Check → Real-time Notification → Recipient Claim
```

## 🔄 Transfer Types

### 1. Instant Transfer (Registered Users)
- **Trigger**: User clicks "Transférer le billet"
- **Process**: Immediate ownership transfer
- **Recipient**: Must have existing Temba account
- **Status**: `COMPLETED` immediately
- **Notification**: Real-time floating gift icon

### 2. Pending Transfer (Unregistered Users)
- **Trigger**: User transfers to email/phone not in system
- **Process**: Transfer marked as `PENDING`
- **Recipient**: Receives transfer upon account creation
- **Status**: `PENDING` → `COMPLETED` after claim
- **Notification**: Floating gift icon appears after signup

## 🗄️ Database Schema

### ticket_transfers Table
```sql
CREATE TABLE public.ticket_transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  recipient_id uuid, -- NULL for pending transfers
  recipient_email text,
  recipient_phone text,
  recipient_name text,
  message text,
  status text NOT NULL DEFAULT 'COMPLETED',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ticket_transfers_pkey PRIMARY KEY (id),
  CONSTRAINT ticket_transfers_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT ticket_transfers_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT ticket_transfers_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE
);
```

### RLS Policies
```sql
-- Allow users to see transfers they sent or received
CREATE POLICY "ticket_transfers_select_policy" ON ticket_transfers
  FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid() OR 
    recipient_id = auth.uid() OR 
    (recipient_email = (auth.jwt() ->> 'email') AND recipient_id IS NULL)
  );

-- Allow users to see tickets in pending transfers
CREATE POLICY "tickets_select_policy" ON tickets
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR 
    id IN (
      SELECT ticket_id 
      FROM ticket_transfers 
      WHERE recipient_email = (auth.jwt() ->> 'email') 
        AND status = 'PENDING'
    )
  );
```

## 🔧 Edge Functions

### 1. transfer-ticket
**Purpose**: Create new ticket transfers
**Location**: `supabase/functions/transfer-ticket/index.ts`

**Input**:
```typescript
{
  ticketId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  message?: string;
}
```

**Process**:
1. Validate ticket ownership
2. Check if recipient is registered
3. Create transfer record
4. Send notifications
5. Return transfer status

**Output**:
```typescript
{
  success: boolean;
  transferId?: string;
  instantTransfer?: boolean;
  message?: string;
  error?: string;
}
```

### 2. claim-pending-transfer
**Purpose**: Claim pending transfers for new users
**Location**: `supabase/functions/claim-pending-transfer/index.ts`

**Input**:
```typescript
{
  transferId: string;
}
```

**Process**:
1. Verify user is intended recipient
2. Update transfer status to `COMPLETED`
3. Transfer ticket ownership
4. Create notifications
5. Return success confirmation

## 🎨 Frontend Components

### 1. TransferTicketModal
**Location**: `src/components/tickets/TransferTicketModal.tsx`

**Features**:
- Two-step confirmation process
- Email/phone validation
- Message input
- Error handling with French translations
- Loading states

**Props**:
```typescript
interface TransferTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  ticketTitle: string;
  onTransferComplete: () => void;
}
```

### 2. PendingTransfersNotification
**Location**: `src/components/tickets/PendingTransfersNotification.tsx`

**Features**:
- Floating gift icon with notification badge
- Transfer details modal with event information
- One-click claim functionality
- Real-time updates
- Null-safe rendering

### 3. AuthContext Integration
**Location**: `src/context/AuthContext.tsx`

**New Methods**:
```typescript
interface AuthState {
  // ... existing properties
  pendingTransfers: any[];
  checkPendingTransfers: () => Promise<void>;
  claimPendingTransfer: (transferId: string) => Promise<boolean>;
  refreshUserTickets: () => Promise<void>;
}
```

## 🎯 User Experience Features

### Universal Ticket Status Banner
- **Location**: `src/components/tickets/EnhancedFestivalTicket.tsx`
- **Status Types**:
  - 🟢 **Green Banner**: Used tickets with scan details
  - 🔵 **Blue Banner**: Valid tickets ready for use
  - 🟡 **Yellow Banner**: Other statuses

### Two-Step Confirmation
- **Step 1**: Enter recipient details and message
- **Step 2**: Confirm transfer details before sending
- **Validation**: Email/phone format validation
- **Error Handling**: French error messages

### Navigation Updates
- **"Profil"** → **"Mes Billets"** (leads to booking history)
- **Single Transfer Button**: Removed duplicate buttons
- **Consistent UI**: Unified design across components

## 🔄 Transfer Workflows

### Instant Transfer Workflow
```
1. User clicks "Transférer le billet"
2. TransferTicketModal opens
3. User enters recipient email/phone
4. User adds optional message
5. User confirms transfer details
6. transfer-ticket Edge Function called
7. Transfer created with COMPLETED status
8. Recipient receives real-time notification
9. Ticket appears in recipient's account
```

### Pending Transfer Workflow
```
1. User transfers to unregistered email/phone
2. Transfer created with PENDING status
3. Recipient signs up with same email/phone
4. AuthContext checks for pending transfers
5. PendingTransfersNotification shows floating icon
6. Recipient clicks "Réclamer le billet"
7. claim-pending-transfer Edge Function called
8. Transfer status updated to COMPLETED
9. Ticket ownership transferred
10. Ticket appears in recipient's account
```

## 🛡️ Security Features

### Authentication & Authorization
- **JWT Validation**: Verify user authentication
- **RLS Policies**: Database-level access control
- **Input Validation**: Sanitize all user inputs
- **CORS Configuration**: Restrict cross-origin requests

### Data Protection
- **Encryption**: Data encrypted in transit and at rest
- **Audit Logs**: Complete transfer tracking
- **Privacy**: GDPR-compliant data handling
- **Access Control**: Users can only see their transfers

## 🧪 Testing

### Test Scenarios
- **Instant Transfer**: Transfer to registered user
- **Pending Transfer**: Transfer to unregistered user
- **Claim Process**: New user claims pending transfer
- **Error Handling**: Invalid transfers and edge cases
- **UI Components**: Modal and notification testing

### Test Data
- **Test Users**: Registered and unregistered users
- **Test Tickets**: Various ticket types and statuses
- **Test Transfers**: Different transfer scenarios
- **Mock Data**: Test event and ticket data

## 🚀 Deployment

### Prerequisites
- Supabase project with Edge Functions enabled
- Database migrations applied
- RLS policies configured
- CORS headers updated

### Steps
1. **Deploy Edge Functions**:
   ```bash
   supabase functions deploy transfer-ticket
   supabase functions deploy claim-pending-transfer
   ```

2. **Apply Database Migrations**:
   ```bash
   supabase db push
   ```

3. **Verify RLS Policies**: Ensure policies are active
4. **Test Complete Flow**: Verify all functionality works

## 🔧 Troubleshooting

### Common Issues

#### Issue: "Transfer not found" error
**Cause**: RLS policy blocking access
**Solution**: Verify RLS policies are applied correctly

#### Issue: "Cannot read properties of null"
**Cause**: Missing null checks in UI components
**Solution**: Add optional chaining (`?.`) and null checks

#### Issue: CORS errors in browser console
**Cause**: Missing headers in Edge Functions
**Solution**: Update CORS headers to include all required headers

#### Issue: Pending transfers not showing
**Cause**: AuthContext not checking transfers after signup
**Solution**: Ensure `checkPendingTransfers()` is called in `loadProfile()`

### Debug Procedures
1. **Check Console Logs**: Look for error messages
2. **Verify Database**: Check transfer records exist
3. **Test RLS Policies**: Ensure user can access data
4. **Check Edge Functions**: Verify functions are deployed
5. **Test API Calls**: Use browser dev tools

## 📊 Performance Considerations

### Optimization Strategies
- **Debounced Queries**: Prevent excessive API calls
- **Null Checks**: Avoid unnecessary re-renders
- **Lazy Loading**: Load transfer details on demand
- **Caching**: Cache transfer data in AuthContext
- **Real-time Updates**: Use Supabase subscriptions efficiently

### Monitoring
- **Transfer Success Rate**: Track successful transfers
- **Error Rates**: Monitor failed transfers
- **Response Times**: Track API performance
- **User Experience**: Monitor UI responsiveness

---

*Last Updated: January 30, 2025*
*Ticket Transfer System Version: 2.0.0*
