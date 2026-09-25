import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendResendEmail, welcomeEmailHtml } from '../_shared/email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
}

interface SignupRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

interface SignupResponse {
  success: boolean;
  user?: any;
  session?: any;
  error?: string;
}

// Keep a real international number. Only default to +226 for local BF-style digits.
function normalizePhone(phone: string): string {
  if (!phone) return phone;
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned) return phone;

  const known: { code: string; local: number[] }[] = [
    { code: '226', local: [8] },
    { code: '225', local: [10] },
    { code: '233', local: [9] },
    { code: '221', local: [9] },
    { code: '223', local: [8] },
    { code: '227', local: [8] },
    { code: '228', local: [8] },
    { code: '229', local: [8] },
    { code: '234', local: [10, 11] },
    { code: '33', local: [9] },
    { code: '44', local: [10] },
    { code: '1', local: [10] },
  ];
  known.sort((a, b) => b.code.length - a.code.length);

  const matchKnown = (digits: string) => {
    for (const { code, local } of known) {
      if (digits.startsWith(code) && local.includes(digits.length - code.length)) {
        return '+' + digits;
      }
    }
    return null;
  };

  let digits = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned.replace(/^0+/, '');

  // Signup used to force +226 onto any +number; unwrap that.
  if (digits.startsWith('226') && digits.length > 11) {
    const rest = digits.slice(3);
    const inner = matchKnown(rest);
    if (inner) return inner;
  }

  const matched = matchKnown(digits);
  if (matched) return matched;

  if (cleaned.startsWith('+') && digits.length >= 8 && digits.length <= 15) {
    return '+' + digits;
  }

  if (digits.length === 8) return '+226' + digits;
  if (digits.startsWith('226')) return '+' + digits;
  return '+' + digits;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the request body
    const { email, password, name, phone }: SignupRequest = await req.json()

    // Validate input
    if (!email || !password || !name) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email, password, and name are required' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid email format' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Password must be at least 8 characters long' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Creating user account for:', email)

    // Create the user account
    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name,
        phone: phone || null
      }
    })

    if (signUpError) {
      console.error('Signup error:', signUpError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: signUpError.message 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create user account' 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Normalize email before writing
    const normEmail = email.trim().toLowerCase()
    
    // Upsert profile - idempotent operation that handles duplicates gracefully
    const nowIso = new Date().toISOString()
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        user_id: authData.user.id,
        name,  // Always use the provided name, never fallback to email prefix
        email: normEmail,
        phone: phone ? normalizePhone(phone) : null,
        avatar_url: null,
        updated_at: nowIso,
        created_at: nowIso,
      }, {
        onConflict: 'user_id',          // Critical to avoid unique violation
        ignoreDuplicates: false,        // Perform update on conflict
      })

    if (profileError) {
      console.error('Profile upsert error:', profileError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Database error creating new user: ${profileError.message}` 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Note: Pending transfers will be claimed via AuthContext after signup

    // Create a session for the user
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email,
      options: {
        redirectTo: `${supabaseUrl.replace('.supabase.co', '.netlify.app')}/dashboard`
      }
    })

    if (sessionError) {
      console.error('Session creation error:', sessionError)
    }

    try {
      await sendWelcomeEmail(email, name)
    } catch (emailError) {
      console.error('Welcome email error:', emailError)
    }

    console.log('User account created successfully:', authData.user.id)

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name,
          phone: phone || null
        },
        session: sessionData,
        message: 'Account created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Signup function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function sendWelcomeEmail(email: string, name: string) {
  await sendResendEmail({
    to: email,
    subject: 'Bienvenue sur Temba',
    html: welcomeEmailHtml(name),
  });
} 