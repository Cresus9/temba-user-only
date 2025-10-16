#!/usr/bin/env node

// Test Webhook Mode - Check if verify-payment function is in live mode

const SUPABASE_URL = 'https://uwmlagvsivxqocklxbbo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3bWxhZ3ZzaXZ4cW9ja2x4YmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyNzMwMjYsImV4cCI6MjA1MTg0OTAyNn0.ylTM28oYPVjotPmEn9TSZGPy4EQW2pbWgNLRqWYduLc';

async function testWebhookMode() {
  console.log('🔍 Testing Webhook/Verify-Payment Mode...\n');

  const testPayload = {
    payment_token: 'test-token-123',
    order_id: 'test-order-456'
  };

  console.log('📋 Test Payload:');
  console.log(JSON.stringify(testPayload, null, 2));
  console.log('\n🚀 Calling verify-payment function...\n');

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-payment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'x-application-name': 'temba-webhook-test'
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Body:');
    console.log(responseText);

    // Check for mode indicators in the response
    if (responseText.includes('https://app.paydunya.com/api/v1')) {
      console.log('\n🚀 ✅ CONFIRMED: Webhook is using LIVE Paydunya API!');
      console.log('   API URL: https://app.paydunya.com/api/v1 (LIVE)');
    } else if (responseText.includes('https://app.paydunya.com/sandbox-api/v1')) {
      console.log('\n⚠️  ❌ WARNING: Webhook is using TEST Paydunya API!');
      console.log('   API URL: https://app.paydunya.com/sandbox-api/v1 (TEST)');
    }

    if (responseText.includes('Live Mode')) {
      console.log('🚀 ✅ CONFIRMED: Response indicates LIVE MODE!');
    } else if (responseText.includes('Test Mode')) {
      console.log('⚠️  ❌ WARNING: Response indicates TEST MODE!');
    }

    // Check logs for mode indication
    if (responseText.includes('Mode: live')) {
      console.log('🚀 ✅ CONFIRMED: Function logs show LIVE mode!');
    } else if (responseText.includes('Mode: test')) {
      console.log('⚠️  ❌ WARNING: Function logs show TEST mode!');
    }

    console.log('\n📝 Analysis:');
    console.log('- The error is expected (fake tokens)');
    console.log('- What matters is the API URL and mode indicators');
    console.log('- Check Supabase function logs for "Using Paydunya API URL" message');

  } catch (error) {
    console.error('\n💥 Test failed with error:');
    console.error(error.message);
  }

  console.log('\n🏁 Webhook mode test completed.');
}

// Run the test
testWebhookMode().catch(console.error);



