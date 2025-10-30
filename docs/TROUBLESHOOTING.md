# Troubleshooting Guide

## 🔍 Overview

This guide provides comprehensive troubleshooting procedures for common issues encountered in the Temba platform, including payment processing, ticket transfers, authentication, and system performance.

## 🚨 Critical Issues

### 1. Payment Processing Failures

#### Issue: Stripe Payment Failures
**Symptoms**:
- Payment form shows errors
- Users can't complete card payments
- Webhook events not processing

**Diagnosis**:
```bash
# Check Stripe logs
curl -H "Authorization: Bearer sk_test_..." \
  https://api.stripe.com/v1/payment_intents

# Check webhook endpoint
curl -X POST https://your-project.supabase.co/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Solutions**:
1. **Verify API Keys**:
   ```bash
   # Check environment variables
   echo $STRIPE_SECRET_KEY
   echo $STRIPE_PUBLISHABLE_KEY
   ```

2. **Check Webhook Configuration**:
   - Verify webhook URL in Stripe Dashboard
   - Ensure webhook secret is correct
   - Check webhook events are enabled

3. **Test Payment Intent Creation**:
   ```typescript
   // Test in browser console
   const { data, error } = await supabase.functions.invoke('create-stripe-payment', {
     body: { test: true }
   });
   console.log(data, error);
   ```

#### Issue: PayDunya Payment Failures
**Symptoms**:
- Mobile money payments not processing
- IPN webhooks not received
- Payment tokens invalid

**Diagnosis**:
```bash
# Check PayDunya API status
curl -H "Authorization: Bearer your_token" \
  https://api.paydunya.com/v1/checkout/invoice

# Test IPN endpoint
curl -X POST https://your-project.supabase.co/functions/v1/paydunya-ipn \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Solutions**:
1. **Verify API Credentials**:
   ```bash
   # Check PayDunya credentials
   echo $PAYDUNYA_MASTER_KEY
   echo $PAYDUNYA_PRIVATE_KEY
   echo $PAYDUNYA_TOKEN
   ```

2. **Check IPN Configuration**:
   - Verify IPN URL in PayDunya Dashboard
   - Ensure IPN is enabled
   - Check signature verification

3. **Test Payment Creation**:
   ```typescript
   // Test payment creation
   const { data, error } = await supabase.functions.invoke('create-payment', {
     body: { test: true }
   });
   ```

### 2. Ticket Transfer Issues

#### Issue: Transfer Not Found Error
**Symptoms**:
- "Transfer not found" error message
- Pending transfers not showing
- Transfer details not loading

**Diagnosis**:
```sql
-- Check transfer exists
SELECT * FROM ticket_transfers WHERE id = 'transfer-id';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'ticket_transfers';

-- Check user permissions
SELECT auth.uid(), auth.jwt() ->> 'email';
```

**Solutions**:
1. **Verify RLS Policies**:
   ```sql
   -- Recreate transfer select policy
   DROP POLICY IF EXISTS "ticket_transfers_select_policy" ON ticket_transfers;
   CREATE POLICY "ticket_transfers_select_policy" ON ticket_transfers
     FOR SELECT TO authenticated
     USING (
       sender_id = auth.uid() OR 
       recipient_id = auth.uid() OR 
       (recipient_email = (auth.jwt() ->> 'email') AND recipient_id IS NULL)
     );
   ```

2. **Check User Authentication**:
   ```typescript
   // Verify user is authenticated
   const { data: { user } } = await supabase.auth.getUser();
   console.log('User:', user);
   ```

3. **Test Transfer Query**:
   ```typescript
   // Test transfer query directly
   const { data, error } = await supabase
     .from('ticket_transfers')
     .select('*')
     .eq('recipient_email', user.email);
   ```

#### Issue: Cannot Read Properties of Null
**Symptoms**:
- UI crashes with null reference errors
- Transfer details not displaying
- Console errors about undefined properties

**Diagnosis**:
```typescript
// Check for null values
console.log('Transfer:', transfer);
console.log('Ticket:', transfer?.ticket);
console.log('Event:', transfer?.ticket?.event);
```

**Solutions**:
1. **Add Null Checks**:
   ```typescript
   // Use optional chaining
   {transfer.ticket?.event ? (
     <div>{transfer.ticket.event.title}</div>
   ) : (
     <div>Loading...</div>
   )}
   ```

