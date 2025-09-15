#!/bin/bash

# Production Payment Testing Script
# Tests the complete payment flow using curl commands

echo "🔍 Starting Production Payment Debug Test..."
echo "=========================================="

# Production configuration
PROD_SUPABASE_URL="https://uwmlagvsivxqocklxbbo.supabase.co"
PROD_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3bWxhZ3ZzaXZ4cW9ja2x4YmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NzM4MjcsImV4cCI6MjA1MTI0OTgyN30.L8zTSaKJ5t9QyNZwKvx8xSvVLJvBtZnfKdRYQZW4fPE"
PROD_EVENT_ID="75efd523-bf76-4cbd-a8ae-03d4d12b3de0"
PROD_TICKET_TYPE_ID="c4f8d2a1-9b3e-4c5d-8f7a-1e2d3c4b5a69"
PROD_DOMAIN="https://tembas.com"

echo "🌐 Environment: Production"
echo "🔗 Supabase URL: $PROD_SUPABASE_URL"
echo "📅 Timestamp: $(date)"
echo ""

# Step 1: Test create-payment
echo "📝 Step 1: Testing CREATE PAYMENT"
echo "================================="

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

echo "🚀 Create Payment Response:"
echo "$PAYMENT_RESPONSE" | jq '.' 2>/dev/null || echo "$PAYMENT_RESPONSE"
echo ""

# Extract payment_token and order_id from response
PAYMENT_TOKEN=$(echo "$PAYMENT_RESPONSE" | jq -r '.payment_token // empty' 2>/dev/null)
ORDER_ID=$(echo "$PAYMENT_RESPONSE" | jq -r '.order_id // empty' 2>/dev/null)

if [ -z "$PAYMENT_TOKEN" ] || [ -z "$ORDER_ID" ]; then
  echo "❌ Failed to extract payment_token or order_id from response"
  echo "Cannot continue with verification test"
  exit 1
fi

echo "🔑 Extracted Information:"
echo "Payment Token: $PAYMENT_TOKEN"
echo "Order ID: $ORDER_ID"
echo ""

# Step 2: Test verify-payment
echo "📝 Step 2: Testing VERIFY PAYMENT"
echo "================================="

VERIFY_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "apikey: $PROD_ANON_KEY" \
  -H "Authorization: Bearer $PROD_ANON_KEY" \
  -d '{
    "payment_token":"'"$PAYMENT_TOKEN"'",
    "order_id":"'"$ORDER_ID"'"
  }' \
  "$PROD_SUPABASE_URL/functions/v1/verify-payment")

echo "🔍 Verify Payment Response:"
echo "$VERIFY_RESPONSE" | jq '.' 2>/dev/null || echo "$VERIFY_RESPONSE"
echo ""

# Step 3: Test notification endpoint
echo "📝 Step 3: Testing NOTIFICATION COUNT"
echo "====================================="

NOTIFICATION_RESPONSE=$(curl -s -I \
  -H "apikey: $PROD_ANON_KEY" \
  -H "Authorization: Bearer $PROD_ANON_KEY" \
  "$PROD_SUPABASE_URL/rest/v1/notifications?select=*&read_at=is.null")

echo "🔔 Notification Endpoint Response:"
echo "$NOTIFICATION_RESPONSE"
echo ""

# Summary
echo "📋 TEST SUMMARY"
echo "==============="

# Check if create payment succeeded
if echo "$PAYMENT_RESPONSE" | jq -e '.payment_token' > /dev/null 2>&1; then
  echo "✅ Create Payment: PASS"
  CREATE_PASS=true
else
  echo "❌ Create Payment: FAIL"
  CREATE_PASS=false
fi

# Check if verify payment succeeded
if echo "$VERIFY_RESPONSE" | jq -e '.status' > /dev/null 2>&1; then
  echo "✅ Verify Payment: PASS"
  VERIFY_PASS=true
else
  echo "❌ Verify Payment: FAIL"
  VERIFY_PASS=false
fi

# Check if notification endpoint is working
if echo "$NOTIFICATION_RESPONSE" | grep -q "200 OK"; then
  echo "✅ Notifications: PASS"
  NOTIFICATION_PASS=true
else
  echo "❌ Notifications: FAIL"
  NOTIFICATION_PASS=false
fi

echo ""
if [ "$CREATE_PASS" = true ] && [ "$VERIFY_PASS" = true ] && [ "$NOTIFICATION_PASS" = true ]; then
  echo "🎉 ALL TESTS PASSED - Payment system is working!"
  exit 0
else
  echo "⚠️  SOME TESTS FAILED - Check the errors above"
  exit 1
fi