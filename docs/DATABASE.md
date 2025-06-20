# AfriTix Database Schema Documentation

## Overview
The AfriTix platform uses PostgreSQL via Supabase for data storage. This document outlines the complete database schema, relationships, and key functions.

## Core Tables

### Users and Authentication
```sql
-- Profiles (extends Supabase Auth users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  location text,
  bio text,
  role text NOT NULL DEFAULT 'USER',
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Events and Ticketing

#### Events
```sql
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  date date NOT NULL,
  time text NOT NULL,
  location text NOT NULL,
  image_url text NOT NULL,
  price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'XOF',
  capacity integer NOT NULL,
  tickets_sold integer DEFAULT 0,
  status text NOT NULL DEFAULT 'DRAFT',
  featured boolean DEFAULT false,
  categories text[],
  venue_layout_id uuid REFERENCES venue_layouts,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Ticket Types
```sql
CREATE TABLE ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  price numeric NOT NULL,
  quantity integer NOT NULL,
  available integer NOT NULL,
  max_per_order integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Orders
```sql
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  event_id uuid REFERENCES events ON DELETE CASCADE,
  total numeric NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  payment_method text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Tickets
```sql
CREATE TABLE tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders ON DELETE CASCADE,
  event_id uuid REFERENCES events ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  ticket_type_id uuid REFERENCES ticket_types ON DELETE CASCADE,
  seat_id uuid REFERENCES venue_seats,
  status text NOT NULL DEFAULT 'VALID',
  qr_code text UNIQUE NOT NULL,
  scanned_at timestamptz,
  scanned_by uuid REFERENCES auth.users,
  scan_location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Venue Management

#### Venue Layouts
```sql
CREATE TABLE venue_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Venue Sections
```sql
CREATE TABLE venue_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id uuid REFERENCES venue_layouts ON DELETE CASCADE,
  name text NOT NULL,
  capacity integer NOT NULL,
  price numeric NOT NULL,
  coordinates jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Venue Seats
```sql
CREATE TABLE venue_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES venue_sections ON DELETE CASCADE,
  row text NOT NULL,
  number integer NOT NULL,
  coordinates jsonb NOT NULL,
  status text NOT NULL DEFAULT 'available',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(section_id, row, number)
);
```

### Support System

#### Support Categories
```sql
CREATE TABLE support_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);
```

#### Support Tickets
```sql
CREATE TABLE support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  category_id uuid REFERENCES support_categories,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN',
  priority text NOT NULL DEFAULT 'MEDIUM',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  last_reply_at timestamptz
);
```

#### Support Messages
```sql
CREATE TABLE support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES support_tickets ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  message text NOT NULL,
  is_staff_reply boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

### Content Management

#### Pages
```sql
CREATE TABLE pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text NOT NULL,
  meta_title text,
  meta_description text,
  published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Banners
```sql
CREATE TABLE banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_url text NOT NULL,
  link text,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### FAQs
```sql
CREATE TABLE faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Security and Monitoring

#### Fraud Checks
```sql
CREATE TABLE fraud_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  ip text NOT NULL,
  device_id text NOT NULL,
  amount numeric NOT NULL,
  risk_score integer NOT NULL,
  reasons text,
  created_at timestamptz DEFAULT now()
);
```

#### High Risk Orders
```sql
CREATE TABLE high_risk_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  event_id uuid REFERENCES events ON DELETE CASCADE,
  amount numeric NOT NULL,
  risk_level text NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  reasons text,
  ip text NOT NULL,
  device_id text NOT NULL,
  reviewed boolean DEFAULT false,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
```

## Key Functions

### Ticket Management
```sql
-- Function to create an order with tickets
CREATE OR REPLACE FUNCTION create_order(
  p_event_id UUID,
  p_user_id UUID,
  p_ticket_quantities JSONB,
  p_payment_method TEXT,
  p_seat_ids UUID[] DEFAULT NULL
) RETURNS UUID;

-- Function to scan and validate tickets
CREATE OR REPLACE FUNCTION scan_ticket(
  p_ticket_id UUID,
  p_scanned_by UUID,
  p_scan_location TEXT DEFAULT NULL
) RETURNS JSONB;
```

### Venue Management
```sql
-- Functions to manage seats
CREATE OR REPLACE FUNCTION validate_seats(
  p_event_id UUID,
  p_seat_ids UUID[]
) RETURNS BOOLEAN;

CREATE OR REPLACE FUNCTION reserve_seats(
  p_event_id UUID,
  p_seat_ids UUID[]
) RETURNS BOOLEAN;
```

## Row Level Security (RLS)

### Events
```sql
-- Public can view published events
CREATE POLICY "Enable read access for all users"
  ON events FOR SELECT
  USING (status = 'PUBLISHED' OR auth.uid() IN (
    SELECT user_id FROM profiles WHERE role = 'ADMIN'
  ));

-- Only admins can modify events
CREATE POLICY "Enable write access for admins"
  ON events FOR ALL
  USING (auth.uid() IN (
    SELECT user_id FROM profiles WHERE role = 'ADMIN'
  ));
```

### Orders and Tickets
```sql
-- Users can view own orders
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view own tickets
CREATE POLICY "Users can view own tickets"
  ON tickets FOR SELECT
  USING (auth.uid() = user_id);
```

## Indexes

### Performance Indexes
```sql
-- Events
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_categories ON events USING GIN (categories);

-- Orders
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_event_id ON orders(event_id);

-- Tickets
CREATE INDEX idx_tickets_order_id ON tickets(order_id);
CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_event_id ON tickets(event_id);
```

## Views

### Order Details
```sql
CREATE OR REPLACE VIEW order_details AS
SELECT 
  o.*,
  e.title as event_title,
  e.date as event_date,
  e.time as event_time,
  e.location as event_location,
  e.currency as event_currency,
  p.name as user_name,
  p.email as user_email
FROM orders o
LEFT JOIN events e ON e.id = o.event_id
LEFT JOIN profiles p ON p.user_id = o.user_id;
```

### Ticket Details
```sql
CREATE OR REPLACE VIEW ticket_details AS
SELECT 
  t.*,
  tt.name as ticket_type_name,
  tt.price as ticket_type_price,
  e.title as event_title,
  e.date as event_date,
  e.time as event_time,
  e.location as event_location
FROM tickets t
LEFT JOIN ticket_types tt ON tt.id = t.ticket_type_id
LEFT JOIN events e ON e.id = t.event_id;
```

## Data Types and Constraints

### Status Enums
```sql
-- Event Status
CHECK (status IN ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'))

-- Order Status
CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED'))

-- Ticket Status
CHECK (status IN ('VALID', 'USED', 'CANCELLED'))

-- User Status
CHECK (status IN ('ACTIVE', 'SUSPENDED', 'BANNED'))
```

### Currency Support
```sql
-- Supported Currencies
CHECK (currency IN ('XOF', 'GHS', 'USD', 'EUR', 'NGN'))
```

## Backup and Recovery

### Backup Strategy
- Daily full backups
- Point-in-time recovery enabled
- 30-day retention period
- Encrypted backups

### Recovery Procedures
1. Point-in-time recovery
2. Full database restore
3. Table-level recovery
4. Transaction rollback

## Performance Considerations

### Optimization Techniques
1. Proper indexing
2. Query optimization
3. Connection pooling
4. Regular vacuuming

### Monitoring
1. Query performance
2. Index usage
3. Table statistics
4. Cache hit rates