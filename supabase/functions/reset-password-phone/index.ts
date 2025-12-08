import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ResetPasswordRequest {
  phone: string;
  newPassword: string;
  otpCode?: string; // Optional: if provided, verify OTP first
}

interface ResetPasswordResponse {
  success: boolean;
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
    // Create Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the request body
    const { phone, newPassword, otpCode }: ResetPasswordRequest = await req.json()

    // Validate input
    if (!phone || !newPassword) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Phone number and new password are required' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate password length
    if (newPassword.length < 8) {
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

    // Normalize phone number
    const normalizedPhone = normalizePhone(phone)
    
    // Validate phone format
    if (!/^\+\d{7,15}$/.test(normalizedPhone)) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid phone number format' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Resetting password for phone:', normalizedPhone)

    // Step 1: Verify OTP (either verify now or check if already verified)
    let otpRecord = null
    
    if (otpCode) {
      // Verify OTP code now
      const { data: otpData, error: otpError } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('phone', normalizedPhone)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (otpError || !otpData) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'OTP code not found. Please request a new code.' 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Check if expired
      const expiresAt = new Date(otpData.expires_at)
      const now = new Date()
      if (now > expiresAt) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'OTP code has expired. Please request a new code.' 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Verify code
      if (otpData.code !== otpCode.trim()) {
        return new Response(
          JSON.stringify({ 
            success: false,
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
        .eq('id', otpData.id)

      otpRecord = otpData
    } else {
      // Check if OTP was already verified
      const { data: verifiedOtps, error: otpError } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('phone', normalizedPhone)
        .eq('verified', true)
        .order('updated_at', { ascending: false })
        .limit(1)

      if (otpError) {
        console.error('Error checking verified OTP:', otpError)
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Error checking OTP verification. Please try again.' 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (!verifiedOtps || verifiedOtps.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'OTP verification required. Please verify your phone number first.' 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const verifiedOtp = verifiedOtps[0]

      // Check if verification is recent (within last 10 minutes)
      const verifiedAt = new Date(verifiedOtp.updated_at)
      const now = new Date()
      const minutesSinceVerification = (now.getTime() - verifiedAt.getTime()) / (1000 * 60)
      
      if (minutesSinceVerification > 10) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'OTP verification expired. Please request a new code.' 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      otpRecord = verifiedOtp
    }

    // Step 2: Find user by phone number
    // Phone-based users have email format: {phoneDigits}@temba.temp
    const phoneDigits = normalizedPhone.replace(/[^0-9]/g, '')
    const tempEmail = `${phoneDigits}@temba.temp`

    console.log('Looking for user with email:', tempEmail)

    // Get user by email
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error listing users:', authError)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Error finding user account' 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const user = authUsers.users.find(u => u.email === tempEmail)

    if (!user) {
      console.log('User not found with email:', tempEmail)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'No account found with this phone number' 
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Found user:', user.id)

    // Step 3: Update user password using admin API
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: updateError.message || 'Failed to update password' 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Password updated successfully for user:', user.id)

    // Step 4: Mark OTP as used (set verified to false or delete)
    // We'll delete the OTP record to prevent reuse
    await supabase
      .from('otp_codes')
      .delete()
      .eq('phone', normalizedPhone)
      .eq('verified', true)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password reset successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Reset password function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

