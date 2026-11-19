// Retired.
// Rewards are written by record_order_rewards when the order is paid.
// This function used to read orders.total_amount (the column is total) and
// insert credit_transactions from a client call. It no longer writes anything.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  return new Response(
    JSON.stringify({
      success: false,
      retired: true,
      error: 'complete-referral is retired. Rewards are recorded when the payment is finalized.',
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 410,
    },
  )
})
