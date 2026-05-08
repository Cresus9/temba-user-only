// Supabase Edge Function: Complete Referral
// Triggered when referee makes first purchase
// Issues rewards to both referrer and referee

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

    const { userId, orderId, orderAmount } = await req.json()

    if (!userId || !orderId) {
      throw new Error('userId and orderId are required')
    }

    // Check if program is enabled
    const { data: programEnabled } = await supabaseClient
      .rpc('get_config_value', { config_key: 'program_enabled' })

    if (programEnabled !== 'true') {
      throw new Error('Referral program is currently disabled')
    }

    // Get trigger event config
    const { data: triggerEvent } = await supabaseClient
      .rpc('get_config_value', { config_key: 'trigger_event' })

    // Only process if trigger is 'first_purchase'
    if (triggerEvent !== 'first_purchase') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Trigger event is not first_purchase, skipping',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Check minimum purchase amount
    const { data: minPurchase } = await supabaseClient
      .rpc('get_config_value', { config_key: 'min_purchase_amount' })

    const minAmount = parseInt(minPurchase || '0')
    if (orderAmount < minAmount) {
      throw new Error(`Purchase amount must be at least ${minAmount} XOF`)
    }

    // Find pending referral for this user
    const { data: referral, error: referralError } = await supabaseClient
      .from('referrals')
      .select('*')
      .eq('referee_id', userId)
      .eq('status', 'pending')
      .single()

    if (referralError || !referral) {
      // No pending referral, user wasn't referred or already completed
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending referral found',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Get reward amounts from config
    const { data: referrerReward } = await supabaseClient
      .rpc('get_config_value', { config_key: 'referrer_reward_amount' })

    const { data: refereePurchaseBonus } = await supabaseClient
      .rpc('get_config_value', { config_key: 'referee_purchase_bonus' })

    const referrerAmount = parseInt(referrerReward || '0')
    const refereeAmount = parseInt(refereePurchaseBonus || '0')

    // Get credit expiry days
    const { data: expiryDays } = await supabaseClient
      .rpc('get_config_value', { config_key: 'credit_expiry_days' })

    const expiry = parseInt(expiryDays || '0')
    const expiresAt = expiry > 0
      ? new Date(Date.now() + expiry * 24 * 60 * 60 * 1000).toISOString()
      : null

    // Issue rewards
    const rewardsToIssue = []

    // Referrer reward
    if (referrerAmount > 0) {
      rewardsToIssue.push({
        referral_id: referral.id,
        user_id: referral.referrer_id,
        reward_type: 'credit',
        reward_value: referrerAmount,
        status: 'issued',
        expires_at: expiresAt,
        metadata: { order_id: orderId },
      })
    }

    // Referee purchase bonus
    if (refereeAmount > 0) {
      rewardsToIssue.push({
        referral_id: referral.id,
        user_id: userId,
        reward_type: 'credit',
        reward_value: refereeAmount,
        status: 'issued',
        expires_at: expiresAt,
        metadata: { order_id: orderId },
      })
    }

    // Insert rewards
    const { data: rewards, error: rewardError } = await supabaseClient
      .from('referral_rewards')
      .insert(rewardsToIssue)
      .select()

    if (rewardError) throw rewardError

    // Add credit transactions
    for (const reward of rewards || []) {
      const { data: creditData } = await supabaseClient
        .from('user_credits')
        .select('balance')
        .eq('user_id', reward.user_id)
        .single()

      await supabaseClient.from('credit_transactions').insert({
        user_id: reward.user_id,
        amount: reward.reward_value,
        type: 'earned',
        source: 'referral',
        reference_id: referral.id,
        balance_after: (creditData?.balance || 0) + reward.reward_value,
        description: reward.user_id === referral.referrer_id
          ? 'Referral reward'
          : 'Purchase bonus from referral',
      })
    }

    // Update referral status
    await supabaseClient
      .from('referrals')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        rewarded_at: new Date().toISOString(),
        conversion_event: 'first_purchase',
      })
      .eq('id', referral.id)

    // TODO: Send push notifications to both users

    return new Response(
      JSON.stringify({
        success: true,
        referral,
        rewards,
        message: 'Referral completed and rewards issued',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error completing referral:', error)
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
