# 🚀 Production Go-Live Checklist

## 📋 **Pre-Deployment Checklist**

### ✅ **1. Paydunya Production Setup**
- [ ] **Get Production API Keys** from Paydunya dashboard
- [ ] **Verify merchant account** is fully approved for live transactions
- [ ] **Test production keys** in staging environment first
- [ ] **Update webhook URLs** to production endpoints
- [ ] **Configure production store settings**

### ✅ **2. Supabase Environment Variables**

**Set these in your Supabase project (Settings → Edge Functions → Environment Variables):**

```bash
# Production Paydunya Keys (replace with your actual keys)
PAYDUNYA_MASTER_KEY_PROD=your_production_master_key_here
PAYDUNYA_PRIVATE_KEY_PROD=your_production_private_key_here
PAYDUNYA_PUBLIC_KEY_PROD=your_production_public_key_here
PAYDUNYA_TOKEN_PROD=your_production_token_here

# Set mode to live
PAYDUNYA_MODE=live

# Optional: Webhook security
PAYDUNYA_WEBHOOK_SECRET=your_webhook_secret_here
```

### ✅ **3. Deploy Functions**

```bash
# Deploy payment function
supabase functions deploy create-payment

# Deploy webhook function  
supabase functions deploy paydunya-ipn

# Verify deployment
supabase functions list
```

## 🧪 **Testing Procedure**

### **Step 1: Environment Verification**

```bash
# Test function deployment
curl -X POST 'https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/create-payment' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "idempotency_key": "test-'$(date +%s)'",
    "event_id": "test-event-id",
    "amount_major": 500,
    "currency": "XOF",
    "method": "mobile_money",
    "buyer_email": "test@tembas.com",
    "description": "Test payment - 500 XOF"
  }'
```

**Expected Response:**
- ✅ Status 200
- ✅ `success: true`
- ✅ `payment_url` provided
- ✅ Console shows: `🚀 Using PRODUCTION Supabase configuration`

### **Step 2: Small Amount Test**

**⚠️ IMPORTANT: Use real money but small amounts (100-500 XOF)**

1. **Create test payment** through your app
2. **Complete payment** with real mobile money
3. **Verify webhook** is received and processed
4. **Check payment status** in database
5. **Verify tickets** are created correctly

### **Step 3: End-to-End Flow Test**

1. **User Registration/Login**
2. **Event Selection**
3. **Ticket Selection**
4. **Payment Creation**
5. **Payment Completion**
6. **Webhook Processing**
7. **Ticket Generation**
8. **Email Confirmation** (if enabled)

## 🔍 **Monitoring During Go-Live**

### **Real-Time Checks:**

#### **1. Function Logs**
```bash
# Monitor payment function
supabase functions logs create-payment --follow

# Monitor webhook function
supabase functions logs paydunya-ipn --follow
```

#### **2. Database Monitoring**
```sql
-- Check recent payments
SELECT 
  id,
  status,
  amount,
  currency,
  payment_method,
  created_at,
  updated_at
FROM payments 
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check payment success rate
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM payments 
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY status;
```

#### **3. Error Monitoring**
```sql
-- Check for errors
SELECT 
  error_message,
  COUNT(*) as error_count
FROM payments 
WHERE status = 'failed' 
  AND created_at >= NOW() - INTERVAL '1 hour'
GROUP BY error_message;
```

## 🚨 **Rollback Plan**

### **If Issues Occur:**

#### **1. Immediate Rollback**
```bash
# Revert to test mode
supabase secrets set PAYDUNYA_MODE=test

# Restore backup functions
cp supabase/functions/create-payment/index-backup.ts supabase/functions/create-payment/index.ts
cp supabase/functions/paydunya-ipn/index-backup.ts supabase/functions/paydunya-ipn/index.ts

# Redeploy
supabase functions deploy create-payment
supabase functions deploy paydunya-ipn
```

#### **2. Communication**
- [ ] **Notify team** of rollback
- [ ] **Update status page** if applicable
- [ ] **Inform customers** if payments were affected

## 📊 **Success Metrics**

