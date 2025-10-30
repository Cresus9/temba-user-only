import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
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
    const { record, old_record, eventType } = await req.json()

    console.log('Webhook triggered:', { eventType, userId: record?.id })

    // Only process new user signups
    if (eventType !== 'INSERT' || !record) {
      return new Response(
        JSON.stringify({ message: 'Not a new user signup' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { id: userId, email, user_metadata } = record

    // Get user profile if it exists
    let profile = null
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      profile = profileData
    } catch (error) {
      console.log('No profile found for user:', userId)
    }

    // Prepare welcome data
    const userName = profile?.name || user_metadata?.name || email?.split('@')[0] || 'there'
    const userEmail = email

    // Send welcome email using Resend (if configured)
    await sendWelcomeEmail(userEmail, userName)

    // Create a welcome notification in the database
    await createWelcomeNotification(supabase, userId, userName)

    // Log the welcome event
    console.log(`Welcome message sent to: ${userEmail} (${userName})`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Welcome message sent successfully',
        user: { id: userId, email: userEmail, name: userName }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function sendWelcomeEmail(email: string, name: string) {
  try {
    // You can integrate with Resend here if you want to send a custom welcome email
    // For now, we'll use Supabase's built-in email service
    
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
              <a href="https://tembas.com" 
                 style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Commencer à explorer
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
      from: 'support@tembas.com', // Using verified domain
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

  } catch (error) {
    console.error('Error sending welcome email:', error)
  }
}

async function createWelcomeNotification(supabase: any, userId: string, userName: string) {
  try {
    // Create a welcome notification in the notifications table
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'ACCOUNT_UPDATE',
        title: 'Bienvenue sur Temba !',
        message: `Bonjour ${userName} ! Nous sommes ravis de vous accueillir sur Temba. Commencez à explorer nos événements incroyables !`,
        priority: 'normal',
        read: 'false',
        action_url: '/events',
        action_text: 'Explorer les événements',
        metadata: {
          welcome: true,
          user_name: userName
        }
      })

    if (error) {
      console.error('Error creating welcome notification:', error)
    } else {
      console.log('Welcome notification created successfully for user:', userId)
    }
  } catch (error) {
    console.error('Error creating welcome notification:', error)
  }
} 