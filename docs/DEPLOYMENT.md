# Deployment Guide

## 🚀 Overview

This guide covers the complete deployment process for the Temba platform, including environment setup, configuration, and production deployment procedures.

## 📋 Prerequisites

### Required Accounts
- **Supabase Account**: For backend services
- **Netlify Account**: For frontend hosting
- **Stripe Account**: For card payments
- **PayDunya Account**: For mobile money payments
- **Resend Account**: For email services

### Required Tools
- **Node.js**: Version 18 or higher
- **Supabase CLI**: Latest version
- **Git**: Version control
- **Netlify CLI**: For deployment (optional)

## 🏗️ Environment Setup

### 1. Supabase Project Setup

#### Create New Project
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Create new project
supabase projects create temba-production
```

#### Configure Environment Variables
```bash
# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### 2. Database Setup

#### Apply Migrations
```bash
# Link to project
supabase link --project-ref your-project-ref

# Apply all migrations
supabase db push

# Verify migrations
supabase db diff
```

#### Configure RLS Policies
```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
```

### 3. Edge Functions Deployment

#### Deploy All Functions
```bash
# Deploy payment functions
supabase functions deploy create-stripe-payment
supabase functions deploy stripe-webhook
supabase functions deploy create-payment
supabase functions deploy paydunya-ipn
supabase functions deploy fx-quote

# Deploy transfer functions
supabase functions deploy transfer-ticket
supabase functions deploy claim-pending-transfer

# Deploy auth functions
supabase functions deploy signup
supabase functions deploy welcome-user

# Deploy utility functions
supabase functions deploy payment-recovery
supabase functions deploy verify-payment
```

#### Configure Function Secrets
```bash
# Set Stripe secrets
supabase secrets set STRIPE_SECRET_KEY="sk_live_..."
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."

# Set PayDunya secrets
supabase secrets set PAYDUNYA_MASTER_KEY="your_master_key"
supabase secrets set PAYDUNYA_PRIVATE_KEY="your_private_key"
supabase secrets set PAYDUNYA_TOKEN="your_token"

# Set email secrets
supabase secrets set RESEND_API_KEY="your_resend_key"

# Set other secrets
supabase secrets set SUPABASE_URL="https://your-project.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
```

## 🌐 Frontend Deployment

### 1. Netlify Setup

#### Connect Repository
1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click "New site from Git"
3. Connect your GitHub repository
4. Configure build settings

#### Build Configuration
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### 2. Environment Variables

#### Set Production Variables
```bash
# In Netlify Dashboard > Site Settings > Environment Variables
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_PAYDUNYA_PUBLIC_KEY=your_public_key
VITE_APP_URL=https://your-domain.netlify.app
```

### 3. Build and Deploy

#### Local Build Test
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Test build locally
npm run preview
```

#### Deploy to Netlify
```bash
# Deploy via CLI (optional)
netlify deploy --prod

# Or push to connected Git repository
git push origin main
```

## 🔧 Configuration

### 1. Stripe Configuration

#### Webhook Setup
1. Go to Stripe Dashboard > Webhooks
2. Add endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
4. Copy webhook secret to Supabase secrets

#### Test Mode vs Live Mode
```bash
# Test mode (development)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Live mode (production)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
```

### 2. PayDunya Configuration

#### API Configuration
```bash
# Development
PAYDUNYA_MASTER_KEY="test_master_key"
PAYDUNYA_PRIVATE_KEY="test_private_key"
PAYDUNYA_TOKEN="test_token"
PAYDUNYA_PUBLIC_KEY="test_public_key"

# Production
PAYDUNYA_MASTER_KEY="live_master_key"
PAYDUNYA_PRIVATE_KEY="live_private_key"
PAYDUNYA_TOKEN="live_token"
PAYDUNYA_PUBLIC_KEY="live_public_key"
```

#### IPN Configuration
- **IPN URL**: `https://your-project.supabase.co/functions/v1/paydunya-ipn`
- **Success URL**: `https://your-domain.netlify.app/payment/success`
- **Cancel URL**: `https://your-domain.netlify.app/payment/cancel`

### 3. Email Configuration

#### Resend Setup
```bash
# Set API key
RESEND_API_KEY="re_..."

# Configure domain (optional)
RESEND_DOMAIN="your-domain.com"
```

## 🔍 Monitoring & Health Checks

### 1. Application Monitoring

#### Supabase Monitoring
- **Database Performance**: Monitor query performance
- **Edge Functions**: Check function execution logs
- **API Usage**: Monitor API request patterns
- **Error Rates**: Track and analyze errors

