#!/bin/bash

# OTP Issue Diagnostic Script
# Usage: ./diagnose-otp-issue.sh +22675581026

PHONE_NUMBER=$1

if [ -z "$PHONE_NUMBER" ]; then
  echo "Usage: ./diagnose-otp-issue.sh <phone-number>"
  echo "Example: ./diagnose-otp-issue.sh +22675581026"
  exit 1
fi

echo "🔍 OTP Issue Diagnostic Tool"
echo "=============================="
echo ""

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI not found. Install with: npm install -g supabase"
  exit 1
fi

echo "📱 Phone Number: $PHONE_NUMBER"
echo ""

# Normalize phone (basic check)
if [[ ! $PHONE_NUMBER =~ ^\+ ]]; then
  echo "⚠️  Warning: Phone number should start with +"
  echo "   Normalized: +$PHONE_NUMBER"
  NORMALIZED="+$PHONE_NUMBER"
else
  NORMALIZED="$PHONE_NUMBER"
fi

# Check phone format
if [[ ! $NORMALIZED =~ ^\+\d{7,15}$ ]]; then
  echo "❌ Invalid phone format!"
  echo "   Expected: E.164 format (+[country][number])"
  echo "   Example: +22675581026"
  exit 1
fi

echo "✅ Phone format: Valid"
echo ""

# Check Supabase connection
echo "🔍 Checking Supabase connection..."
if supabase status &> /dev/null; then
  echo "✅ Supabase CLI connected"
else
  echo "⚠️  Supabase CLI not connected (this is OK if using remote project)"
fi
echo ""

# Check Twilio secrets
echo "🔍 Checking Twilio configuration..."
TWILIO_SID=$(supabase secrets list 2>/dev/null | grep TWILIO_ACCOUNT_SID || echo "")
TWILIO_TOKEN=$(supabase secrets list 2>/dev/null | grep TWILIO_AUTH_TOKEN || echo "")
TWILIO_PHONE=$(supabase secrets list 2>/dev/null | grep TWILIO_PHONE_NUMBER || echo "")

if [ -z "$TWILIO_SID" ]; then
  echo "❌ TWILIO_ACCOUNT_SID not set"
else
  echo "✅ TWILIO_ACCOUNT_SID: Set"
fi

if [ -z "$TWILIO_TOKEN" ]; then
  echo "❌ TWILIO_AUTH_TOKEN not set"
else
  echo "✅ TWILIO_AUTH_TOKEN: Set"
fi

if [ -z "$TWILIO_PHONE" ]; then
  echo "❌ TWILIO_PHONE_NUMBER not set"
else
  echo "✅ TWILIO_PHONE_NUMBER: Set"
fi
echo ""

# Check edge function logs
echo "🔍 Checking recent send-otp function logs..."
echo ""
supabase functions logs send-otp --project-ref uwmlagvsivxqocklxbbo 2>/dev/null | grep -i "$PHONE_NUMBER" | tail -5 || echo "No recent logs found for this number"
echo ""

# Check for errors in logs
echo "🔍 Checking for errors in send-otp logs..."
echo ""
supabase functions logs send-otp --project-ref uwmlagvsivxqocklxbbo 2>/dev/null | grep -i "error\|failed\|twilio" | tail -10 || echo "No errors found"
echo ""

# Test OTP sending
echo "🧪 Testing OTP sending..."
echo ""
read -p "Send test OTP to $NORMALIZED? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Get Supabase URL and key from environment or .env
  if [ -f .env.local ]; then
    source .env.local
  fi
  
  SUPABASE_URL=${VITE_SUPABASE_URL:-$SUPABASE_URL}
  SUPABASE_KEY=${VITE_SUPABASE_ANON_KEY:-$SUPABASE_ANON_KEY}
  
  if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "❌ Missing Supabase credentials"
    echo "   Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
    exit 1
  fi
  
  echo "📤 Sending OTP request..."
  RESPONSE=$(curl -s -X POST "$SUPABASE_URL/functions/v1/send-otp" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "apikey: $SUPABASE_KEY" \
    -d "{\"phone\": \"$NORMALIZED\"}")
  
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
  echo ""
  
  SUCCESS=$(echo "$RESPONSE" | grep -o '"success":true' || echo "")
  if [ -n "$SUCCESS" ]; then
    echo "✅ OTP sent successfully!"
    echo ""
    echo "💡 Next steps:"
    echo "   1. Check the phone for SMS"
    echo "   2. If not received, check Twilio Console logs"
    echo "   3. Verify Geo Permissions in Twilio"
  else
    ERROR=$(echo "$RESPONSE" | grep -o '"error":"[^"]*"' || echo "")
    echo "❌ OTP sending failed"
    if [ -n "$ERROR" ]; then
      echo "   Error: $ERROR"
    fi
  fi
fi

echo ""
echo "📚 For more troubleshooting, see: OTP-TROUBLESHOOTING-GUIDE.md"
echo ""

