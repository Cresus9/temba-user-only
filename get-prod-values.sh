#!/bin/bash

echo "🔍 Fetching Production Values..."
echo "================================"

# Check if linked to Supabase project
if ! supabase status >/dev/null 2>&1; then
    echo "❌ Not linked to a Supabase project."
    echo "Run: supabase link --project-ref YOUR_PROJECT_REF"
    exit 1
fi

echo "📡 Getting project info..."
supabase status | grep "API URL" | head -1
supabase status | grep "anon key" | head -1

echo ""
echo "🎫 Getting sample Event ID..."
echo "SQL: SELECT id, title FROM events WHERE status = 'PUBLISHED' LIMIT 3;"
supabase db query "SELECT id, title FROM events WHERE status = 'PUBLISHED' LIMIT 3;"

echo ""
echo "🎟️  Getting sample Ticket Type ID..."
echo "SQL: SELECT id, name, price_major FROM ticket_types WHERE is_active = true LIMIT 3;"
supabase db query "SELECT id, name, price_major FROM ticket_types WHERE is_active = true LIMIT 3;"

echo ""
echo "💡 Copy these values to your test script:"
echo "   nano test-production-payment.sh"