#### Netlify Monitoring
- **Build Status**: Monitor deployment success
- **Site Performance**: Check Core Web Vitals
- **Error Tracking**: Monitor client-side errors
- **Traffic Analytics**: Track user engagement

### 2. Health Check Endpoints

#### Create Health Check Function
```typescript
// supabase/functions/health-check/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  return new Response(JSON.stringify({
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      database: "connected",
      functions: "running",
      auth: "active"
    }
  }), {
    headers: { "Content-Type": "application/json" }
  })
})
```

#### Deploy Health Check
```bash
supabase functions deploy health-check
```

## 🛡️ Security Configuration

### 1. CORS Configuration

#### Update CORS Headers
```typescript
// In all Edge Functions
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-domain.netlify.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
}
```

### 2. RLS Policy Verification

#### Test RLS Policies
```sql
-- Test user access
SELECT * FROM profiles WHERE user_id = auth.uid();
SELECT * FROM tickets WHERE user_id = auth.uid();
SELECT * FROM ticket_transfers WHERE sender_id = auth.uid() OR recipient_id = auth.uid();
```

### 3. Environment Security

#### Secure Environment Variables
- Never commit secrets to Git
- Use Supabase secrets for sensitive data
- Rotate keys regularly
- Monitor access logs

## 📊 Performance Optimization

### 1. Database Optimization

#### Index Optimization
```sql
-- Add indexes for performance
CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_event_id ON tickets(event_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_ticket_transfers_recipient_email ON ticket_transfers(recipient_email);
```

#### Query Optimization
- Use proper WHERE clauses
- Limit result sets
- Use pagination for large datasets
- Monitor slow queries

### 2. Frontend Optimization

#### Build Optimization
```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          stripe: ['@stripe/stripe-js']
        }
      }
    }
  }
})
```

#### CDN Configuration
- Enable Netlify CDN
- Configure cache headers
- Optimize images
- Use WebP format

## 🔄 Backup & Recovery

### 1. Database Backups

#### Automated Backups
```bash
# Supabase handles automatic backups
# Check backup status in dashboard
```

#### Manual Backup
```bash
# Export database schema
supabase db dump --schema-only > schema.sql

# Export data
supabase db dump --data-only > data.sql
```

### 2. Code Backups

#### Git Repository
```bash
# Ensure all code is committed
git add .
git commit -m "Production deployment"
git push origin main

# Create release tag
git tag -a v1.0.0 -m "Production release v1.0.0"
git push origin v1.0.0
```

### 3. Recovery Procedures

#### Database Recovery
1. Access Supabase Dashboard
2. Go to Database > Backups
3. Select restore point
4. Confirm restoration

#### Code Recovery
1. Checkout specific commit
2. Redeploy functions
3. Verify functionality
4. Update DNS if needed

## 🧪 Pre-Deployment Testing

### 1. Function Testing

#### Test All Edge Functions
```bash
# Test payment functions
curl -X POST https://your-project.supabase.co/functions/v1/create-stripe-payment \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Test transfer functions
curl -X POST https://your-project.supabase.co/functions/v1/transfer-ticket \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### 2. Integration Testing

#### Test Complete Flows
- User registration and authentication
- Ticket purchase with both payment methods
- Ticket transfer to registered and unregistered users
- Email notifications
- Webhook processing

### 3. Performance Testing

#### Load Testing
```bash
# Test API endpoints
npm install -g artillery
artillery quick --count 100 --num 10 https://your-project.supabase.co/functions/v1/health-check
```

## 🚀 Go-Live Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] RLS policies configured
- [ ] Edge functions deployed
- [ ] Webhooks configured
- [ ] CORS headers updated
- [ ] Health checks working

### Deployment
- [ ] Frontend deployed to Netlify
- [ ] Domain configured
- [ ] SSL certificate active
- [ ] CDN enabled
- [ ] Monitoring configured

### Post-Deployment
- [ ] All features tested
- [ ] Payment flows working
- [ ] Transfer system functional
- [ ] Email notifications working
- [ ] Performance monitoring active
- [ ] Error tracking configured

### Production Verification
- [ ] Test user registration
- [ ] Test ticket purchase
- [ ] Test ticket transfer
- [ ] Test email notifications
- [ ] Test webhook processing
- [ ] Monitor error rates
- [ ] Check performance metrics

---

*Last Updated: January 30, 2025*
*Deployment Guide Version: 2.0.0*
