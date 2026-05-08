// Supabase Edge Function: Generate Referral Link
// Creates or retrieves user's referral code and generates shareable link

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Create service client for admin operations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get or create user's referral code
    let { data: referralData, error: codeError } = await serviceClient
      .from('user_referral_codes')
      .select('referral_code, is_active')
      .eq('user_id', user.id)
      .maybeSingle()

    // If no referral code exists, create one
    if (!referralData) {
      // Generate unique referral code
      const generateCode = () => {
        const prefix = 'TEMBA'
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No confusing chars
        let code = prefix
        for (let i = 0; i < 5; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return code
      }

      let referralCode = generateCode()
      let attempts = 0
      let created = false

      // Try to create unique code (max 5 attempts)
      while (!created && attempts < 5) {
        const { data: newCode, error: insertError } = await serviceClient
          .from('user_referral_codes')
          .insert({
            user_id: user.id,
            referral_code: referralCode,
            is_active: true,
          })
          .select('referral_code, is_active')
          .single()

        if (!insertError && newCode) {
          referralData = newCode
          created = true
        } else if (insertError.code === '23505') {
          // Duplicate code, try again
          referralCode = generateCode()
          attempts++
        } else {
          throw new Error(`Failed to create referral code: ${insertError.message}`)
        }
      }

      if (!created) {
        throw new Error('Failed to generate unique referral code')
      }

      // Also create user_credits record
      await serviceClient
        .from('user_credits')
        .insert({
          user_id: user.id,
          balance: 0,
          lifetime_earned: 0,
          lifetime_spent: 0,
        })
        .single()
    }

    if (!referralData.is_active) {
      throw new Error('Referral code is inactive')
    }

    const referralCode = referralData.referral_code

    // Generate shareable links with AppsFlyer OneLink
    const oneLinkBase = 'https://temba.onelink.me/Xbe8'
    const customScheme = 'temba'

    const links = {
      // Main OneLink - automatically redirects to app or store
      oneLink: `${oneLinkBase}?deep_link_value=ref/${encodeURIComponent(referralCode)}`,
      // Direct app deep link (if app is installed)
      app: `${customScheme}://ref/${referralCode}`,
      // Fallback web link
      web: `https://tembas.com/ref/${referralCode}`,
    }

    // Generate share message with OneLink
    const shareMessage = `Rejoignez TEMBA avec mon code de parrainage ${referralCode} et recevez des récompenses! Téléchargez: ${links.oneLink}`

    return new Response(
      JSON.stringify({
        success: true,
        referralCode,
        links,
        shareMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error generating referral link:', error)
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
