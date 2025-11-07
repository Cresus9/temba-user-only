# Deploy pawaPay Edge Functions

## Quick Deploy

The CORS error you're seeing is because the Edge Functions haven't been deployed yet. Run these commands:

```bash
# Navigate to project directory
cd /Users/thierryyabre/Downloads/temba-user-only

# Deploy both pawaPay functions
supabase functions deploy create-pawapay-payment
supabase functions deploy pawapay-webhook
```

## Verify Deployment

After deploying, verify the functions are live:

```bash
supabase functions list | grep pawapay
```

You should see:
- `create-pawapay-payment`
- `pawapay-webhook`

## Set Environment Variables

Before the functions work, you need to set the pawaPay credentials:

```bash
supabase secrets set PAWAPAY_API_KEY=your_api_key
supabase secrets set PAWAPAY_API_SECRET=your_api_secret
supabase secrets set PAWAPAY_MODE=production  # or "sandbox" for testing
supabase secrets set PAWAPAY_WEBHOOK_SECRET=your_webhook_secret  # Optional
supabase secrets set SITE_URL=https://your-domain.com
```

## Test After Deployment

Once deployed, test the function:

```bash
# Test the create-pawapay-payment function
curl -X POST \
  'https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/create-pawapay-payment' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"test": "data"}'
```

If you get a CORS error, it means the function is deployed but there's an issue with the OPTIONS handler. The code has been fixed to return status 204 for OPTIONS requests.

## Common Issues

1. **Function not found**: The function hasn't been deployed - run the deploy commands above
2. **CORS error even after deployment**: Check the OPTIONS handler is returning 204 status (already fixed in code)
3. **Authentication error**: Make sure you're using the correct Supabase anon key
4. **Environment variables missing**: The function will fail if pawaPay credentials aren't set