2. **Update Component Props**:
   ```typescript
   interface PendingTransfer {
     ticket: {
       event: {
         title: string;
         date: string;
         venue: string;
       };
     } | null; // Make ticket optional
   }
   ```

3. **Add Loading States**:
   ```typescript
   const [loading, setLoading] = useState(true);
   
   useEffect(() => {
     if (transfer.ticket) {
       setLoading(false);
     }
   }, [transfer.ticket]);
   ```

### 3. Authentication Issues

#### Issue: User Not Authenticated
**Symptoms**:
- "User not authenticated" errors
- API calls failing with 401 errors
- User state not persisting

**Diagnosis**:
```typescript
// Check authentication state
const { data: { user }, error } = await supabase.auth.getUser();
console.log('User:', user, 'Error:', error);

// Check session
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
```

**Solutions**:
1. **Check JWT Token**:
   ```typescript
   // Verify token is valid
   const token = localStorage.getItem('sb-access-token');
   console.log('Token:', token);
   ```

2. **Refresh Session**:
   ```typescript
   // Refresh user session
   const { data, error } = await supabase.auth.refreshSession();
   ```

3. **Re-authenticate**:
   ```typescript
   // Sign out and sign in again
   await supabase.auth.signOut();
   // Redirect to login page
   ```

#### Issue: RLS Policy Violations
**Symptoms**:
- Database queries returning empty results
- "Permission denied" errors
- Data not loading for authenticated users

**Diagnosis**:
```sql
-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('profiles', 'tickets', 'orders');

-- Check policies exist
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';
```

**Solutions**:
1. **Enable RLS**:
   ```sql
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
   ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
   ```

2. **Create Missing Policies**:
   ```sql
   -- Example profile policy
   CREATE POLICY "profiles_select_policy" ON profiles
     FOR SELECT TO authenticated
     USING (user_id = auth.uid());
   ```

3. **Test Policy**:
   ```sql
   -- Test as authenticated user
   SELECT * FROM profiles WHERE user_id = auth.uid();
   ```

## 🔧 Performance Issues

### 1. Slow Database Queries

#### Issue: Query Timeout
**Symptoms**:
- Long loading times
- Database connection timeouts
- Slow page loads

**Diagnosis**:
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check query execution plan
EXPLAIN ANALYZE SELECT * FROM tickets WHERE user_id = 'user-id';
```

**Solutions**:
1. **Add Indexes**:
   ```sql
   CREATE INDEX idx_tickets_user_id ON tickets(user_id);
   CREATE INDEX idx_orders_user_id ON orders(user_id);
   CREATE INDEX idx_payments_order_id ON payments(order_id);
   ```

2. **Optimize Queries**:
   ```sql
   -- Use LIMIT for large datasets
   SELECT * FROM tickets WHERE user_id = 'user-id' LIMIT 20;
   
   -- Use specific columns
   SELECT id, title, status FROM tickets WHERE user_id = 'user-id';
   ```

3. **Add Pagination**:
   ```typescript
   // Implement pagination
   const { data } = await supabase
     .from('tickets')
     .select('*')
     .eq('user_id', user.id)
     .range(0, 19); // First 20 records
   ```

### 2. Frontend Performance

#### Issue: Slow Page Loads
**Symptoms**:
- Long initial load times
- Slow component rendering
- High memory usage

**Diagnosis**:
```javascript
// Check bundle size
npm run build
ls -la dist/assets/

