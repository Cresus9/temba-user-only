// Supabase Edge Function: Get Referral Configuration
// Returns all active configuration values for the referral program

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get all active configuration
    const { data: config, error } = await supabaseClient
      .rpc('get_all_config')

    if (error) throw error

    // Transform array to object for easier access
    const configObj = config.reduce((acc: any, item: any) => {
      // Parse value based on type
      let parsedValue = item.value
      if (item.value_type === 'number') {
        parsedValue = parseFloat(item.value)
      } else if (item.value_type === 'boolean') {
        parsedValue = item.value === 'true'
      }

      acc[item.key] = {
        value: parsedValue,
        type: item.value_type,
        category: item.category,
        description: item.description,
      }
      return acc
    }, {})

    return new Response(
      JSON.stringify({
        success: true,
        config: configObj,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error fetching config:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
