#!/bin/bash

echo "🚀 Setting up Resend API Key and Deploying Supabase Edge Functions..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if user is logged in to Supabase
if ! supabase status &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "   supabase login"
    exit 1
fi

echo "🔑 Setting new Resend API Key..."
supabase secrets set RESEND_API_KEY=re_FDCjUEKn_4wwFj5QAMqig5TahwyJhqsmc

echo "📦 Deploying Edge Functions..."

# Deploy signup function
echo "   Deploying signup function..."
supabase functions deploy signup --no-verify-jwt

# Deploy welcome-user function
echo "   Deploying welcome-user function..."
supabase functions deploy welcome-user --no-verify-jwt

# Deploy test-resend function
echo "   Deploying test-resend function..."
supabase functions deploy test-resend --no-verify-jwt

# Deploy test-domain function
echo "   Deploying test-domain function..."
supabase functions deploy test-domain --no-verify-jwt

# Deploy validate-ticket function if it exists
if [ -d "supabase/functions/validate-ticket" ]; then
    echo "   Deploying validate-ticket function..."
    supabase functions deploy validate-ticket --no-verify-jwt
fi

echo "✅ All functions deployed successfully!"
echo ""
echo "🧪 Testing Resend Integration..."
echo "   You can test the email functionality by calling:"
echo "   curl -X POST https://your-project-ref.supabase.co/functions/v1/test-resend \\"
echo "     -H \"Authorization: Bearer your-anon-key\""
echo ""
echo "🔍 Testing Domain Verification..."
echo "   curl -X POST https://your-project-ref.supabase.co/functions/v1/test-domain \\"
echo "     -H \"Authorization: Bearer your-anon-key\""
echo ""
echo "🎉 Ready to test signup and email functionality!"
