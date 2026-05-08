// Supabase Edge Function: Track Referral
// Called when a new user signs up with a referral code

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { referralCode, appsflyerClickId, deviceId } = await req.json()

    // Get Authorization header for user auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
      }
    )

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    if (!referralCode) {
      throw new Error('Referral code is required')
    }

    // Check if program is enabled
    const { data: configData } = await supabaseClient
      .rpc('get_config_value', { config_key: 'program_enabled' })

    if (configData !== 'true') {
      throw new Error('Referral program is currently disabled')
    }

    // Find referrer by code
    const { data: referralData, error: codeError } = await supabaseClient
      .from('user_referral_codes')
      .select('user_id')
      .eq('referral_code', referralCode)
      .eq('is_active', true)
      .single()

    if (codeError || !referralData) {
      throw new Error('Invalid referral code')
    }

    // Don't allow self-referral
    if (referralData.user_id === user.id) {
      throw new Error('Cannot use your own referral code')
    }

    // Check if user was already referred
    const { data: existingReferral } = await supabaseClient
      .from('referrals')
      .select('id')
      .eq('referee_id', user.id)
      .single()

    if (existingReferral) {
      throw new Error('User has already been referred')
    }

    // Get trigger event from config
    const { data: triggerEvent } = await supabaseClient
      .rpc('get_config_value', { config_key: 'trigger_event' })

    // Create referral record
    const { data: referral, error: referralError } = await supabaseClient
      .from('referrals')
      .insert({
        referrer_id: referralData.user_id,
        referee_id: user.id,
        referral_code: referralCode,
        status: 'pending',
        referee_email: user.email,
        referee_phone: user.phone,
        appsflyer_click_id: appsflyerClickId,
        device_id: deviceId,
        metadata: {
          user_agent: req.headers.get('user-agent'),
          tracked_at: new Date().toISOString(),
        },
      })
      .select()
      .single()

    if (referralError) throw referralError

    // If trigger is 'signup', complete immediately
    if (triggerEvent === 'signup') {
      // Get referee signup bonus from config
      const { data: signupBonus } = await supabaseClient
        .rpc('get_config_value', { config_key: 'referee_signup_bonus' })

      const bonusAmount = parseInt(signupBonus || '0')

      if (bonusAmount > 0) {
        // Issue signup bonus to referee
        await supabaseClient.from('referral_rewards').insert({
          referral_id: referral.id,
          user_id: user.id,
          reward_type: 'credit',
          reward_value: bonusAmount,
          status: 'issued',
        })

        // Add credit transaction
        const { data: creditData } = await supabaseClient
          .from('user_credits')
          .select('balance')
          .eq('user_id', user.id)
          .single()

        await supabaseClient.from('credit_transactions').insert({
          user_id: user.id,
          amount: bonusAmount,
          type: 'earned',
          source: 'referral',
          reference_id: referral.id,
          balance_after: (creditData?.balance || 0) + bonusAmount,
          description: 'Signup bonus from referral',
        })
      }

      // Complete the referral immediately
      await supabaseClient
        .from('referrals')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          conversion_event: 'signup',
        })
        .eq('id', referral.id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        referral,
        message: triggerEvent === 'signup'
          ? 'Referral tracked and completed'
          : 'Referral tracked successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error tracking referral:', error)
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
