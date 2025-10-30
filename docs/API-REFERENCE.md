# API Reference

## 🔌 Overview

This document provides comprehensive API documentation for the Temba platform, including all Edge Functions, database schemas, and integration endpoints.

## 🏗️ Base URLs

### Production
- **Frontend**: `https://tembas.com`
- **Backend**: `https://uwmlagvsivxqocklxbbo.supabase.co`
- **Functions**: `https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1`

### Development
- **Frontend**: `http://localhost:5173`
- **Backend**: `https://your-project.supabase.co`
- **Functions**: `https://your-project.supabase.co/functions/v1`

## 🔐 Authentication

### JWT Token
All API requests require a valid JWT token in the Authorization header:

```http
Authorization: Bearer <jwt_token>
```

### Getting a Token
```typescript
// Sign in user
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// Get session token
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

## 💳 Payment APIs

### Create Stripe Payment

#### POST `/functions/v1/create-stripe-payment`

Creates a Stripe PaymentIntent for card payments.

**Request Body**:
```typescript
{
  user_id: string;
  event_id: string;
  amount: number;
  currency?: string; // Default: "XOF"
  create_order?: boolean; // Default: true
  ticket_quantities?: { [key: string]: number };
  payment_method?: string; // Default: "CARD"
  guest_email?: string;
  fx_margin_bps?: number; // Default: 200
  idempotency_key?: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  paymentId?: string;
  clientSecret?: string;
  orderId?: string;
  order_created?: boolean;
  fx_rate?: number;
  fx_margin_bps?: number;
  error?: string;
}
```

**Example**:
```typescript
const response = await fetch('/functions/v1/create-stripe-payment', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    user_id: 'user-uuid',
    event_id: 'event-uuid',
    amount: 10000,
    ticket_quantities: { 'ticket-type-1': 2 },
    guest_email: 'guest@example.com'
  })
});
```

### Create PayDunya Payment

#### POST `/functions/v1/create-payment`

Creates a PayDunya mobile money payment.

**Request Body**:
```typescript
{
  user_id: string;
  event_id: string;
  amount: number;
  ticket_quantities: { [key: string]: number };
  guest_email?: string;
  return_url?: string;
  cancel_url?: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  paymentUrl?: string;
  paymentToken?: string;
  orderId?: string;
  error?: string;
}
```

### Stripe Webhook

#### POST `/functions/v1/stripe-webhook`

Processes Stripe webhook events.

**Headers**:
```http
Stripe-Signature: <webhook_signature>
Content-Type: application/json
```

**Events Handled**:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`

### PayDunya IPN

#### POST `/functions/v1/paydunya-ipn`

Processes PayDunya IPN webhooks.

**Request Body**:
```typescript
{
  token: string;
  status: string;
  // ... other PayDunya fields
}
```

## 🎫 Ticket Transfer APIs

### Transfer Ticket

#### POST `/functions/v1/transfer-ticket`

Creates a new ticket transfer.

**Request Body**:
```typescript
{
  ticketId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  message?: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  transferId?: string;
  instantTransfer?: boolean;
  message?: string;
  error?: string;
}
```

**Example**:
```typescript
const response = await fetch('/functions/v1/transfer-ticket', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    ticketId: 'ticket-uuid',
    recipientEmail: 'recipient@example.com',
    recipientName: 'John Doe',
    message: 'Enjoy the event!'
  })
});
```

### Claim Pending Transfer

#### POST `/functions/v1/claim-pending-transfer`

Claims a pending transfer for new users.

**Request Body**:
```typescript
{
  transferId: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

## 🔐 Authentication APIs

### User Signup

#### POST `/functions/v1/signup`

Creates a new user account.

**Request Body**:
```typescript
{
  email: string;
  password: string;
  name: string;
  phone?: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    phone?: string;
  };
  session?: any;
  error?: string;
}
```

### Welcome User

#### POST `/functions/v1/welcome-user`

Sends welcome email to new users.

**Request Body**:
```typescript
{
  record: any; // User record
  eventType: string;
  user_metadata: {
    name: string;
  };
}
```

## 💰 Utility APIs

### FX Quote

#### POST `/functions/v1/fx-quote`

Gets real-time foreign exchange rates.

**Request Body**:
```typescript
{
  from_currency: string; // Default: "XOF"
  to_currency: string; // Default: "USD"
  amount?: number;
}
```

**Response**:
```typescript
{
  success: boolean;
  rate?: number;
  margin_bps?: number;
  converted_amount?: number;
  error?: string;
}
```

### Payment Recovery

#### POST `/functions/v1/payment-recovery`

Recovers failed payments.

**Request Body**:
```typescript
{
  payment_id: string;
  recovery_type: 'retry' | 'refund' | 'manual';
}
```

### Verify Payment

#### POST `/functions/v1/verify-payment`

Verifies payment status.

**Request Body**:
```typescript
{
  payment_id: string;
  provider: 'stripe' | 'paydunya';
}
```

## 🗄️ Database Schema

### Core Tables

#### users (auth.users)
```sql
CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  encrypted_password text,
  email_confirmed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  raw_user_meta_data jsonb,
  raw_app_meta_data jsonb
);
```

#### profiles
```sql
CREATE TABLE profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

