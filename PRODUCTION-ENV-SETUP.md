# 🔐 Production Environment Variables Setup

## 📋 **Required Paydunya Production Keys**

You need to get these from your Paydunya dashboard:

### **Step 1: Get Production Keys from Paydunya**
1. **Login to Paydunya Dashboard**
2. **Switch to Production/Live mode** (not sandbox)
3. **Go to API Settings** or **Developer Settings**
4. **Copy the following keys:**

```bash
# Production Paydunya API Keys (replace with your actual keys)
PAYDUNYA_MASTER_KEY_PROD=your_production_master_key_here
PAYDUNYA_PRIVATE_KEY_PROD=your_production_private_key_here  
PAYDUNYA_PUBLIC_KEY_PROD=your_production_public_key_here
PAYDUNYA_TOKEN_PROD=your_production_token_here

# Set mode to live for production
PAYDUNYA_MODE=live
```

### **Step 2: Add to Supabase Secrets**

#### **In Supabase Dashboard:**
1. **Go to your Production Supabase project**
2. **Settings** → **Edge Functions** → **Environment Variables**
3. **Add each variable:**

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `PAYDUNYA_MASTER_KEY_PROD` | `your_master_key` | Production master key |
| `PAYDUNYA_PRIVATE_KEY_PROD` | `your_private_key` | Production private key |
| `PAYDUNYA_PUBLIC_KEY_PROD` | `your_public_key` | Production public key |
| `PAYDUNYA_TOKEN_PROD` | `your_token` | Production token |
| `PAYDUNYA_MODE` | `live` | Set to live for production |

#### **Using Supabase CLI:**
```bash
# Set production environment variables
supabase secrets set PAYDUNYA_MASTER_KEY_PROD=your_production_master_key_here
supabase secrets set PAYDUNYA_PRIVATE_KEY_PROD=your_production_private_key_here
supabase secrets set PAYDUNYA_PUBLIC_KEY_PROD=your_production_public_key_here
supabase secrets set PAYDUNYA_TOKEN_PROD=your_production_token_here
supabase secrets set PAYDUNYA_MODE=live
```

## 🔄 **Deployment Steps**

### **Step 1: Backup Current Function**
```bash
# Backup current function
cp supabase/functions/create-payment/index.ts supabase/functions/create-payment/index-backup.ts
```

### **Step 2: Deploy Production Function**
```bash
# Replace with production version
cp supabase/functions/create-payment/index-production.ts supabase/functions/create-payment/index.ts

# Deploy to Supabase
supabase functions deploy create-payment
```

### **Step 3: Verify Deployment**
```bash
# Test the function
curl -X POST 'https://your-project.supabase.co/functions/v1/create-payment' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "idempotency_key": "test-' $(date +%s) '",
    "event_id": "test-event",
    "amount_major": 1000,
    "currency": "XOF",
    "method": "mobile_money",
    "buyer_email": "test@example.com",
    "description": "Test payment"
  }'
```

## ⚠️ **Important Security Notes**

### **Production Keys vs Test Keys**
- **NEVER use test keys in production**
- **NEVER commit production keys to version control**
- **Use different keys for staging and production**

### **Environment Separation**
```bash
# Test/Staging Environment
PAYDUNYA_MASTER_KEY=test_key
PAYDUNYA_MODE=test

# Production Environment  
PAYDUNYA_MASTER_KEY_PROD=live_key
PAYDUNYA_MODE=live
```

### **Key Security**
- **Store keys in Supabase secrets only**
- **Never log production keys**
- **Rotate keys regularly**
- **Monitor key usage**

## 🧪 **Testing Production Keys Safely**

### **Step 1: Test in Staging First**
```bash
# In staging environment, use production keys but small amounts
PAYDUNYA_MASTER_KEY_PROD=your_production_key
PAYDUNYA_MODE=live
# Test with 100 XOF only
```

### **Step 2: Verify Webhook URLs**
```bash
# Ensure webhooks point to production
callback_url: https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/paydunya-ipn
# Return URLs will use: https://tembas.com/payment/success
# Cancel URLs will use: https://tembas.com/payment/cancelled
```

### **Step 3: Test Payment Flow**
1. **Create small test payment** (100 XOF)
2. **Complete payment** with real mobile money
3. **Verify webhook** is received
4. **Check payment status** in database
5. **Test refund** if needed

## 📊 **Monitoring Setup**

### **Payment Logs**
```sql
-- Monitor production payments
SELECT 
  created_at,
  amount,
  status,
  payment_method,
  error_message,
  client_ip
FROM payments 
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### **Error Alerts**
```sql
-- Set up alerts for payment failures
SELECT COUNT(*) as failed_payments
FROM payments 
WHERE status = 'failed' 
  AND created_at >= NOW() - INTERVAL '1 hour';
```

## 🚨 **Rollback Plan**

### **If Issues Occur:**
```bash
# 1. Immediately rollback to test mode
supabase secrets set PAYDUNYA_MODE=test

# 2. Restore backup function
cp supabase/functions/create-payment/index-backup.ts supabase/functions/create-payment/index.ts
supabase functions deploy create-payment

# 3. Investigate issues
# 4. Fix and redeploy when ready
```

## ✅ **Go-Live Checklist**

- [ ] **Production Paydunya keys** obtained and verified
- [ ] **Environment variables** set in Supabase
- [ ] **Function deployed** with production configuration
- [ ] **Webhook URLs** updated to production
- [ ] **Test payment** completed successfully (100 XOF)
- [ ] **Monitoring** setup and working
- [ ] **Rollback plan** tested and ready
- [ ] **Team notified** of go-live
- [ ] **Support team** briefed on new payment flow

---

## 🎯 **Next Steps**

1. **Get your Paydunya production keys**
2. **Set environment variables in Supabase**
3. **Deploy the production function**
4. **Test with small amount**
5. **Monitor and go live!**

**Ready to get your production keys?** 🔑
