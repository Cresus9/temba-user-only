#!/usr/bin/env bash
# Deploy all Supabase Edge Functions to Paris (Temba-EU).
# Prerequisites: `supabase login` and access to project wlyncuwbzhzjafmqozcm.
# Secrets: copy from US project (Dashboard → Edge Functions → Secrets) or set via:
#   supabase secrets set --project-ref wlyncuwbzhzjafmqozcm KEY=value
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PARIS_REF="${SUPABASE_PARIS_REF:-wlyncuwbzhzjafmqozcm}"

echo "Deploying Edge Functions to project ref: $PARIS_REF"
for d in supabase/functions/*/; do
  name="$(basename "$d")"
  [[ -f "${d}index.ts" ]] || { echo "SKIP $name (no index.ts)"; continue; }
  echo "---- $name ----"
  supabase functions deploy "$name" --project-ref "$PARIS_REF"
done
echo "Done."
