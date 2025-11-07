import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendOTPRequest {
  phone: string;
}

interface SendOTPResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Helper function to normalize phone number to E.164 format
function normalizePhone(phone: string): string {
  if (!phone) return phone;
  
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If it already starts with +, return as is (assuming it's already in E.164)
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // Remove leading zeros
  cleaned = cleaned.replace(/^0+/, '');
  
  // Try to detect country code (Burkina Faso is +226, 8 digits after country code)
  if (cleaned.startsWith('226') && cleaned.length === 11) {
    // Already has country code
    return '+' + cleaned;
  }
  
  // For numbers without country code, default to Burkina Faso (+226)
  // Burkina Faso: +226XXXXXXXX (8 digits after country code)
  if (cleaned.length === 8) {
    // Likely a Burkina Faso number without country code
    return '+226' + cleaned;
  }
  
  // If it looks like it might have a country code, try to detect it
  // Check for common West African country codes
  const westAfricanCodes = ['226', '225', '233', '221', '223', '227', '228', '229'];
  for (const code of westAfricanCodes) {
    if (cleaned.startsWith(code) && cleaned.length >= 10 && cleaned.length <= 13) {
      return '+' + cleaned;
    }
  }
  
  // Default to Burkina Faso if no pattern matches
  if (cleaned.length >= 7 && cleaned.length <= 10) {
    return '+226' + cleaned;
  }
  
  // Return as is if we can't normalize
  return '+' + cleaned;
}

// Generate a 6-digit OTP code
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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
    const { phone }: SendOTPRequest = await req.json()

    // Validate input
    if (!phone) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Phone number is required' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Normalize phone number
    const normalizedPhone = normalizePhone(phone)
    
    // Validate phone format (E.164: + followed by 7-15 digits)
    if (!/^\+\d{7,15}$/.test(normalizedPhone)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid phone number format. Please use E.164 format (e.g., +22675581026)' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Generating OTP for phone:', {
      original: phone,
      normalized: normalizedPhone,
      length: normalizedPhone.length,
      countryCode: normalizedPhone.substring(0, 4)
    })

    // Generate OTP code
    const otpCode = generateOTP()
    
    // Store OTP in database (create or update otp_codes table entry)
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10) // OTP expires in 10 minutes

    try {
      const { error: otpError } = await supabase
        .from('otp_codes')
        .upsert({
          phone: normalizedPhone,
          code: otpCode,
          expires_at: expiresAt.toISOString(),
          verified: false,
          attempts: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'phone',
          ignoreDuplicates: false,
        })

      if (otpError) {
        console.error('Error storing OTP (table may not exist yet):', otpError)
        // If table doesn't exist, we'll still try to send SMS
        // The verify-otp function will handle the OTP verification
      } else {
        console.log('OTP stored in database successfully')
      }
    } catch (dbError) {
      console.warn('Could not store OTP in database (table may not exist):', dbError)
      // Continue to send SMS even if database storage fails
    }

    // Send OTP via Twilio
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error('Twilio configuration missing')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'SMS service configuration missing' 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prepare SMS message
    const message = `Votre code de vérification Temba est: ${otpCode}. Valide pendant 10 minutes.`
    
    // Send SMS via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`
    
    const formData = new URLSearchParams()
    formData.append('To', normalizedPhone)
    formData.append('From', twilioPhoneNumber)
    formData.append('Body', message)

    console.log('Sending SMS via Twilio:', {
      to: normalizedPhone,
      from: twilioPhoneNumber,
      accountSid: twilioAccountSid ? 'Present' : 'Missing'
    })

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text()
      let errorMessage = 'Failed to send SMS. Please try again later.'
      
      // Try to parse Twilio error for more details
      try {
        const errorData = JSON.parse(errorText)
        console.error('Twilio API error details:', JSON.stringify(errorData, null, 2))
        
        // Extract specific error messages
        if (errorData.message) {
          errorMessage = errorData.message
          
          // Handle specific Twilio error codes
          if (errorData.code === 21211) {
            errorMessage = 'Invalid phone number format. Please check the number and try again.'
          } else if (errorData.code === 21608 || errorData.code === 21614) {
            errorMessage = 'SMS service is not available for this phone number. Please contact support.'
          } else if (errorData.code === 21408) {
            errorMessage = 'Permission denied. International SMS may not be enabled for this account.'
          }
        }
      } catch (parseError) {
        console.error('Could not parse Twilio error:', errorText)
      }
      
      console.error('Twilio API error response:', {
        status: twilioResponse.status,
        statusText: twilioResponse.statusText,
        error: errorText,
        phone: normalizedPhone,
        phoneLength: normalizedPhone.length,
        phoneCountryCode: normalizedPhone.substring(0, 4)
      })
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          details: errorText // Include raw error for debugging
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const twilioData = await twilioResponse.json()
    console.log('SMS sent successfully:', twilioData.sid)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'OTP sent successfully',
        phone: normalizedPhone, // Return normalized phone for confirmation
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Send OTP function error:', error)
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

