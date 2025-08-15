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

    console.log('Testing Resend API and domain verification...');
    console.log('API Key present:', !!resendApiKey);
    console.log('API Key starts with:', resendApiKey.substring(0, 10) + '...');

    // Test 1: Check domains
    console.log('Checking domains...');
    const domainsResponse = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Domains API response status:', domainsResponse.status);
    
    let domainsData = null;
    if (domainsResponse.ok) {
      domainsData = await domainsResponse.json();
      console.log('Domains data:', JSON.stringify(domainsData, null, 2));
    } else {
      const errorText = await domainsResponse.text();
      console.error('Domains API error:', errorText);
    }

    // Test 2: Try to send a test email with onboarding@resend.dev (should work)
    console.log('Testing email with onboarding@resend.dev...');
    const testEmailPayload1 = {
      from: 'onboarding@resend.dev',
      to: 'test@example.com',
      subject: 'Test Email from Temba (onboarding domain)',
      html: '<h1>This is a test email</h1><p>Testing Resend integration with onboarding domain...</p>',
    };

    const emailResponse1 = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testEmailPayload1),
    });

    console.log('Email 1 response status:', emailResponse1.status);
    const emailResult1 = await emailResponse1.text();
    console.log('Email 1 response:', emailResult1);

    // Test 3: Try to send a test email with support@tembas.com (might fail if domain not verified)
    console.log('Testing email with support@tembas.com...');
    const testEmailPayload2 = {
      from: 'support@tembas.com',
      to: 'test@example.com',
      subject: 'Test Email from Temba (tembas.com domain)',
      html: '<h1>This is a test email</h1><p>Testing Resend integration with tembas.com domain...</p>',
    };

    const emailResponse2 = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testEmailPayload2),
    });

    console.log('Email 2 response status:', emailResponse2.status);
    const emailResult2 = await emailResponse2.text();
    console.log('Email 2 response:', emailResult2);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Resend API and domain tests completed',
        apiKeyPresent: !!resendApiKey,
        domainsApiStatus: domainsResponse.status,
        domainsData: domainsData,
        email1Status: emailResponse1.status,
        email1Response: emailResult1,
        email2Status: emailResponse2.status,
        email2Response: emailResult2,
        testPayload1: testEmailPayload1,
        testPayload2: testEmailPayload2
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
