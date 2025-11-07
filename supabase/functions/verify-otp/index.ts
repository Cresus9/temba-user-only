import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerifyOTPRequest {
  phone: string;
  code: string;
}

interface VerifyOTPResponse {
  valid: boolean;
  message?: string;
  error?: string;
}

// Helper function to normalize phone number to E.164 format
function normalizePhone(phone: string): string {
  if (!phone) return phone;
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If no +, add country code (default to +226 for Burkina Faso)
  if (!cleaned.startsWith('+')) {
    cleaned = cleaned.replace(/^0+/, ''); // Remove leading zeros
    if (!cleaned.startsWith('226')) {
      cleaned = '+226' + cleaned;
    } else {
      cleaned = '+' + cleaned;
    }
  }
  
  return cleaned;
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
    const { phone, code }: VerifyOTPRequest = await req.json()

    // Validate input
    if (!phone || !code) {
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'Phone number and code are required' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Normalize phone number
    const normalizedPhone = normalizePhone(phone)
    
    // Validate phone format
    if (!/^\+\d{7,15}$/.test(normalizedPhone)) {
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'Invalid phone number format' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code.trim())) {
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'Invalid code format. Code must be 6 digits' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Verifying OTP for phone:', normalizedPhone)

    // Check OTP in database
    try {
      const { data: otpRecord, error: otpError } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('phone', normalizedPhone)
        .single()

      if (otpError) {
        console.error('Error fetching OTP record:', otpError)
        // If table doesn't exist or record not found, return invalid
        return new Response(
          JSON.stringify({ 
            valid: false,
            error: 'OTP code not found or expired. Please request a new code.' 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Check if OTP has expired
      const expiresAt = new Date(otpRecord.expires_at)
      const now = new Date()
      
      if (now > expiresAt) {
        console.log('OTP expired')
        return new Response(
          JSON.stringify({ 
            valid: false,
            error: 'OTP code has expired. Please request a new code.' 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Check if already verified
      if (otpRecord.verified === true) {
        console.log('OTP already verified')
        return new Response(
          JSON.stringify({ 
            valid: false,
            error: 'OTP code has already been used. Please request a new code.' 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Check if too many attempts
      if (otpRecord.attempts >= 5) {
        console.log('Too many attempts')
        return new Response(
          JSON.stringify({ 
            valid: false,
            error: 'Too many verification attempts. Please request a new code.' 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Verify the code
      const codeMatches = otpRecord.code === code.trim()
      
      // Update attempts
      await supabase
        .from('otp_codes')
        .update({ 
          attempts: otpRecord.attempts + 1,
          updated_at: new Date().toISOString()
        })
        .eq('phone', normalizedPhone)

      if (!codeMatches) {
        console.log('Invalid OTP code')
        return new Response(
          JSON.stringify({ 
            valid: false,
            error: 'Invalid OTP code. Please try again.' 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Mark as verified
      await supabase
        .from('otp_codes')
        .update({ 
          verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('phone', normalizedPhone)

      console.log('OTP verified successfully')

      return new Response(
        JSON.stringify({
          valid: true,
          message: 'OTP verified successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (dbError) {
      console.error('Database error:', dbError)
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'Database error. Please try again later.' 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Verify OTP function error:', error)
    return new Response(
      JSON.stringify({ 
        valid: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

