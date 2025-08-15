#!/bin/bash

# Deploy Supabase Edge Functions
echo "🚀 Deploying Supabase Edge Functions..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if logged in to Supabase
if ! supabase status &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "supabase login"
    exit 1
fi

# Deploy the signup function
echo "📦 Deploying signup function..."
supabase functions deploy signup --no-verify-jwt

# Deploy the welcome-user function
echo "📦 Deploying welcome-user function..."
supabase functions deploy welcome-user --no-verify-jwt

# Deploy the validate-ticket function (if it exists)
if [ -d "supabase/functions/validate-ticket" ]; then
    echo "📦 Deploying validate-ticket function..."
    supabase functions deploy validate-ticket --no-verify-jwt
fi

echo "✅ All functions deployed successfully!"

# Show function URLs
echo ""
echo "🔗 Function URLs:"
echo "Signup: https://your-project-ref.supabase.co/functions/v1/signup"
echo "Welcome: https://your-project-ref.supabase.co/functions/v1/welcome-user"
echo ""

# Instructions for testing
echo "🧪 To test the functions:"
echo "1. Update the URLs above with your actual project reference"
echo "2. Run the test script: deno run --allow-net supabase/functions/signup/test.ts"
echo "3. Or test via your frontend application"
echo ""

echo "🎉 Deployment complete!" 