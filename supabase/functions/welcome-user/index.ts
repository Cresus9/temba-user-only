import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendResendEmail, welcomeEmailHtml } from '../_shared/email.ts'

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
    await sendResendEmail({
      to: email,
      subject: 'Bienvenue sur Temba',
      html: welcomeEmailHtml(name),
    });
    console.log('Welcome email sent to', email);
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