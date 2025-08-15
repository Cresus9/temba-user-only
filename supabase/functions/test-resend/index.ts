import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'RESEND_API_KEY environment variable is not set' 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Testing Resend API connectivity...');
    console.log('API Key present:', !!resendApiKey);
    console.log('API Key starts with:', resendApiKey.substring(0, 10) + '...');

    // Test 1: Check if we can reach Resend API
    const testResponse = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Resend domains API response status:', testResponse.status);

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error('Resend API test failed:', errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Resend API test failed: ${testResponse.status} - ${errorText}`,
          apiKeyPresent: !!resendApiKey
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Test 2: Try to send a test email
    const testEmailPayload = {
      from: 'support@tembas.com',
      to: 'test@example.com', // This will fail, but we can see the error
      subject: 'Test Email from Temba',
      html: '<h1>This is a test email</h1><p>Testing Resend integration...</p>',
    };

    console.log('Attempting to send test email...');
    
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testEmailPayload),
    });

    console.log('Email send response status:', emailResponse.status);
    
    const emailResult = await emailResponse.text();
    console.log('Email send response:', emailResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Resend API connectivity test completed',
        apiKeyPresent: !!resendApiKey,
        domainsApiStatus: testResponse.status,
        emailApiStatus: emailResponse.status,
        emailResponse: emailResult,
        testPayload: testEmailPayload
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Test function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 