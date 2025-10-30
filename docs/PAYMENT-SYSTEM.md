# Payment System Documentation

## 💳 Overview

The Temba platform implements a hybrid payment system supporting both mobile money (PayDunya) and traditional card payments (Stripe), with real-time currency conversion and comprehensive webhook handling.

## 🏗️ Payment Architecture

### Core Components
- **Payment Gateway Integration**: PayDunya (Mobile Money) + Stripe (Cards)
- **Currency Conversion**: Real-time FX rates with caching
- **Webhook Processing**: Asynchronous payment status updates
- **Order Management**: Complete order lifecycle tracking
- **Service Fee Calculation**: Dynamic fee computation

### Technology Stack
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: PostgreSQL with RLS policies
- **Payment Providers**: PayDunya API + Stripe API
- **FX Service**: Real-time currency conversion
- **Webhooks**: Asynchronous event processing

## 🔄 Payment Flows

### 1. Mobile Money Payment (PayDunya)
```
User Selection → PayDunya API → Payment URL → User Payment → IPN Webhook → Database Update → Ticket Generation
```

### 2. Card Payment (Stripe)
```
User Selection → Stripe PaymentIntent → Payment Form → Stripe Processing → Webhook → Database Update → Ticket Generation
```

### 3. Currency Conversion Flow
```
XOF Amount → FX Quote → USD Conversion → Stripe Charge → Webhook → Database Update
```

## 🗄️ Database Schema

### Core Tables
```sql
-- Orders table
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  event_id uuid REFERENCES events(id),
  total decimal(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  payment_method text NOT NULL,
  ticket_quantities jsonb,
  guest_email text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Payments table
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  user_id uuid REFERENCES auth.users(id),
  amount decimal(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'XOF',
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_intent_id text,
  payment_token text,
  created_at timestamp with time zone DEFAULT now()
);

-- FX Rates table
CREATE TABLE fx_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  rate decimal(10,6) NOT NULL,
  margin_bps integer NOT NULL DEFAULT 200,
  created_at timestamp with time zone DEFAULT now()
);

-- Service Fee Rules table
CREATE TABLE service_fee_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type text NOT NULL, -- 'GLOBAL', 'EVENT', 'TICKET_TYPE'
  event_id uuid REFERENCES events(id),
  ticket_type_id uuid REFERENCES ticket_types(id),
  fee_type text NOT NULL, -- 'PERCENTAGE', 'FIXED'
  fee_value decimal(10,2) NOT NULL,
  min_fee decimal(10,2),
  max_fee decimal(10,2),
  fee_payer text NOT NULL, -- 'BUYER', 'ORGANIZER'
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);
```

## 🔧 Edge Functions

### 1. create-stripe-payment
**Purpose**: Create Stripe PaymentIntents with order management
**Location**: `supabase/functions/create-stripe-payment/index.ts`

**Features**:
- Order creation and management
- FX rate calculation and caching
- PaymentIntent creation
- Idempotency handling
- Error recovery

**Input**:
```typescript
{
  user_id: string;
  event_id: string;
  amount: number;
  currency: string;
  create_order?: boolean;
  ticket_quantities?: { [key: string]: number };
  payment_method?: string;
  guest_email?: string;
}
```

### 2. stripe-webhook
**Purpose**: Process Stripe webhook events
**Location**: `supabase/functions/stripe-webhook/index.ts`

**Events Handled**:
- `payment_intent.succeeded`: Complete payment and generate tickets
- `payment_intent.payment_failed`: Mark payment as failed
- `payment_intent.canceled`: Handle payment cancellation

### 3. create-payment (PayDunya)
**Purpose**: Create PayDunya mobile money payments
**Location**: `supabase/functions/create-payment/index.ts`

**Features**:
- PayDunya API integration
- Payment token generation
- Order creation
- Webhook URL setup

### 4. paydunya-ipn
**Purpose**: Process PayDunya IPN webhooks
**Location**: `supabase/functions/paydunya-ipn/index.ts`

**Features**:
- IPN signature verification
- Payment status updates
- Ticket generation
- Error handling

### 5. fx-quote
**Purpose**: Get real-time FX rates
**Location**: `supabase/functions/fx-quote/index.ts`