#### events
```sql
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  date timestamp with time zone NOT NULL,
  venue text NOT NULL,
  location text,
  image_url text,
  status text DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

#### tickets
```sql
CREATE TABLE tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  ticket_type_id uuid REFERENCES ticket_types(id),
  status text DEFAULT 'VALID',
  qr_code text,
  scanned_at timestamp with time zone,
  scanned_by text,
  scan_location text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

#### orders
```sql
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  total decimal(10,2) NOT NULL,
  status text DEFAULT 'PENDING',
  payment_method text NOT NULL,
  ticket_quantities jsonb,
  guest_email text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

#### payments
```sql
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'XOF',
  provider text NOT NULL,
  status text DEFAULT 'pending',
  payment_intent_id text,
  payment_token text,
  created_at timestamp with time zone DEFAULT now()
);
```

#### ticket_transfers
```sql
CREATE TABLE ticket_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email text,
  recipient_phone text,
  recipient_name text,
  message text,
  status text DEFAULT 'COMPLETED',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

## 🔒 Row Level Security (RLS)

### Policies

#### profiles
```sql
-- Users can view their own profile
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
```

#### tickets
```sql
-- Users can view their own tickets or tickets in pending transfers
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

#### ticket_transfers
```sql
-- Users can view transfers they sent or received
CREATE POLICY "ticket_transfers_select_policy" ON ticket_transfers
  FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid() OR 
    recipient_id = auth.uid() OR 
    (recipient_email = (auth.jwt() ->> 'email') AND recipient_id IS NULL)
  );
```

## 📊 Error Codes

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

### Custom Error Codes
- `PAYMENT_FAILED` - Payment processing failed
- `TRANSFER_NOT_FOUND` - Transfer record not found
- `INVALID_RECIPIENT` - Invalid recipient information
- `TICKET_NOT_OWNED` - User doesn't own the ticket
- `TRANSFER_EXPIRED` - Transfer has expired
- `RLS_VIOLATION` - Row Level Security violation

## 🧪 Testing

### Test Endpoints

#### Health Check
```http
GET /functions/v1/health-check
```

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-30T10:00:00Z",
  "services": {
    "database": "connected",
    "functions": "running",
    "auth": "active"
  }
}
```

### Test Data

#### Test Cards (Stripe)
- **Success**: `4242424242424242`
- **Decline**: `4000000000000002`
- **Insufficient Funds**: `4000000000009995`

#### Test Users
- **Email**: `test@example.com`
- **Password**: `testpassword123`

## 📝 Rate Limits

### API Limits
- **Authentication**: 100 requests/minute
- **Payment**: 50 requests/minute
- **Transfer**: 30 requests/minute
- **General**: 1000 requests/hour

### Webhook Limits
- **Stripe**: 1000 events/minute
- **PayDunya**: 500 events/minute

## 🔧 SDK Examples

### JavaScript/TypeScript

#### Initialize Client
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);
```

#### Call Edge Function
```typescript
const { data, error } = await supabase.functions.invoke('transfer-ticket', {
  body: {
    ticketId: 'ticket-uuid',
    recipientEmail: 'recipient@example.com'
  },
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

#### Database Query
```typescript
const { data, error } = await supabase
  .from('tickets')
  .select(`
    id,
    status,
    event:events (
      title,
      date,
      venue
    )
  `)
  .eq('user_id', user.id);
```

### cURL Examples

#### Transfer Ticket
```bash
curl -X POST https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/transfer-ticket \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "ticket-uuid",
    "recipientEmail": "recipient@example.com",
    "message": "Enjoy the event!"
  }'
```

#### Create Payment
```bash
curl -X POST https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/create-stripe-payment \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid",
    "event_id": "event-uuid",
    "amount": 10000,
    "ticket_quantities": {"ticket-type-1": 2}
  }'
```

---

*Last Updated: January 30, 2025*
*API Reference Version: 2.0.0*
