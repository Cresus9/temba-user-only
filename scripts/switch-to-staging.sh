#!/bin/bash

# Script to switch to staging environment
echo "🚀 Switching to Staging Environment..."

# Set environment variable for staging
export VITE_ENVIRONMENT=staging

# Optional: Create a temporary .env file for staging
cat > .env.local << EOF
# Staging Environment
VITE_ENVIRONMENT=staging
VITE_APP_NAME=Temba (Staging)
VITE_DEBUG_MODE=true
EOF

echo "✅ Staging environment configured!"
echo "📝 Please update src/config/staging.ts with your actual Supabase staging credentials"
echo "🔧 Run 'npm run dev' to start the app in staging mode"