**Features**:
- Real-time currency conversion
- Rate caching
- Margin calculation
- Error handling

## 💰 Service Fee System

### Fee Calculation Logic
```typescript
// Priority order: TICKET_TYPE > EVENT > GLOBAL
const calculateServiceFees = (ticketQuantities, eventId) => {
  // 1. Check ticket-specific rules
  // 2. Check event-specific rules  
  // 3. Check global rules
  // 4. Apply percentage or fixed fees
  // 5. Apply min/max limits
  // 6. Assign to buyer or organizer
};
```

### Fee Types
- **PERCENTAGE**: Percentage of ticket price
- **FIXED**: Fixed amount per ticket
- **MIN/MAX**: Minimum and maximum fee limits
- **PAYER**: Buyer or organizer responsibility

## 🔄 Webhook Processing

### Stripe Webhooks
```typescript
// Event processing
switch (event.type) {
  case 'payment_intent.succeeded':
    await processSuccessfulPayment(intent);
    break;
  case 'payment_intent.payment_failed':
    await processFailedPayment(intent);
    break;
  case 'payment_intent.canceled':
    await processCanceledPayment(intent);
    break;
}
```

### PayDunya IPN
```typescript
// IPN processing
const processIPN = async (ipnData) => {
  // 1. Verify signature
  // 2. Validate payment status
  // 3. Update database
  // 4. Generate tickets
  // 5. Send notifications
};
```

## 🛡️ Security Features

### Payment Security
- **PCI Compliance**: Stripe handles card data
- **Tokenization**: Secure payment tokens
- **Encryption**: All data encrypted in transit
- **Webhook Verification**: Signature validation

### Fraud Prevention
- **Rate Limiting**: API request throttling
- **Input Validation**: Server-side validation
- **Idempotency**: Duplicate request prevention
- **Audit Logs**: Complete transaction tracking

## 📊 Monitoring & Analytics

### Payment Metrics
- **Success Rate**: Payment completion rate
- **Failure Analysis**: Common failure reasons
- **Processing Time**: Average payment time
- **Revenue Tracking**: Daily/monthly revenue

### Error Monitoring
- **Webhook Failures**: Failed webhook processing
- **API Errors**: Payment provider errors
- **Database Issues**: Transaction failures
- **User Experience**: Payment flow issues

## 🧪 Testing

### Test Scenarios
- **Happy Path**: Successful payment flow
- **Error Handling**: Payment failures
- **Webhook Processing**: Asynchronous updates
- **Currency Conversion**: FX rate accuracy
- **Service Fees**: Fee calculation accuracy

### Test Data
- **Test Cards**: Stripe test card numbers
- **Test Accounts**: PayDunya test accounts
- **Mock Webhooks**: Simulated webhook events
- **Test Currencies**: Multiple currency testing

## 🚀 Deployment

### Environment Setup
```bash
# Required environment variables
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYDUNYA_MASTER_KEY=your_master_key
PAYDUNYA_PRIVATE_KEY=your_private_key
PAYDUNYA_TOKEN=your_token
RESEND_API_KEY=your_resend_key
```

### Deployment Steps
1. **Deploy Edge Functions**:
   ```bash
   supabase functions deploy create-stripe-payment
   supabase functions deploy stripe-webhook
   supabase functions deploy create-payment
   supabase functions deploy paydunya-ipn
   supabase functions deploy fx-quote
   ```

2. **Configure Webhooks**:
   - Stripe webhook endpoint
   - PayDunya IPN endpoint
   - Error handling endpoints

3. **Database Setup**:
   ```bash
   supabase db push
   ```

4. **Test Payment Flows**:
   - Test card payments
   - Test mobile money payments
   - Verify webhook processing

## 🔧 Troubleshooting

### Common Issues
- **Webhook Failures**: Check endpoint configuration
- **Currency Conversion**: Verify FX service availability
- **Payment Failures**: Check provider API status
- **Database Errors**: Verify RLS policies

### Debug Procedures
- **Log Analysis**: Check Edge Function logs
- **Webhook Testing**: Use Stripe CLI for testing
- **Database Queries**: Verify data integrity
- **API Testing**: Test payment provider APIs

---

*Last Updated: January 30, 2025*
*Payment System Version: 2.0.0*
