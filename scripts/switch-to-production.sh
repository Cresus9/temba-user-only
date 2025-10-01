#!/bin/bash

# Script to switch to production environment
echo "🌍 Switching to Production Environment..."

# Remove staging environment variables
unset VITE_ENVIRONMENT

# Remove temporary .env file if it exists
if [ -f .env.local ]; then
    rm .env.local
    echo "🗑️  Removed staging .env.local file"
fi

echo "✅ Production environment configured!"
echo "🔧 Run 'npm run dev' to start the app in production mode"
