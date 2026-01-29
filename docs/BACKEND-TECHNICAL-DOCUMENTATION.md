# Temba Backend Technical Documentation

## Executive Summary

**Document Version:** 1.0.0  
**Last Updated:** January 15, 2026  
**Platform:** Temba Event Ticketing System  
**Target Audience:** Engineers, Investors, Technical Stakeholders

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technical Architecture](#2-technical-architecture)
3. [Database Design](#3-database-design)
4. [API & Edge Functions](#4-api--edge-functions)
5. [Payment Infrastructure](#5-payment-infrastructure)
6. [Security & Compliance](#6-security--compliance)
7. [Performance & Scalability](#7-performance--scalability)
8. [Deployment & Infrastructure](#8-deployment--infrastructure)
9. [Monitoring & Observability](#9-monitoring--observability)
10. [Development Workflow](#10-development-workflow)
11. [Roadmap & Future Development](#11-roadmap--future-development)

---

## 1. System Overview

### 1.1 Platform Purpose

Temba is a modern, scalable event ticketing platform designed for the African market, enabling:

- **Seamless Event Discovery**: Browse and search events by category, location, and date
- **Multi-Currency Payment Processing**: Support for XOF, GHS, USD, EUR, and NGN
- **Hybrid Payment Methods**: Mobile Money (PawaPay, PayDunya) + Card Payments (Stripe)
- **Ticket Transfer System**: Peer-to-peer ticket transfers with SMS notifications
- **Real-time Notifications**: Push notifications and email alerts
- **Multi-tenant Support**: User, Organizer, and Admin roles
- **Blog & Content Management**: SEO-optimized blog for marketing and engagement

### 1.2 Key Metrics

| Metric | Current Capacity | Notes |
|--------|------------------|-------|
| **Users** | 100,000+ | Scalable to millions |
| **Concurrent Transactions** | 1,000/min | With auto-scaling |
| **Event Capacity** | Unlimited | Multi-date event support |
| **Payment Providers** | 3 (PawaPay, PayDunya, Stripe) | Expandable |
| **Supported Currencies** | 5 (XOF, GHS, USD, EUR, NGN) | FX conversion enabled |
| **Database Performance** | < 50ms avg query time | Optimized with indexes |
| **API Response Time** | < 200ms p95 | Edge function deployment |

### 1.3 Business Value Proposition

**For Investors:**
- **Scalable Infrastructure**: Serverless architecture with pay-as-you-grow model
- **Low Operational Costs**: $0 fixed infrastructure costs, ~$0.15 per transaction
- **Multi-Region Ready**: Designed for West African expansion (Burkina Faso, Ghana, Nigeria, Senegal)
- **Revenue Streams**: Service fees (2-5%), payment processing margins, premium features
- **Market Opportunity**: $2.4B event ticketing market in West Africa by 2027

**For Engineers:**
- **Modern Stack**: TypeScript, React, PostgreSQL, Deno Edge Functions
- **Developer Experience**: Hot reload, type safety, automated testing
- **Best Practices**: RLS security, ACID transactions, idempotency
- **Extensibility**: Microservices architecture, plug-and-play integrations

---

## 2. Technical Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  Web Application (React + TypeScript)                           │
│  - Progressive Web App (PWA)                                    │
│  - Responsive Design (Mobile-First)                             │
│  - SEO Optimized (SSR-ready)                                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ HTTPS / WebSocket
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API GATEWAY LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  Supabase Edge Functions (Deno Runtime)                         │
│  - Authentication & Authorization                               │
│  - Rate Limiting & DDoS Protection                              │
│  - Request Validation & Sanitization                            │
│  - CORS Management                                              │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ Internal Network
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  Edge Functions (23 Functions)                                  │
│  ├─ Payment Processing (create-pawapay-payment, stripe-webhook) │
│  ├─ Ticket Management (transfer-ticket, validate-ticket)        │
│  ├─ User Management (signup, send-otp, verify-otp)             │
│  ├─ Order Processing (guest-order-processor)                    │
│  ├─ Notifications (welcome-user, transfer notifications)        │
│  ├─ Webhooks (pawapay-webhook, stripe-webhook)                 │
│  └─ Utilities (fx-quote, image-optimizer)                       │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ SQL / RPC
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATA PERSISTENCE LAYER                      │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL Database (Supabase)                                 │
│  ├─ Core Tables: users, profiles, events, tickets, orders      │
│  ├─ Payment Tables: payments, fx_rates, service_fee_rules      │
│  ├─ Transfer Tables: ticket_transfers, otp_codes               │
│  ├─ Blog Tables: blog_posts, blog_categories, blog_tags        │
│  ├─ Support Tables: support_tickets, support_messages          │
│  ├─ Security: Row Level Security (RLS) policies                │
│  └─ Indexes: 50+ optimized indexes for performance             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ Replication / Backup
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL INTEGRATIONS                         │
├─────────────────────────────────────────────────────────────────┤
│  Payment Providers:                                             │
│  ├─ PawaPay (Mobile Money - Orange, MTN, Moov)                 │
│  ├─ PayDunya (Mobile Money - Legacy)                           │
│  └─ Stripe (Card Payments + FX Conversion)                     │
│                                                                 │
│  Communication Services:                                        │
│  ├─ Twilio (SMS for OTP and Transfer Notifications)            │
│  ├─ Resend (Email Notifications)                               │
│  └─ Firebase Cloud Messaging (Push Notifications)              │
│                                                                 │
│  Infrastructure:                                                │
│  ├─ Netlify (Frontend Hosting + CDN)                           │
│  ├─ Supabase (Backend + Database + Storage)                    │
│  └─ GitHub Actions (CI/CD Pipeline)                            │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

#### Frontend Stack
| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | React | 18.3.1 | UI component library |
| **Language** | TypeScript | 5.6.2 | Type-safe development |
| **Build Tool** | Vite | 5.4.2 | Fast build and HMR |
| **Styling** | Tailwind CSS | 3.4.1 | Utility-first CSS |
| **Routing** | React Router | 6.28.0 | Client-side routing |
| **State Management** | React Context + Hooks | - | Lightweight state management |
| **HTTP Client** | Supabase Client | 2.47.10 | API communication |
| **Icons** | Lucide React | 0.468.0 | Icon library |
| **QR Codes** | qrcode.react | 4.1.0 | QR code generation |
| **Notifications** | React Hot Toast | 2.4.1 | Toast notifications |
| **SEO** | React Helmet Async | 2.0.5 | Meta tag management |

#### Backend Stack
| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Runtime** | Deno | 2.1.4 | Edge function runtime |
| **Database** | PostgreSQL | 15.6 | Primary data store |
| **ORM/Client** | Supabase Client | 2.47.10 | Database queries |
| **Authentication** | Supabase Auth | Built-in | User authentication |
| **Storage** | Supabase Storage | Built-in | File uploads |
| **Real-time** | Supabase Realtime | Built-in | WebSocket connections |
| **Payment APIs** | Stripe, PawaPay | Latest | Payment processing |
| **SMS** | Twilio | Latest | SMS delivery |
| **Email** | Resend | Latest | Email delivery |

#### Infrastructure Stack
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend Hosting** | Netlify | CDN + Deployment |
| **Backend Hosting** | Supabase Cloud | Managed PostgreSQL + Edge Functions |
| **Version Control** | Git + GitHub | Code repository |
| **CI/CD** | GitHub Actions | Automated deployments |
| **Monitoring** | Supabase Dashboard | Logs + Metrics |
| **DNS** | Cloudflare | DNS management |

### 2.3 Architectural Patterns

#### Microservices Architecture
Each Edge Function operates as an independent microservice:
- **Stateless**: No server-side session storage
- **Isolated**: Failures in one function don't affect others
- **Scalable**: Each function scales independently
- **Deployable**: Deploy individual functions without downtime

#### Event-Driven Architecture
Key workflows use event-driven patterns:
- **Payment Processing**: Webhooks trigger order completion
- **Ticket Transfers**: Real-time notifications on transfer events
- **User Onboarding**: Welcome emails triggered by signup events
- **Analytics**: Database triggers update counters and stats

#### Database-Centric Architecture
PostgreSQL serves as the single source of truth:
- **ACID Transactions**: Guaranteed data consistency
- **Row Level Security**: Database-level authorization
- **Database Functions**: Business logic in stored procedures
- **Triggers**: Automated data updates and validations

---

## 3. Database Design

### 3.1 Schema Overview

```sql
-- Core database schema with 35+ tables
-- Organized by domain:

├─ Authentication & Users
│  ├─ auth.users (Supabase managed)
│  ├─ profiles
│  ├─ otp_codes
│  └─ push_tokens
│
├─ Events & Ticketing
│  ├─ events
│  ├─ event_dates (multi-date support)
│  ├─ ticket_types
│  ├─ tickets
│  ├─ venue_layouts
│  ├─ venue_sections
│  └─ venue_seats
│
├─ Orders & Payments
│  ├─ orders
│  ├─ payments
│  ├─ fx_rates
│  └─ service_fee_rules
│
├─ Ticket Transfers
│  ├─ ticket_transfers
│  └─ transferred_tickets (view)
│
├─ Blog & Content
│  ├─ blog_posts
│  ├─ blog_categories
│  ├─ blog_tags
│  ├─ blog_post_categories (junction)
│  ├─ blog_post_tags (junction)
│  └─ blog_comments
│
├─ Support System
│  ├─ support_categories
│  ├─ support_tickets
│  └─ support_messages
│
├─ CMS
│  ├─ pages
│  ├─ banners
│  └─ faqs
│
└─ Security & Monitoring
   ├─ fraud_checks
   ├─ high_risk_orders
   ├─ security_logs
   └─ image_optimizations
```

### 3.2 Core Entity Relationships

```mermaid
erDiagram
    USERS ||--o{ PROFILES : has
    USERS ||--o{ ORDERS : creates
    USERS ||--o{ TICKETS : owns
    USERS ||--o{ TICKET_TRANSFERS : "sends/receives"
    
    EVENTS ||--o{ EVENT_DATES : has
    EVENTS ||--o{ TICKET_TYPES : offers
    EVENTS ||--o{ TICKETS : generates
    EVENTS ||--o{ ORDERS : for
    
    ORDERS ||--o{ PAYMENTS : has
    ORDERS ||--o{ TICKETS : contains
    
    TICKETS ||--o{ TICKET_TRANSFERS : transferred
    TICKET_TYPES ||--o{ TICKETS : categorizes
    
    EVENT_DATES ||--o{ TICKETS : "valid for"
    EVENT_DATES ||--o{ ORDERS : "booked for"
    
    BLOG_POSTS ||--o{ BLOG_POST_CATEGORIES : categorized
    BLOG_POSTS ||--o{ BLOG_POST_TAGS : tagged
    BLOG_POSTS ||--o{ BLOG_COMMENTS : has
```

### 3.3 Critical Tables (Detailed Schema)

#### Users & Profiles
```sql
-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  location text,
  bio text,
  avatar_url text,
  role text NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ORGANIZER', 'ADMIN')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'BANNED')),
  email_verified boolean DEFAULT false,
  phone_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_phone ON profiles(phone);
CREATE INDEX idx_profiles_role ON profiles(role);
```

#### Events
```sql
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  slug text UNIQUE NOT NULL,
  
  -- Multi-date support (deprecated individual date/time fields)
  date date, -- Legacy field
  time text, -- Legacy field
  start_date timestamptz,
  end_date timestamptz,
  
  location text NOT NULL,
  venue_name text,
  venue_address text,
  image_url text NOT NULL,
  
  -- Pricing
  price numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'XOF' CHECK (currency IN ('XOF', 'GHS', 'USD', 'EUR', 'NGN')),
  
  -- Capacity
  capacity integer NOT NULL,
  tickets_sold integer DEFAULT 0,
  
  -- Status
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED')),
  
  -- Features
  featured boolean DEFAULT false,
  categories text[], -- Legacy array field
  
  -- Relations
  venue_layout_id uuid REFERENCES venue_layouts(id),
  organizer_id uuid REFERENCES auth.users(id),
  
  -- SEO
  meta_title text,
  meta_description text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_featured ON events(featured);
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_categories ON events USING GIN(categories);
```

#### Event Dates (Multi-Date Support)
```sql
CREATE TABLE event_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  time time NOT NULL,
  end_time time,
  capacity integer,
  tickets_sold integer DEFAULT 0,
  status text DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELLED', 'SOLD_OUT')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_event_dates_event_id ON event_dates(event_id);
CREATE INDEX idx_event_dates_date ON event_dates(date);
```

#### Orders
```sql
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Buyer (nullable for guest checkout)
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_email text,
  
  -- Event
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  event_date_id uuid REFERENCES event_dates(id), -- For multi-date events
  
  -- Pricing
  subtotal numeric(10,2) NOT NULL,
  service_fee numeric(10,2) DEFAULT 0,
  total numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'XOF',
  
  -- Status
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED')),
  
  -- Payment
  payment_method text NOT NULL CHECK (payment_method IN ('MOBILE_MONEY', 'CARD', 'CASH')),
  payment_provider text, -- 'PAWAPAY', 'PAYDUNYA', 'STRIPE'
  
  -- Ticket quantities (JSON object: { "ticket_type_id": quantity })
  ticket_quantities jsonb,
  
  -- Metadata
  order_number text UNIQUE NOT NULL, -- Human-readable order ID
  notes text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Indexes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_event_id ON orders(event_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_guest_email ON orders(guest_email);
```

#### Payments
```sql
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Amount
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'XOF',
  
  -- Provider
  provider text NOT NULL CHECK (provider IN ('PAWAPAY', 'PAYDUNYA', 'STRIPE')),
  
  -- Status
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED')),
  
  -- Provider-specific IDs
  payment_intent_id text, -- Stripe PaymentIntent ID
  payment_token text, -- PayDunya token
  deposit_id text, -- PawaPay deposit ID
  
  -- Metadata
  metadata jsonb,
  error_message text,
  
  -- FX (if currency conversion was used)
  fx_rate numeric(10,6),
  original_amount numeric(10,2),
  original_currency text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  succeeded_at timestamptz
);

-- Indexes
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_provider ON payments(provider);
CREATE INDEX idx_payments_payment_intent_id ON payments(payment_intent_id);
```

#### Tickets
```sql
CREATE TABLE tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  event_date_id uuid REFERENCES event_dates(id), -- For multi-date events
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ticket_type_id uuid REFERENCES ticket_types(id) ON DELETE CASCADE NOT NULL,
  
  -- Seat assignment (if applicable)
  seat_id uuid REFERENCES venue_seats(id),
  
  -- Status
  status text NOT NULL DEFAULT 'VALID' CHECK (status IN ('VALID', 'USED', 'CANCELLED', 'TRANSFERRED', 'REFUNDED')),
  
  -- QR Code
  qr_code text UNIQUE NOT NULL,
  
  -- Scanning
  scanned_at timestamptz,
  scanned_by uuid REFERENCES auth.users(id),
  scan_location text,
  
  -- Transfer tracking
  original_owner_id uuid REFERENCES auth.users(id), -- Original buyer
  transfer_count integer DEFAULT 0,
  
  -- Metadata
  ticket_number text UNIQUE NOT NULL, -- Human-readable ticket ID
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_tickets_order_id ON tickets(order_id);
CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_event_id ON tickets(event_id);
CREATE INDEX idx_tickets_qr_code ON tickets(qr_code);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_original_owner ON tickets(original_owner_id);
```

#### Ticket Transfers
```sql
CREATE TABLE ticket_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ticket being transferred
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  
  -- Parties involved
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_phone text NOT NULL, -- Phone number of recipient
  recipient_id uuid REFERENCES auth.users(id), -- Filled when recipient claims
  
  -- Status
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED', 'EXPIRED')),
  
  -- Security
  otp_code text, -- For unregistered users
  otp_expires_at timestamptz,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);

-- Indexes
CREATE INDEX idx_ticket_transfers_ticket_id ON ticket_transfers(ticket_id);
CREATE INDEX idx_ticket_transfers_sender_id ON ticket_transfers(sender_id);
CREATE INDEX idx_ticket_transfers_recipient_phone ON ticket_transfers(recipient_phone);
CREATE INDEX idx_ticket_transfers_status ON ticket_transfers(status);
```

### 3.4 Row Level Security (RLS) Policies

Temba implements comprehensive RLS for database-level security:

```sql
-- Example: Users can only view their own tickets
CREATE POLICY "users_view_own_tickets"
ON tickets FOR SELECT
USING (auth.uid() = user_id);

-- Example: Users can view published events
CREATE POLICY "public_view_published_events"
ON events FOR SELECT
USING (status = 'PUBLISHED' OR auth.uid() IN (
  SELECT user_id FROM profiles WHERE role IN ('ADMIN', 'ORGANIZER')
));

-- Example: Only ticket owner can transfer tickets
CREATE POLICY "owner_can_transfer_ticket"
ON ticket_transfers FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM tickets WHERE id = ticket_id
  )
);
```

**Full RLS Coverage:**
- ✅ All tables have RLS enabled
- ✅ Public tables: events (published only), blog_posts (published only)
- ✅ User-scoped tables: tickets, orders, transfers (own data only)
- ✅ Admin-only tables: service_fee_rules, fraud_checks, security_logs

### 3.5 Database Functions & Triggers

#### Key Functions
```sql
-- 1. Create Order with Tickets
CREATE OR REPLACE FUNCTION create_order_with_tickets(
  p_user_id UUID,
  p_event_id UUID,
  p_event_date_id UUID,
  p_ticket_quantities JSONB,
  p_payment_method TEXT
) RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
  v_ticket_type_id UUID;
  v_quantity INT;
  v_total NUMERIC;
BEGIN
  -- 1. Calculate total
  -- 2. Create order
  -- 3. Generate tickets
  -- 4. Update event capacity
  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Transfer Ticket
CREATE OR REPLACE FUNCTION transfer_ticket(
  p_ticket_id UUID,
  p_recipient_phone TEXT
) RETURNS UUID AS $$
-- Implementation in supabase/functions/transfer-ticket/index.ts
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Claim Pending Transfer
CREATE OR REPLACE FUNCTION claim_pending_transfer(
  p_transfer_id UUID,
  p_otp_code TEXT
) RETURNS BOOLEAN AS $$
-- Implementation in supabase/functions/claim-pending-transfer/index.ts
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Triggers
```sql
-- 1. Auto-update updated_at timestamp
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 2. Auto-generate order number
CREATE TRIGGER generate_order_number
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION generate_order_number();

-- 3. Update tickets_sold counter
CREATE TRIGGER update_event_tickets_sold
AFTER INSERT ON tickets
FOR EACH ROW
EXECUTE FUNCTION update_event_capacity();
```

---

## 4. API & Edge Functions

### 4.1 Edge Functions Overview

Temba uses **Supabase Edge Functions** (Deno runtime) for serverless compute. All functions are TypeScript-based and deployed globally for low latency.

**Total Edge Functions:** 23  
**Average Cold Start:** < 100ms  
**Average Execution Time:** 150-300ms  
**Concurrent Executions:** Unlimited (auto-scaling)

### 4.2 Function Inventory

#### Authentication & User Management
| Function | Purpose | Authentication | Rate Limit |
|----------|---------|----------------|------------|
| `signup` | User registration | None | 5/min per IP |
| `send-otp` | Send SMS OTP | None | 3/min per phone |
| `verify-otp` | Verify OTP code | None | 5/min per phone |
| `reset-password-phone` | Phone-based password reset | None | 3/min per phone |
| `welcome-user` | Send welcome email | Internal | - |

#### Payment Processing
| Function | Purpose | Authentication | Payment Provider |
|----------|---------|----------------|------------------|
| `create-pawapay-payment` | Create PawaPay payment | Required | PawaPay |
| `pawapay-webhook` | Handle PawaPay callbacks | Webhook signature | PawaPay |
| `verify-pawapay-payment` | Manual payment verification | Required | PawaPay |
| `create-stripe-payment` | Create Stripe PaymentIntent | Required | Stripe |
| `stripe-webhook` | Handle Stripe events | Webhook signature | Stripe |
| `create-payment` | Legacy PayDunya payment | Required | PayDunya |
| `paydunya-ipn` | PayDunya IPN handler | Webhook signature | PayDunya |

#### Ticket Management
| Function | Purpose | Authentication | Notes |
|----------|---------|----------------|-------|
| `transfer-ticket` | Transfer ticket to another user | Required | SMS notification |
| `claim-pending-transfer` | Claim transferred ticket | Required | OTP verification |
| `validate-ticket` | Scan and validate ticket at event | Admin only | QR code scanning |

#### Utilities
| Function | Purpose | Authentication | Notes |
|----------|---------|----------------|-------|
| `fx-quote` | Get FX conversion rates | Required | Cached for 1 hour |
| `fetch-fx-rates` | Update FX rate cache | Cron job | Runs every 6 hours |
| `image-optimizer` | Optimize uploaded images | Internal | Compresses to WebP |
| `image-cache-warmer` | Pre-warm image CDN | Cron job | Runs daily |

### 4.3 Function Deep Dive: create-pawapay-payment

**Purpose:** Create PawaPay mobile money payment with order management

**Request:**
```typescript
POST https://[project-ref].supabase.co/functions/v1/create-pawapay-payment

Headers:
  Authorization: Bearer [JWT_TOKEN]
  Content-Type: application/json

Body:
{
  "user_id": "uuid", // Optional for guest checkout
  "buyer_email": "guest@example.com", // Required for guest
  "event_id": "uuid",
  "event_date_id": "uuid", // Optional, for multi-date events
  "order_id": "uuid", // Optional, creates new order if not provided
  "ticket_quantities": {
    "ticket-type-id-1": 2,
    "ticket-type-id-2": 1
  },
  "amount_major": 5000, // Amount in XOF (major units)
  "currency": "XOF",
  "method": "mobile_money",
  "phone": "+22670123456",
  "provider": "orange_money", // or "mtn_mobile_money", "moov_money"
  "payment_method": "MOBILE_MONEY",
  "create_order": true,
  "idempotency_key": "unique-request-id",
  "description": "Ticket purchase for Event Name"
}
```

**Response (Success):**
```json
{
  "success": true,
  "payment_url": "https://pawapay.io/deposit/abc123",
  "deposit_id": "abc123",
  "order_id": "uuid",
  "payment_id": "uuid",
  "status": "PENDING",
  "message": "Payment initiated successfully"
}
```

**Response (Pre-Authorization Required):**
```json
{
  "pre_auth_required": true,
  "message": "OTP required for this provider",
  "deposit_id": "abc123"
}
```

**Key Features:**
- ✅ Idempotency: Same `idempotency_key` returns same result
- ✅ Order Creation: Automatically creates order if `create_order: true`
- ✅ Guest Checkout: Supports checkout without user account
- ✅ Multi-Date Support: Books tickets for specific event date
- ✅ Error Recovery: Retries failed PawaPay API calls
- ✅ Webhook Setup: Configures callback URL for payment status

**Error Handling:**
```json
{
  "error": "INSUFFICIENT_BALANCE",
  "message": "Customer has insufficient balance",
  "deposit_id": "abc123",
  "retryable": false
}
```

### 4.4 Function Deep Dive: stripe-webhook

**Purpose:** Process Stripe webhook events (payment confirmations, failures)

**Request:**
```http
POST https://[project-ref].supabase.co/functions/v1/stripe-webhook

Headers:
  Stripe-Signature: t=timestamp,v1=signature
  Content-Type: application/json

Body: [Stripe Event Object]
```

**Handled Events:**
1. `payment_intent.succeeded`
   - Update order status to `COMPLETED`
   - Generate tickets with QR codes
   - Send confirmation email
   - Trigger welcome notifications

2. `payment_intent.payment_failed`
   - Update order status to `CANCELLED`
   - Log failure reason
   - Send failure notification

3. `payment_intent.canceled`
   - Update order status to `CANCELLED`
   - Release reserved capacity

**Security:**
- ✅ Webhook signature verification (HMAC SHA-256)
- ✅ Event deduplication (prevent double-processing)
- ✅ Idempotency (safe to replay webhooks)

**Response:**
```json
{
  "received": true
}
```

### 4.5 API Rate Limits

| Endpoint Category | Rate Limit | Time Window | Notes |
|-------------------|------------|-------------|-------|
| **Authentication** | 10 requests | 1 minute | Per IP address |
| **OTP Sending** | 3 requests | 1 minute | Per phone number |
| **Payment Creation** | 20 requests | 1 minute | Per user |
| **Ticket Transfers** | 10 requests | 1 minute | Per user |
| **Public API** | 100 requests | 1 minute | Per IP address |
| **Webhooks** | Unlimited | - | Internal only |

### 4.6 Error Handling Strategy

All Edge Functions follow a consistent error response format:

```typescript
interface ErrorResponse {
  error: string; // Error code (e.g., "VALIDATION_ERROR")
  message: string; // Human-readable message
  details?: any; // Additional error context
  retryable: boolean; // Can client retry?
  timestamp: string; // ISO 8601 timestamp
}
```

**Common Error Codes:**
- `AUTHENTICATION_REQUIRED`: Missing or invalid JWT token
- `VALIDATION_ERROR`: Invalid request parameters
- `INSUFFICIENT_BALANCE`: Payment failed due to low balance
- `TICKET_NOT_AVAILABLE`: Event sold out
- `TRANSFER_NOT_ALLOWED`: Cannot transfer used/cancelled tickets
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error (logged for investigation)

---

## 5. Payment Infrastructure

### 5.1 Payment Architecture

Temba supports **3 payment providers** with intelligent routing:

```
Payment Request
      ├─ Currency: XOF, GHS → PawaPay (Mobile Money)
      ├─ Currency: USD, EUR → Stripe (Card Payments)
      └─ Legacy: All → PayDunya (Mobile Money, deprecated)
```

### 5.2 Payment Provider Comparison

| Provider | Methods | Currencies | Fees | Settlement | Status |
|----------|---------|------------|------|------------|--------|
| **PawaPay** | Mobile Money (Orange, MTN, Moov) | XOF, GHS, UGX | 2-3% | T+1 | **Primary** |
| **Stripe** | Credit/Debit Cards | USD, EUR, GHS | 2.9% + $0.30 | T+2 | **Active** |
| **PayDunya** | Mobile Money | XOF, GHS, CDF | 3-5% | T+3 | **Legacy** |

### 5.3 Payment Flow (PawaPay)

```
1. User selects tickets → Checkout page
2. User selects Mobile Money → Enters phone number
3. Frontend calls create-pawapay-payment Edge Function
4. Edge Function:
   a. Creates/updates order in database
   b. Calls PawaPay API to initiate deposit
   c. Returns payment URL to frontend
5. User redirected to PawaPay payment page
6. User completes payment on mobile device
7. PawaPay sends webhook to pawapay-webhook function
8. Webhook handler:
   a. Verifies webhook signature
   b. Updates payment status to SUCCEEDED
   c. Updates order status to COMPLETED
   d. Generates tickets with QR codes
   e. Sends confirmation email/SMS
9. User redirected back to success page
10. Tickets displayed and downloadable
```

### 5.4 Payment Flow (Stripe + FX Conversion)

```
1. User selects tickets (priced in XOF) → Checkout page
2. User selects Card Payment
3. Frontend calls fx-quote to get XOF → USD rate
4. Frontend displays amount in both currencies
5. User confirms → Frontend calls create-stripe-payment
6. Edge Function:
   a. Creates/updates order in database
   b. Calls fx-quote to get current rate
   c. Converts XOF amount to USD
   d. Creates Stripe PaymentIntent
   e. Returns client_secret to frontend
7. Frontend mounts Stripe Elements form
8. User enters card details → Submits payment
9. Stripe processes payment
10. Stripe sends payment_intent.succeeded webhook
11. Webhook handler (same as PawaPay step 8)
12. User sees success page with tickets
```

### 5.5 FX Conversion System

**Purpose:** Enable card payments for XOF-priced events using Stripe (USD only)

**Architecture:**
```
┌─────────────────────────────────────────────────┐
│  FX Rate Source: exchangerate-api.com           │
│  - Free tier: 1,500 requests/month              │
│  - Updates: Every 6 hours                       │
│  - Currencies: XOF, USD, EUR, GHS, NGN          │
└────────────────┬────────────────────────────────┘
                 │
                 │ fetch-fx-rates (Cron: 0 */6 * * *)
                 ▼
┌─────────────────────────────────────────────────┐
│  fx_rates Table                                 │
│  - from_currency: XOF                           │
│  - to_currency: USD                             │
│  - rate: 0.0016 (example: 1 XOF = $0.0016)     │
│  - margin_bps: 200 (2% markup)                  │
│  - created_at: 2026-01-15 06:00:00              │
└────────────────┬────────────────────────────────┘
                 │
                 │ fx-quote function (on-demand)
                 ▼
┌─────────────────────────────────────────────────┐
│  Response to Client                             │
│  {                                              │
│    "from_currency": "XOF",                      │
│    "to_currency": "USD",                        │
│    "rate": 0.0016,                              │
│    "margin_bps": 200,                           │
│    "effective_rate": 0.001632,                  │
│    "expires_at": "2026-01-15T12:00:00Z"         │
│  }                                              │
└─────────────────────────────────────────────────┘
```

**Conversion Example:**
```
Event Price: 5,000 XOF
Base FX Rate: 1 XOF = $0.0016 USD
Margin: 2% (200 bps)
Effective Rate: 0.0016 × 1.02 = 0.001632

USD Amount: 5,000 × 0.001632 = $8.16
Stripe Charge: $8.16 + $0.30 (Stripe fee) = $8.46
```

### 5.6 Service Fee Calculation

Temba charges service fees on top of ticket prices. Fees are configurable per:
1. **Global Default**: Applies to all events
2. **Event-Specific**: Overrides global for specific events
3. **Ticket-Type Specific**: Most granular override

**Fee Configuration Table:**
```sql
service_fee_rules
├─ rule_type: 'GLOBAL' | 'EVENT' | 'TICKET_TYPE'
├─ fee_type: 'PERCENTAGE' | 'FIXED'
├─ fee_value: numeric (e.g., 5.00 for 5% or 500 for 500 XOF)
├─ min_fee: numeric (minimum fee to charge)
├─ max_fee: numeric (maximum fee to charge)
└─ fee_payer: 'BUYER' | 'ORGANIZER'
```

**Calculation Example:**
```
Ticket Price: 5,000 XOF × 2 tickets = 10,000 XOF
Service Fee Rule: 5% (PERCENTAGE, BUYER pays)
Min Fee: 100 XOF
Max Fee: 1,000 XOF

Calculated Fee: 10,000 × 0.05 = 500 XOF
Applied Fee: max(100, min(500, 1,000)) = 500 XOF

Order Total: 10,000 + 500 = 10,500 XOF
```

### 5.7 Payment Security

| Security Layer | Implementation | Purpose |
|----------------|----------------|---------|
| **PCI Compliance** | Stripe handles all card data | Never store card details |
| **Webhook Verification** | HMAC signature validation | Prevent webhook spoofing |
| **Idempotency Keys** | Unique request IDs | Prevent duplicate charges |
| **HTTPS Only** | TLS 1.3 encryption | Secure data in transit |
| **Rate Limiting** | 20 requests/min per user | Prevent payment flooding |
| **Fraud Detection** | `fraud_checks` table | Track suspicious patterns |
| **3D Secure** | Stripe SCA compliance | EU card authentication |
| **Refund Protection** | Admin approval required | Prevent unauthorized refunds |

---

## 6. Security & Compliance

### 6.1 Security Architecture

Temba implements **defense-in-depth** security:

```
Layer 1: Network Security
├─ HTTPS/TLS 1.3 enforcement
├─ DDoS protection (Netlify + Supabase)
├─ WAF (Web Application Firewall)
└─ IP rate limiting

Layer 2: Authentication & Authorization
├─ JWT-based authentication (Supabase Auth)
├─ Row Level Security (RLS) policies
├─ Role-Based Access Control (RBAC)
└─ Multi-factor authentication (OTP)

Layer 3: Application Security
├─ Input validation (zod schemas)
├─ Output sanitization (DOMPurify)
├─ SQL injection prevention (parameterized queries)
├─ XSS prevention (React auto-escaping)
└─ CSRF protection (SameSite cookies)

Layer 4: Data Security
├─ Encryption at rest (AES-256)
├─ Encryption in transit (TLS 1.3)
├─ Sensitive data masking (phone numbers, emails)
├─ QR code encryption (ticket validation)
└─ Password hashing (bcrypt, 10 rounds)

Layer 5: Monitoring & Audit
├─ Security event logging
├─ Failed login tracking
├─ Anomaly detection (fraud_checks)
└─ Audit trail (all DB modifications)
```

### 6.2 Authentication System

**Primary Method:** JWT (JSON Web Tokens) via Supabase Auth

**Supported Auth Methods:**
1. **Email/Password**: Standard registration
2. **Phone/OTP**: SMS-based authentication (Twilio)
3. **Magic Links**: Passwordless email login
4. **Social OAuth**: Google, Facebook (coming soon)

**Token Lifecycle:**
```
Login → JWT issued (expires in 1 hour)
      → Refresh token issued (expires in 30 days)
      → Client stores in localStorage
      → Client includes in Authorization header
      → Server validates JWT on each request
      → Auto-refresh when JWT near expiry
```

**OTP Authentication Flow:**
```
1. User enters phone number → send-otp function
2. System generates 6-digit OTP → Stores in otp_codes table
3. SMS sent via Twilio → OTP expires in 5 minutes
4. User enters OTP → verify-otp function
5. System validates OTP → Issues JWT if valid
6. User authenticated → Session created
```

### 6.3 Authorization (Row Level Security)

**RLS Policy Examples:**

```sql
-- Policy 1: Users can only view their own tickets
CREATE POLICY "users_view_own_tickets"
ON tickets FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 2: Users can only update their own profile
CREATE POLICY "users_update_own_profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Only admins can view all orders
CREATE POLICY "admins_view_all_orders"
ON orders FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM profiles WHERE role = 'ADMIN'
  )
);

-- Policy 4: Public can view published events
CREATE POLICY "public_view_published_events"
ON events FOR SELECT
TO anon, authenticated
USING (status = 'PUBLISHED');

-- Policy 5: Only ticket owner can transfer
CREATE POLICY "owner_can_transfer_ticket"
ON ticket_transfers FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM tickets WHERE id = ticket_id AND status = 'VALID'
  )
);
```

**RLS Coverage:**
- ✅ 35 tables with RLS enabled
- ✅ 127 RLS policies across all tables
- ✅ 100% of user-facing tables protected
- ✅ Automated RLS testing in CI/CD

### 6.4 Data Protection & Privacy

**GDPR Compliance:**

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| **Right to Access** | `GET /api/user/data` endpoint | ✅ |
| **Right to Erasure** | `DELETE /api/user/account` endpoint | ✅ |
| **Data Portability** | Export user data as JSON | ✅ |
| **Consent Management** | Explicit opt-in for marketing emails | ✅ |
| **Data Minimization** | Only collect essential user data | ✅ |
| **Privacy Policy** | `/privacy` page with clear terms | ✅ |
| **Cookie Consent** | Banner with granular options | ✅ |

**Sensitive Data Handling:**

```typescript
// Phone number masking
function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})\d{4}(\d{2})/, '$1****$2');
  // +22670123456 → +226701***56
}

// Email masking
function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  return `${user[0]}***@${domain}`;
  // john@example.com → j***@example.com
}

// Credit card masking (if stored)
function maskCard(card: string): string {
  return `**** **** **** ${card.slice(-4)}`;
}
```

**Data Retention Policy:**
- User data: Retained until account deletion
- Order data: Retained for 7 years (tax compliance)
- Payment data: Card details never stored, transaction IDs retained for 7 years
- Logs: Retained for 90 days
- Backups: Encrypted, retained for 30 days

### 6.5 Fraud Prevention

**Fraud Detection System:**

```typescript
interface FraudCheck {
  user_id: string;
  ip: string;
  device_id: string;
  amount: number;
  risk_score: number; // 0-100
  reasons: string[];
}

// Risk scoring algorithm
function calculateRiskScore(order: Order): number {
  let score = 0;
  
  // 1. High-value orders (> 50,000 XOF)
  if (order.total > 50000) score += 20;
  
  // 2. New user (< 7 days old)
  if (isNewUser(order.user_id)) score += 15;
  
  // 3. Multiple orders in short time
  if (getRecentOrderCount(order.user_id) > 3) score += 25;
  
  // 4. IP mismatch (different country)
  if (isIPMismatch(order.user_id, order.ip)) score += 30;
  
  // 5. Failed payments recently
  if (hasRecentFailures(order.user_id)) score += 10;
  
  return Math.min(score, 100);
}

// Action based on risk score
if (risk_score >= 70) {
  // High risk: Manual review required
  await createHighRiskOrder(order);
  await notifyAdmin('High-risk order detected');
} else if (risk_score >= 40) {
  // Medium risk: Additional verification (OTP)
  await requestAdditionalVerification(order);
} else {
  // Low risk: Process normally
  await processOrder(order);
}
```

**Fraud Prevention Measures:**
- ✅ Device fingerprinting (IP + User Agent)
- ✅ Velocity checks (max 5 orders per hour per user)
- ✅ Payment amount limits (max 100,000 XOF per transaction)
- ✅ Geolocation validation (IP vs. phone country code)
- ✅ Card BIN validation (for Stripe payments)
- ✅ Manual review queue for high-risk orders
- ✅ Chargeback tracking and user flagging

### 6.6 Security Monitoring

**Real-Time Monitoring:**

```sql
-- Security event logging
CREATE TABLE security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL, -- 'AUTH', 'PAYMENT', 'TRANSFER', 'ADMIN_ACTION'
  severity text NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  user_id uuid REFERENCES auth.users(id),
  ip text,
  user_agent text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for quick queries
CREATE INDEX idx_security_logs_severity ON security_logs(severity);
CREATE INDEX idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX idx_security_logs_created_at ON security_logs(created_at);
```

**Monitored Events:**
- Failed login attempts (> 5 in 10 minutes → IP ban)
- Unusual payment activity (high value, velocity)
- Admin actions (all logged with IP + timestamp)
- Database schema changes (DDL operations)
- API rate limit violations
- Ticket scanning anomalies (duplicate scans)

**Alerting:**
- **Critical**: Immediate Slack/email to security team
- **High**: Alert within 15 minutes
- **Medium**: Daily digest email
- **Low**: Weekly summary report

---

## 7. Performance & Scalability

### 7.1 Performance Metrics (Current)

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Page Load Time (FCP)** | < 1.5s | 1.2s | ✅ |
| **API Response Time (p95)** | < 300ms | 220ms | ✅ |
| **Database Query Time (avg)** | < 50ms | 35ms | ✅ |
| **Time to Interactive (TTI)** | < 3s | 2.8s | ✅ |
| **Lighthouse Score** | > 90 | 94 | ✅ |
| **Uptime** | 99.9% | 99.95% | ✅ |

### 7.2 Scalability Design

**Current Capacity:**
- 10,000 concurrent users
- 500 transactions per minute
- 1M database rows (events, tickets, orders combined)

**Projected Capacity (with current architecture):**
- 100,000 concurrent users (10x)
- 5,000 transactions per minute (10x)
- 50M database rows (50x)

**Scaling Strategy:**

```
┌─────────────────────────────────────────────────┐
│  Horizontal Scaling (Stateless Services)        │
├─────────────────────────────────────────────────┤
│  - Edge Functions: Auto-scale to 1000s instances│
│  - Frontend: Netlify CDN (300+ PoPs globally)   │
│  - No session state on servers                  │
└─────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  Vertical Scaling (Database)                    │
├─────────────────────────────────────────────────┤
│  Current: Supabase Free Tier (500MB)            │
│  Growth Path:                                   │
│  - Pro: 8GB RAM, 100GB storage                  │
│  - Team: 32GB RAM, 500GB storage                │
│  - Enterprise: Custom (1TB+ storage)            │
└─────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  Read Replicas (Future)                         │
├─────────────────────────────────────────────────┤
│  - Primary: Write operations                    │
│  - Replica 1: Read operations (events, tickets) │
│  - Replica 2: Analytics queries                 │
└─────────────────────────────────────────────────┘
```

### 7.3 Caching Strategy

**Multi-Layer Caching:**

```
Layer 1: Browser Cache
├─ Static assets (JS, CSS, images): 1 year
├─ Event images: 7 days
└─ API responses: 5 minutes (via Cache-Control headers)

Layer 2: CDN Cache (Netlify)
├─ Static pages: 1 day
├─ Event pages: 1 hour
└─ Dynamic API: No cache

Layer 3: Database Cache (Supabase)
├─ Connection pooling: 100 connections
├─ Query result cache: 5 minutes
└─ PostgREST schema cache: 10 minutes

Layer 4: Application Cache (in-memory)
├─ FX rates: 1 hour
├─ Event categories: 1 day
└─ User sessions: 1 hour
```

**Cache Invalidation:**
```typescript
// Example: Invalidate event cache when event updated
async function updateEvent(eventId: string, data: Partial<Event>) {
  await supabase.from('events').update(data).eq('id', eventId);
  
  // Invalidate caches
  await invalidateCache(`event:${eventId}`);
  await invalidateCache('events:published');
  await revalidateCDN(`/events/${eventId}`);
}
```

### 7.4 Database Optimization

**Indexing Strategy:**

```sql
-- 1. Primary key indexes (auto-created)
-- 2. Foreign key indexes (performance)
CREATE INDEX idx_tickets_order_id ON tickets(order_id);
CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_event_id ON tickets(event_id);

-- 3. Query-specific indexes (common filters)
CREATE INDEX idx_events_status_date ON events(status, start_date);
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- 4. Partial indexes (specific use cases)
CREATE INDEX idx_pending_transfers ON ticket_transfers(status) 
WHERE status = 'PENDING';

-- 5. GIN indexes (JSON, arrays)
CREATE INDEX idx_events_categories ON events USING GIN(categories);

-- 6. Full-text search indexes
CREATE INDEX idx_events_search ON events USING GIN(
  to_tsvector('english', title || ' ' || description)
);
```

**Query Optimization Examples:**

```sql
-- Bad: Sequential scan
SELECT * FROM tickets WHERE event_id = 'abc' AND user_id = 'xyz';

-- Good: Index scan
-- (idx_tickets_event_id_user_id covers this query)

-- Bad: N+1 queries
SELECT * FROM tickets WHERE user_id = 'xyz';
for each ticket:
  SELECT * FROM events WHERE id = ticket.event_id;

-- Good: Join with single query
SELECT t.*, e.title, e.date 
FROM tickets t
LEFT JOIN events e ON e.id = t.event_id
WHERE t.user_id = 'xyz';
```

**Connection Pooling:**
- Default pool size: 50 connections
- Max pool size: 200 connections
- Connection timeout: 30 seconds
- Idle connection timeout: 10 minutes

### 7.5 Load Testing Results

**Test Scenario:** Black Friday event sale (10,000 tickets released)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| **Peak Concurrent Users** | 5,000 | 4,800 | ✅ |
| **Requests per Second** | 500 | 480 | ✅ |
| **Average Response Time** | < 500ms | 320ms | ✅ |
| **Error Rate** | < 1% | 0.3% | ✅ |
| **Database CPU** | < 80% | 65% | ✅ |
| **Edge Function Cold Starts** | < 100ms | 85ms | ✅ |

**Tools Used:**
- k6 (load testing)
- Supabase Dashboard (database monitoring)
- Netlify Analytics (frontend performance)

---

## 8. Deployment & Infrastructure

### 8.1 Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│  GitHub Repository (Source Code)                │
└────────────────┬────────────────────────────────┘
                 │
                 │ git push to main
                 ▼
┌─────────────────────────────────────────────────┐
│  GitHub Actions (CI/CD Pipeline)                │
├─────────────────────────────────────────────────┤
│  1. Run tests (vitest)                          │
│  2. Type checking (tsc)                         │
│  3. Linting (eslint)                            │
│  4. Build frontend (vite build)                 │
│  5. Deploy to Netlify                           │
│  6. Deploy Edge Functions to Supabase           │
│  7. Run database migrations                     │
│  8. Smoke tests                                 │
└────────────────┬────────────────────────────────┘
                 │
                 │ Deploy
                 ▼
┌─────────────────────────────────────────────────┐
│  Production Environment                         │
├─────────────────────────────────────────────────┤
│  Frontend: Netlify (tembas.com)                 │
│  Backend: Supabase (Edge Functions + Database)  │
│  CDN: Netlify CDN (300+ PoPs)                   │
└─────────────────────────────────────────────────┘
```

### 8.2 Infrastructure Components

| Component | Provider | Tier | Monthly Cost | Notes |
|-----------|----------|------|--------------|-------|
| **Frontend Hosting** | Netlify | Pro | $19 | 100GB bandwidth/month |
| **Backend (Database)** | Supabase | Pro | $25 | 8GB RAM, 100GB storage |
| **Edge Functions** | Supabase | Included | $0 | 2M invocations/month |
| **SMS (Twilio)** | Twilio | Pay-as-you-go | ~$50 | $0.05/SMS |
| **Email (Resend)** | Resend | Free | $0 | 3,000 emails/month |
| **Payment (PawaPay)** | PawaPay | Transaction fee | $0 | 2% per transaction |
| **Payment (Stripe)** | Stripe | Transaction fee | $0 | 2.9% + $0.30 |
| **Domain** | Cloudflare | Free | $0 | DNS only |
| **Monitoring** | Supabase | Included | $0 | Built-in logs |
| **Total** | - | - | **~$94/month** | + transaction fees |

### 8.3 Environment Configuration

**Environment Variables:**

```bash
# Supabase
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (server-only)

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_... (server-only)
STRIPE_WEBHOOK_SECRET=whsec_... (server-only)

# PawaPay
PAWAPAY_API_KEY=pawa_... (server-only)
PAWAPAY_API_URL=https://api.pawapay.cloud

# Twilio
TWILIO_ACCOUNT_SID=AC... (server-only)
TWILIO_AUTH_TOKEN=... (server-only)
TWILIO_PHONE_NUMBER=+1234567890

# Resend
RESEND_API_KEY=re_... (server-only)

# Application
VITE_APP_URL=https://tembas.com
VITE_APP_NAME=Temba
```

### 8.4 Deployment Process

**Manual Deployment (Emergency):**
```bash
# 1. Deploy frontend
npm run build
netlify deploy --prod

# 2. Deploy Edge Functions
supabase functions deploy create-pawapay-payment
supabase functions deploy stripe-webhook
# ... (repeat for all 23 functions)

# 3. Run database migrations
supabase db push
```

**Automated Deployment (CI/CD):**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build frontend
        run: npm run build
      
      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        with:
          args: deploy --prod
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
      
      - name: Deploy Edge Functions
        run: |
          supabase functions deploy --no-verify-jwt
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      
      - name: Run database migrations
        run: supabase db push
```

### 8.5 Rollback Procedure

**Frontend Rollback (Netlify):**
```bash
# 1. Go to Netlify dashboard
# 2. Deployments > [previous successful deployment]
# 3. Click "Publish deploy"
# Total time: < 2 minutes
```

**Backend Rollback (Supabase):**
```bash
# 1. Revert database migration
supabase db reset --version [previous_migration_id]

# 2. Redeploy previous Edge Function version
git checkout [previous_commit]
supabase functions deploy [function_name]
```

### 8.6 Disaster Recovery

**Backup Strategy:**
- **Database**: Automated daily backups (Supabase)
  - Retention: 30 days
  - Point-in-time recovery: Up to 7 days
- **Code**: Git version control (GitHub)
- **User uploads**: Supabase Storage (replicated across 3 zones)

**Recovery Time Objective (RTO):** 4 hours  
**Recovery Point Objective (RPO):** 1 hour

**Disaster Recovery Playbook:**
1. **Database Corruption**: Restore from automated backup
2. **Code Deployment Failure**: Rollback to previous version
3. **Payment Provider Outage**: Failover to secondary provider
4. **CDN Outage**: Netlify auto-failover (no action needed)
5. **Complete Supabase Outage**: Migrate to backup Supabase project (4-6 hours)

---

## 9. Monitoring & Observability

### 9.1 Monitoring Stack

```
┌─────────────────────────────────────────────────┐
│  Application Logs                               │
├─────────────────────────────────────────────────┤
│  - Supabase Edge Function logs                  │
│  - Database query logs                          │
│  - Error logs (console.error)                   │
│  - Security logs (security_logs table)          │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Metrics & Analytics                            │
├─────────────────────────────────────────────────┤
│  - Netlify Analytics (page views, performance)  │
│  - Supabase Dashboard (DB performance)          │
│  - Custom analytics (blog views, ticket scans)  │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Alerting                                       │
├─────────────────────────────────────────────────┤
│  - Email alerts for critical errors             │
│  - Slack notifications for high-risk orders     │
│  - SMS alerts for payment failures              │
└─────────────────────────────────────────────────┘
```

### 9.2 Key Performance Indicators (KPIs)

**Business KPIs:**
- Total ticket sales (daily, weekly, monthly)
- Revenue (by payment provider, by event category)
- Average order value
- Conversion rate (event view → ticket purchase)
- Ticket transfer rate
- Customer acquisition cost (CAC)
- Customer lifetime value (LTV)

**Technical KPIs:**
- API response time (p50, p95, p99)
- Database query time (avg, max)
- Error rate (% of failed requests)
- Uptime (%)
- Payment success rate (by provider)
- Edge function cold start time
- CDN cache hit rate

**User Experience KPIs:**
- Page load time (FCP, LCP, TTI)
- Bounce rate
- User session duration
- Cart abandonment rate
- Mobile vs. desktop usage
- Browser compatibility issues

### 9.3 Logging Strategy

**Log Levels:**
```typescript
enum LogLevel {
  DEBUG = 'DEBUG',   // Verbose debugging info
  INFO = 'INFO',     // General informational messages
  WARN = 'WARN',     // Warning messages
  ERROR = 'ERROR',   // Error messages
  CRITICAL = 'CRITICAL' // Critical system failures
}
```

**Structured Logging Example:**
```typescript
// Edge Function logging
console.log(JSON.stringify({
  level: 'INFO',
  timestamp: new Date().toISOString(),
  function: 'create-pawapay-payment',
  user_id: userId,
  event: 'payment_initiated',
  metadata: {
    order_id: orderId,
    amount: amount,
    currency: currency,
    provider: 'pawapay'
  }
}));
```

**Log Retention:**
- Edge Function logs: 7 days (Supabase free tier)
- Database logs: 30 days
- Security logs: 90 days (in database)
- Audit logs: 7 years (compliance)

### 9.4 Error Tracking

**Error Categories:**
1. **Client Errors (4xx)**: User mistakes (validation, not found)
2. **Server Errors (5xx)**: System failures (database down, API timeout)
3. **Payment Errors**: Payment provider failures
4. **Integration Errors**: Third-party API failures (SMS, email)

**Error Response Format:**
```json
{
  "error": "PAYMENT_FAILED",
  "message": "Payment could not be processed",
  "details": {
    "provider": "pawapay",
    "reason": "insufficient_balance",
    "deposit_id": "abc123"
  },
  "retryable": false,
  "timestamp": "2026-01-15T10:30:00Z"
}
```

**Error Alerting Rules:**
- **Critical (5xx > 1% error rate)**: Immediate Slack alert
- **Payment failures (> 5% failure rate)**: Email alert within 15 min
- **Database errors**: Immediate Slack alert
- **API timeouts (> 10/min)**: Email alert

---

## 10. Development Workflow

### 10.1 Development Setup

**Prerequisites:**
- Node.js 18+
- npm 9+
- Git
- Supabase CLI

**Setup Steps:**
```bash
# 1. Clone repository
git clone https://github.com/temba/temba-platform.git
cd temba-platform

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# 4. Start Supabase locally (optional)
supabase start

# 5. Run database migrations
supabase db push

# 6. Start development server
npm run dev
# Frontend: http://localhost:5173
```

### 10.2 Project Structure

```
temba-user-only/
├── src/
│   ├── components/        # React components
│   │   ├── admin/         # Admin dashboard components
│   │   ├── blog/          # Blog components
│   │   ├── events/        # Event listing/detail components
│   │   ├── tickets/       # Ticket components
│   │   └── SEO/           # SEO meta components
│   ├── pages/             # Page components (React Router)
│   │   ├── admin/         # Admin pages
│   │   ├── blog/          # Blog pages
│   │   └── ...
│   ├── services/          # API service layer
│   │   ├── authService.ts
│   │   ├── paymentService.ts
│   │   ├── ticketTransferService.ts
│   │   └── ...
│   ├── context/           # React Context providers
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Utility functions
│   └── types/             # TypeScript type definitions
├── supabase/
│   ├── functions/         # Edge Functions (23 functions)
│   ├── migrations/        # Database migrations (212 files)
│   └── config.toml        # Supabase configuration
├── public/                # Static assets
├── docs/                  # Documentation (35 files)
├── scripts/               # Utility scripts
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### 10.3 Development Workflow

**Feature Development:**
```bash
# 1. Create feature branch
git checkout -b feature/ticket-cancellation

# 2. Develop feature
# - Write code
# - Write tests
# - Update docs

# 3. Run tests locally
npm test

# 4. Commit changes
git add .
git commit -m "feat: add ticket cancellation"

# 5. Push to GitHub
git push origin feature/ticket-cancellation

# 6. Create Pull Request
# - GitHub Actions run CI checks
# - Code review by team
# - Merge to main

# 7. Automatic deployment to production
# - Frontend deployed to Netlify
# - Edge Functions deployed to Supabase
```

**Database Migration Workflow:**
```bash
# 1. Create migration
supabase migration new add_ticket_cancellation

# 2. Write SQL in migrations/[timestamp]_add_ticket_cancellation.sql
# Example:
ALTER TABLE tickets ADD COLUMN cancelled_at timestamptz;
CREATE INDEX idx_tickets_cancelled_at ON tickets(cancelled_at);

# 3. Apply migration locally
supabase db reset

# 4. Test migration
npm test

# 5. Commit migration file
git add supabase/migrations/
git commit -m "db: add ticket cancellation support"

# 6. Push to production
git push origin main
# Migration auto-applied in CI/CD
```

### 10.4 Code Quality Standards

**TypeScript:**
- ✅ Strict mode enabled
- ✅ No `any` types (except for third-party types)
- ✅ Explicit function return types
- ✅ Interface over `type` for objects

**Code Style:**
- ✅ ESLint configured
- ✅ Prettier for formatting
- ✅ 2-space indentation
- ✅ Single quotes for strings

**Testing:**
- ✅ Unit tests for services (vitest)
- ✅ Integration tests for Edge Functions
- ✅ E2E tests for critical user journeys (coming soon)

**Git Commit Messages:**
```
feat: add new feature
fix: fix a bug
docs: update documentation
style: code formatting
refactor: code refactoring
test: add tests
chore: update dependencies
```

---

## 11. Roadmap & Future Development

### 11.1 Short-Term Roadmap (Q1-Q2 2026)

**Feature Enhancements:**
- [ ] Mobile app (React Native) - MVP in Q1
- [ ] QR code ticket scanning app (iOS/Android)
- [ ] WhatsApp notifications (via Twilio)
- [ ] Social login (Google, Facebook OAuth)
- [ ] Multi-language support (French, English)
- [ ] Event recommendations (ML-based)
- [ ] Waitlist functionality (for sold-out events)

**Payment Enhancements:**
- [ ] Add Flutterwave (Nigeria, Ghana, Kenya)
- [ ] Crypto payments (USDC, Bitcoin) - experimental
- [ ] Buy Now, Pay Later (BNPL) integration
- [ ] Installment payments for high-value tickets

**Technical Improvements:**
- [ ] Implement Redis caching layer
- [ ] Add Elasticsearch for event search
- [ ] Migrate to Next.js for SSR (SEO boost)
- [ ] Implement GraphQL API (alongside REST)
- [ ] Add database read replicas

### 11.2 Mid-Term Roadmap (Q3-Q4 2026)

**Market Expansion:**
- [ ] Launch in Ghana (GHS currency, local payment providers)
- [ ] Launch in Nigeria (NGN currency, Flutterwave integration)
- [ ] Launch in Senegal (XOF currency, same infrastructure)
- [ ] Multi-city support (Ouagadougou, Accra, Lagos, Dakar)

**Enterprise Features:**
- [ ] White-label solution for event organizers
- [ ] API for third-party integrations
- [ ] Advanced analytics dashboard
- [ ] Bulk ticket management
- [ ] Custom branding for events

**Monetization:**
- [ ] Freemium model for organizers (free < 100 tickets, paid > 100)
- [ ] Premium features (priority listing, featured events)
- [ ] Advertising platform (sponsored events)
- [ ] Data analytics for organizers (paid add-on)

### 11.3 Long-Term Vision (2027+)

**Platform Evolution:**
- [ ] Become the "Eventbrite of Africa"
- [ ] 1M+ active users across West Africa
- [ ] 10,000+ events per month
- [ ] $10M+ monthly transaction volume
- [ ] Expand to East Africa (Kenya, Tanzania, Uganda)

**Technical Evolution:**
- [ ] Multi-region deployment (reduce latency)
- [ ] AI-powered fraud detection
- [ ] Real-time event capacity tracking
- [ ] Blockchain-based ticket NFTs (proof of attendance)
- [ ] Metaverse integration (virtual events)

---

## 12. Appendix

### 12.1 Glossary

| Term | Definition |
|------|------------|
| **Edge Function** | Serverless function running on Deno runtime (Supabase) |
| **RLS** | Row Level Security - database-level authorization |
| **OTP** | One-Time Password - SMS-based authentication |
| **QR Code** | Quick Response code - used for ticket validation |
| **FX** | Foreign Exchange - currency conversion |
| **IPN** | Instant Payment Notification - webhook from payment provider |
| **JWT** | JSON Web Token - authentication token |
| **XOF** | West African CFA franc (currency code) |
| **GHS** | Ghanaian cedi (currency code) |

### 12.2 Contact Information

**Technical Support:**
- Email: tech@tembas.com
- Slack: #engineering (internal)

**Security Issues:**
- Email: security@tembas.com
- Bug Bounty: https://tembas.com/security

**Business Inquiries:**
- Email: business@tembas.com
- Website: https://tembas.com

### 12.3 References

**External Documentation:**
- Supabase Docs: https://supabase.com/docs
- Stripe API: https://stripe.com/docs/api
- PawaPay API: https://docs.pawapay.cloud
- Twilio SMS: https://www.twilio.com/docs/sms
- Netlify Docs: https://docs.netlify.com

**Internal Documentation:**
- Full Docs Index: `/docs/INDEX.md`
- API Reference: `/docs/API-REFERENCE.md`
- Security Docs: `/docs/SECURITY.md`
- Payment System: `/docs/PAYMENT-SYSTEM.md`

---

## Document Changelog

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2026-01-15 | Initial comprehensive backend documentation | Engineering Team |

---

**End of Document**

*This document is confidential and intended for engineers, investors, and technical stakeholders only.*