// Check for memory leaks
// Use browser dev tools Performance tab
```

**Solutions**:
1. **Code Splitting**:
   ```typescript
   // Lazy load components
   const TransferModal = lazy(() => import('./TransferModal'));
   ```

2. **Optimize Images**:
   ```typescript
   // Use optimized images
   <img 
     src={optimizedImageUrl} 
     loading="lazy" 
     alt="Event image"
   />
   ```

3. **Memoize Components**:
   ```typescript
   // Memoize expensive components
   const MemoizedTicket = memo(TicketComponent);
   ```

## 🐛 Common Errors

### 1. CORS Errors

#### Issue: CORS Policy Violation
**Symptoms**:
- "Access to fetch blocked by CORS policy" errors
- API calls failing in browser
- Edge Functions not accessible

**Solutions**:
1. **Update CORS Headers**:
   ```typescript
   const corsHeaders = {
     'Access-Control-Allow-Origin': 'https://your-domain.netlify.app',
     'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
     'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
   };
   ```

2. **Check Origin**:
   ```typescript
   // Verify allowed origins
   const allowedOrigins = [
     'https://your-domain.netlify.app',
     'http://localhost:5173'
   ];
   ```

### 2. Environment Variable Issues

#### Issue: Undefined Environment Variables
**Symptoms**:
- "process.env.VARIABLE is undefined" errors
- API keys not working
- Configuration not loading

**Solutions**:
1. **Check Environment Files**:
   ```bash
   # Check .env file exists
   ls -la .env.local
   
   # Check variables are set
   cat .env.local | grep VITE_
   ```

2. **Verify Build Process**:
   ```bash
   # Check build output
   npm run build
   grep -r "VITE_" dist/
   ```

3. **Check Netlify Environment**:
   - Go to Netlify Dashboard
   - Check Site Settings > Environment Variables
   - Verify all variables are set

### 3. Database Connection Issues

#### Issue: Database Connection Failed
**Symptoms**:
- "Database connection failed" errors
- Supabase queries timing out
- RLS policies not working

**Solutions**:
1. **Check Supabase Status**:
   - Visit [Supabase Status Page](https://status.supabase.com)
   - Check for service outages

2. **Verify Connection String**:
   ```typescript
   // Check Supabase client configuration
   const supabase = createClient(
     process.env.VITE_SUPABASE_URL,
     process.env.VITE_SUPABASE_ANON_KEY
   );
   ```

3. **Test Connection**:
   ```typescript
   // Test database connection
   const { data, error } = await supabase
     .from('profiles')
     .select('count')
     .limit(1);
   ```

## 🔍 Debugging Tools

### 1. Browser Dev Tools

#### Console Debugging
```javascript
// Enable detailed logging
localStorage.setItem('debug', 'supabase:*');

// Check network requests
// Open Network tab in DevTools
// Look for failed requests

// Check application state
console.log('User:', user);
console.log('Profile:', profile);
console.log('Transfers:', pendingTransfers);
```

#### Performance Profiling
1. Open Chrome DevTools
2. Go to Performance tab
3. Record page load
4. Analyze performance bottlenecks

### 2. Supabase Debugging

#### Function Logs
```bash
# Check function logs
supabase functions logs transfer-ticket
supabase functions logs create-stripe-payment

# Check specific function
supabase functions logs --follow transfer-ticket
```

#### Database Debugging
```sql
-- Check active connections
SELECT * FROM pg_stat_activity;

-- Check query performance
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC;

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 3. Error Tracking

#### Implement Error Tracking
```typescript
// Add error boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
    // Send to error tracking service
  }
}

// Add global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Send to error tracking service
});
```

## 📞 Support Escalation

### 1. Internal Support

#### Documentation
- Check this troubleshooting guide
- Review system architecture docs
- Check deployment guide

#### Team Escalation
1. **Level 1**: Check logs and basic diagnostics
2. **Level 2**: Review code and configuration
3. **Level 3**: Contact development team

### 2. External Support

#### Supabase Support
- [Supabase Support](https://supabase.com/support)
- Check [Supabase Status](https://status.supabase.com)
- Review [Supabase Documentation](https://supabase.com/docs)

#### Payment Provider Support
- **Stripe**: [Stripe Support](https://support.stripe.com)
- **PayDunya**: Contact PayDunya support team

#### Hosting Support
- **Netlify**: [Netlify Support](https://support.netlify.com)

## 📋 Emergency Procedures

### 1. System Down

#### Immediate Actions
1. Check system status pages
2. Verify all services are running
3. Check recent deployments
4. Review error logs

#### Recovery Steps
1. Rollback to last working version
2. Restart affected services
3. Verify functionality
4. Monitor for recurring issues

### 2. Data Loss

#### Immediate Actions
1. Stop all write operations
2. Assess data loss scope
3. Check backup availability
4. Notify stakeholders

#### Recovery Steps
1. Restore from latest backup
2. Verify data integrity
3. Test system functionality
4. Implement prevention measures

---

*Last Updated: January 30, 2025*
*Troubleshooting Guide Version: 2.0.0*
