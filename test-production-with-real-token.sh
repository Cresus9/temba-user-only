#!/bin/bash

echo "🎯 Production Payment Test with Real Environment"
echo "=============================================="
echo ""

# First, let's try to get environment info from your production site
echo "📝 Step 1: Check Production Environment"
echo "------------------------------------"

# Test if we can access the production site
SITE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://tembas.com)
echo "🌐 Production site status: $SITE_STATUS"

if [ "$SITE_STATUS" = "200" ]; then
  echo "✅ Production site is accessible"
else
  echo "❌ Production site issue (status: $SITE_STATUS)"
fi

echo ""
echo "📝 Step 2: Test Edge Function Availability"
echo "----------------------------------------"

# Test the verify-payment function
FUNCTION_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"payment_token":"test","order_id":"test"}' \
  https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/verify-payment)

echo "🔧 verify-payment function status: $FUNCTION_STATUS"

if [ "$FUNCTION_STATUS" = "401" ]; then
  echo "✅ Function is deployed and requires auth (expected)"
elif [ "$FUNCTION_STATUS" = "400" ]; then
  echo "✅ Function is processing requests (400 = validation error without auth)"
else
  echo "⚠️  Unexpected function status: $FUNCTION_STATUS"
fi

echo ""
echo "🎯 Next Steps for Production Testing:"
echo "=================================="
echo "1. 🌐 Go to https://tembas.com"
echo "2. 🛒 Try to make a test purchase"
echo "3. 🔍 Open DevTools → Network tab"
echo "4. 👀 Watch for 'verify-payment' request"
echo "5. 📊 Check if the request succeeds (200) or fails (400/401)"
echo ""
echo "🔍 What to Look For:"
echo "- Request payload should contain 'internal_token' or 'payment_token'"
echo "- Response should be JSON with success/status fields"
echo "- No more 400 Bad Request errors"
echo ""
echo "💡 If you see 401 errors, it's an authentication issue"
echo "💡 If you see 400 errors, check the request payload format"
echo "💡 If you see 200 success, the adaptation worked!"