### **Go-Live Success Criteria:**
- ✅ **Payment success rate**: >95%
- ✅ **Average payment time**: <30 seconds
- ✅ **Webhook delivery rate**: >99%
- ✅ **No critical errors**: Zero system-breaking issues
- ✅ **Customer complaints**: <1% of transactions

### **First Hour Targets:**
- [ ] **5+ successful payments** completed
- [ ] **Zero failed webhooks**
- [ ] **All tickets generated** correctly
- [ ] **No customer support tickets** related to payments

### **First Day Targets:**
- [ ] **50+ successful payments**
- [ ] **Payment success rate >98%**
- [ ] **Average processing time <20 seconds**
- [ ] **Zero critical issues**

## 🎯 **Go-Live Steps**

### **Phase 1: Preparation (30 minutes)**
1. [ ] **Set production environment variables**
2. [ ] **Deploy production functions**
3. [ ] **Verify function deployment**
4. [ ] **Test with small amount (100 XOF)**
5. [ ] **Confirm webhook processing**

### **Phase 2: Soft Launch (1 hour)**
1. [ ] **Enable for limited users** (admin/beta testers)
2. [ ] **Monitor first 10 transactions**
3. [ ] **Verify all systems working**
4. [ ] **Check error rates**
5. [ ] **Validate webhook delivery**

### **Phase 3: Full Launch (Ongoing)**
1. [ ] **Enable for all users**
2. [ ] **Monitor continuously for first 24 hours**
3. [ ] **Check metrics every hour**
4. [ ] **Respond to any issues immediately**
5. [ ] **Document any problems and solutions**

## 🔧 **Troubleshooting Guide**

### **Common Issues:**

#### **Payment Creation Fails**
```bash
# Check function logs
supabase functions logs create-payment

# Verify environment variables
echo "Check PAYDUNYA_MASTER_KEY_PROD is set"

# Test with minimal payload
curl -X POST 'https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/create-payment' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"idempotency_key": "test", "event_id": "test", "amount_major": 100, "currency": "XOF", "method": "mobile_money", "buyer_email": "test@test.com", "description": "test"}'
```

#### **Webhook Not Received**
```bash
# Check webhook function logs
supabase functions logs paydunya-ipn

# Verify webhook URL in Paydunya dashboard
echo "https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/paydunya-ipn"

# Test webhook manually
curl -X POST 'https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/paydunya-ipn' \
  -H 'Content-Type: application/json' \
  -d '{"invoice_token": "test", "status": "completed"}'
```

#### **Rate Limiting Issues**
```sql
-- Check rate limiting
SELECT 
  client_ip,
  COUNT(*) as request_count
FROM payments 
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY client_ip
ORDER BY request_count DESC;
```

## 📞 **Emergency Contacts**

### **Go-Live Team:**
- **Technical Lead**: [Your contact]
- **Database Admin**: [Your contact]
- **Customer Support**: [Your contact]
- **Business Owner**: [Your contact]

### **External Contacts:**
- **Paydunya Support**: [Paydunya contact]
- **Supabase Support**: [If needed]

## ✅ **Post Go-Live Tasks**

### **First 24 Hours:**
- [ ] **Monitor payment success rates**
- [ ] **Check webhook delivery**
- [ ] **Review error logs**
- [ ] **Validate customer experience**
- [ ] **Document any issues**

### **First Week:**
- [ ] **Daily performance review**
- [ ] **Customer feedback analysis**
- [ ] **System optimization**
- [ ] **Update documentation**
- [ ] **Team retrospective**

---

## 🚀 **Ready for Production!**

**Current Status:**
- ✅ **Production functions**: Deployed and ready
- ✅ **Security enhancements**: Implemented
- ✅ **Backup system**: Available (will deploy SQL later)
- ✅ **Monitoring**: Ready for real-time tracking
- ✅ **Rollback plan**: Tested and ready

**Next Steps:**
1. **Get Paydunya production keys**
2. **Set environment variables**
3. **Deploy functions**
4. **Test with small amount**
5. **Go live!**

**You're ready to process real payments! 🎉**
