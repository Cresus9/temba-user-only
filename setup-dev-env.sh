#!/bin/bash

# Development Environment Setup Script
echo "🔧 Setting up development environment..."

# Export environment variables for the current session
export VITE_SUPABASE_URL="https://uwmlagvsivxqocklxbbo.supabase.co"
export VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3bWxhZ3ZzaXZ4cW9ja2x4YmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NzM4MjcsImV4cCI6MjA1MTI0OTgyN30.L8zTSaKJ5t9QyNZwKvx8xSvVLJvBtZnfKdRYQZW4fPE"
export VITE_PAYDUNYA_MODE="test"
export VITE_TICKET_SECRET_KEY="your-secret-key-here"

echo "✅ Environment variables set:"
echo "   VITE_SUPABASE_URL: $VITE_SUPABASE_URL"
echo "   VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY:0:20}..."
echo "   VITE_PAYDUNYA_MODE: $VITE_PAYDUNYA_MODE"

echo ""
echo "🚀 Starting development server..."
npm run dev
