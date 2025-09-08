#!/bin/bash

# Production Payment Test Script
# Replace these values with your actual production credentials

# ===========================================
# REPLACE THESE VALUES WITH YOUR PRODUCTION DATA
# ===========================================

# Your production Supabase URL (format: https://xxxxx.supabase.co)
PROD_SUPABASE_URL="https://uwmlagvsivxqocklxbbo.supabase.co"

# Your production anon key - GET THIS FROM SUPABASE DASHBOARD > SETTINGS > API
PROD_ANON_KEY="YOUR_PROD_ANON_KEY_HERE"

# Get these from your production Supabase database - TABLE EDITOR
PROD_EVENT_ID="4949bb87-2416-42e4-9c6a-a0b9e42fa395"
PROD_TICKET_TYPE_ID="YOUR_PROD_TICKET_TYPE_ID_HERE"

# Your production domain
PROD_DOMAIN="https://tembas.com"

# ===========================================
# TEST EXECUTION
# ===========================================

echo "🚀 Starting Production Payment Test..."
echo "📡 Supabase URL: $PROD_SUPABASE_URL"
echo "🎫 Event ID: $PROD_EVENT_ID"
echo "🎟️  Ticket Type ID: $PROD_TICKET_TYPE_ID"
echo ""

# Step 1: Create Payment
echo "📝 Step 1: Creating payment..."
echo "----------------------------------------"

PAYMENT_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "apikey: $PROD_ANON_KEY" \
  -H "Authorization: Bearer $PROD_ANON_KEY" \
  -d '{
    "idempotency_key":"test-'"$(date +%s)"'",
    "event_id":"'"$PROD_EVENT_ID"'",
    "ticket_lines":[{"ticket_type_id":"'"$PROD_TICKET_TYPE_ID"'","quantity":1,"price_major":15000,"currency":"XOF"}],
    "amount_major":15000,
    "currency":"XOF",
    "method":"mobile_money",
    "provider":"orange",
    "phone":"+22670000000",
    "description":"Test prod payment",
    "return_url":"'"$PROD_DOMAIN"'/payment/success",
    "cancel_url":"'"$PROD_DOMAIN"'/payment/cancelled"
  }' \
  "$PROD_SUPABASE_URL/functions/v1/create-payment")

echo "Response:"
echo "$PAYMENT_RESPONSE" | jq . 2>/dev/null || echo "$PAYMENT_RESPONSE"
echo ""

# Extract payment_token from response
PAYMENT_TOKEN=$(echo "$PAYMENT_RESPONSE" | jq -r '.payment_token' 2>/dev/null)

if [ "$PAYMENT_TOKEN" = "null" ] || [ -z "$PAYMENT_TOKEN" ]; then
    echo "❌ Failed to create payment. Check the response above."
    exit 1
fi

echo "✅ Payment created successfully!"
echo "🔑 Payment Token: $PAYMENT_TOKEN"
echo ""

# Step 2: Verify Payment
echo "🔍 Step 2: Verifying payment..."
echo "----------------------------------------"

VERIFY_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "apikey: $PROD_ANON_KEY" \
  -H "Authorization: Bearer $PROD_ANON_KEY" \
  -d '{"payment_token":"'"$PAYMENT_TOKEN"'","order_id":""}' \
  "$PROD_SUPABASE_URL/functions/v1/verify-payment")

echo "Response:"
echo "$VERIFY_RESPONSE" | jq . 2>/dev/null || echo "$VERIFY_RESPONSE"
echo ""

# Check if verification was successful
SUCCESS=$(echo "$VERIFY_RESPONSE" | jq -r '.success' 2>/dev/null)

if [ "$SUCCESS" = "true" ]; then
    echo "✅ Payment verification successful!"
    echo "🎉 Production payment system is working correctly!"
else
    echo "❌ Payment verification failed."
    echo "🔍 Check the response above for error details."
fi

