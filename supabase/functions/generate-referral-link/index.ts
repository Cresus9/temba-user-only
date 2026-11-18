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
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    let { data: referralData } = await serviceClient
      .from('user_referral_codes')
      .select('referral_code, is_active')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!referralData) {
      const generateCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        let code = 'TEMBA'
        for (let i = 0; i < 5; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return code
      }

      let referralCode = generateCode()
      let attempts = 0
      let created = false

      while (!created && attempts < 5) {
        const { data: newCode, error: insertError } = await serviceClient
          .from('user_referral_codes')
          .insert({ user_id: user.id, referral_code: referralCode, is_active: true })
          .select('referral_code, is_active')
          .single()

        if (!insertError && newCode) {
          referralData = newCode
          created = true
        } else if (insertError?.code === '23505') {
          referralCode = generateCode()
          attempts++
        } else {
          throw new Error(`Failed to create referral code: ${insertError?.message}`)
        }
      }

      if (!created) throw new Error('Failed to generate unique referral code')

      await serviceClient
        .from('user_credits')
        .insert({ user_id: user.id, balance: 0, lifetime_earned: 0, lifetime_spent: 0 })
        .single()
    }

    if (!referralData!.is_active) throw new Error('Referral code is inactive')

    const referralCode = referralData!.referral_code

    // ✅ Parse optional event_id from request body
    let eventIdForLink: string | undefined
    try {
      const ct = req.headers.get('content-type') || ''
      if (ct.includes('application/json')) {
        const body = await req.json().catch(() => ({} as Record<string, unknown>))
        const eid = body?.event_id
        if (typeof eid === 'string' && eid.trim()) eventIdForLink = eid.trim()
      }
    } catch { /* optional body */ }

    const oneLinkBase = 'https://temba.onelink.me/Xbe8'
    const customScheme = 'temba'

    // ✅ Validate event_id before using in URLs
    const safeEventId =
      eventIdForLink &&
      /^[a-zA-Z0-9_-]+$/.test(eventIdForLink) &&
      eventIdForLink.length >= 4
        ? eventIdForLink
        : undefined

    // ✅ Separate deep_link_value (routing) from referral_code (attribution)
    const oneLinkParams = new URLSearchParams({
      deep_link_value: safeEventId ? 'event_detail' : 'referral_home',
      referral_code: referralCode,  // always present for attribution
    })
    if (safeEventId) {
      oneLinkParams.set('event_id', safeEventId)  // for navigation
    }

    const eventQuery = safeEventId
      ? `?event_id=${encodeURIComponent(safeEventId)}&ref=${referralCode}`
      : `?ref=${referralCode}`

    const links = {
      // ✅ Main shareable link — routes to event OR home + tracks referral
      oneLink: `${oneLinkBase}?${oneLinkParams.toString()}`,
      // ✅ Direct URI scheme (app already installed)
      app: `${customScheme}://ref/${referralCode}${eventQuery}`,
      // ✅ Web fallback
      web: `https://tembas.com/ref/${referralCode}${eventQuery}`,
    }

    const shareMessage = safeEventId
      ? `Découvrez cet événement sur TEMBA! ${links.oneLink} (Code: ${referralCode})`
      : `Rejoignez TEMBA avec mon code de parrainage ${referralCode} et recevez des récompenses! Téléchargez: ${links.oneLink}`

    return new Response(
      JSON.stringify({ success: true, referralCode, links, shareMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error generating referral link:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})