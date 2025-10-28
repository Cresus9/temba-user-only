import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Create user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: authData.user.id,
        name,
        email,
        phone: phone || null,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Don't fail the signup if profile creation fails, but log it
    }

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

    // Send welcome email directly (more reliable than webhook)
    try {
      console.log('Sending welcome email to:', email)
      await sendWelcomeEmail(email, name)
      console.log('Welcome email sent successfully')
    } catch (emailError) {
      console.error('Welcome email error:', emailError)
      // Don't fail the signup if email fails
    }

    // Trigger welcome webhook as backup
    try {
      console.log('Triggering welcome webhook for user:', authData.user.id)
      await triggerWelcomeWebhook(supabaseUrl, authData.user, name)
      console.log('Welcome webhook triggered successfully')
    } catch (webhookError) {
      console.error('Welcome webhook error:', webhookError)
      // Don't fail the signup if webhook fails
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

async function triggerWelcomeWebhook(supabaseUrl: string, user: any, name: string) {
  try {
    const webhookUrl = `${supabaseUrl}/functions/v1/welcome-user`
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        record: user,
        eventType: 'INSERT',
        user_metadata: { name }
      })
    })

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`)
    }

    console.log('Welcome webhook triggered successfully')
  } catch (error) {
    console.error('Error triggering welcome webhook:', error)
    throw error
  }
}

async function sendWelcomeEmail(email: string, name: string) {
  try {
    // You can integrate with Resend here
    const welcomeEmailData = {
      to: email,
      subject: 'Bienvenue sur Temba ! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 2.5em;">Bienvenue sur Temba !</h1>
            <p style="font-size: 1.2em; margin: 10px 0;">Votre compte a été créé avec succès</p>
          </div>
          
          <div style="padding: 40px; background: white;">
            <h2 style="color: #333;">Bonjour ${name} ! 👋</h2>
            
            <p style="color: #666; line-height: 1.6;">
              Nous sommes ravis de vous accueillir sur Temba, votre plateforme de référence pour découvrir et réserver des événements incroyables en Afrique de l'Ouest.
            </p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Ce que vous pouvez faire maintenant :</h3>
              <ul style="color: #666; line-height: 1.8;">
                <li>🎵 Découvrir des concerts et festivals</li>
                <li>🎬 Réserver des événements culturels</li>
                <li>🎉 Participer à des événements exclusifs</li>
                <li>📱 Accéder à votre espace personnel</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://tembas.com/dashboard" 
                 style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Accéder à mon compte
              </a>
            </div>
            
            <p style="color: #999; font-size: 0.9em; text-align: center;">
              Si vous avez des questions, n'hésitez pas à nous contacter à support@tembas.com
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666;">
            <p style="margin: 0;">© 2024 Temba. Tous droits réservés.</p>
          </div>
        </div>
      `
    }

    // Send email via Resend
    console.log('Attempting to send email via Resend...');
    console.log('Resend API Key:', Deno.env.get('RESEND_API_KEY') ? 'Present' : 'Missing');
    
    const emailPayload = {
      from: 'support@tembas.com',
      to: email,
      subject: welcomeEmailData.subject,
      html: welcomeEmailData.html,
    };
    
    console.log('Email payload:', JSON.stringify(emailPayload, null, 2));
    
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    console.log('Resend response status:', resendResponse.status);
    console.log('Resend response headers:', Object.fromEntries(resendResponse.headers.entries()));

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error('Resend API error response:', errorData);
      throw new Error(`Failed to send email: ${resendResponse.status} - ${errorData}`);
    }

    const emailResult = await resendResponse.json();
    console.log('Welcome email sent successfully:', emailResult);

    console.log('Welcome email data prepared:', welcomeEmailData)
  } catch (error) {
    console.error('Error sending welcome email:', error)
    throw error
  }
} 