#!/usr/bin/env node

// Debug Paydunya Keys and API Response
// This script helps debug why we're getting test tokens in live mode

const SUPABASE_URL = 'https://uwmlagvsivxqocklxbbo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3bWxhZ3ZzaXZ4cW9ja2x4YmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyNzMwMjYsImV4cCI6MjA1MTg0OTAyNn0.ylTM28oYPVjotPmEn9TSZGPy4EQW2pbWgNLRqWYduLc';

async function debugPaydunyaKeys() {
  console.log('🔍 Debugging Paydunya Keys and API Response...\n');

  // Test with a real event ID from your logs
  const testPayload = {
    idempotency_key: `debug-${Date.now()}`,
    event_id: '4949bb87-2416-42e4-9c6a-a0b9e42fa395', // Real event ID from your logs
    buyer_email: 'debug@tembas.com', // Required field
    ticket_lines: [{
      ticket_type_id: '6ae8904c-ef6e-412d-b25b-aacd51c33507',
      quantity: 1,
      price_major: 500,
      currency: 'XOF'
    }],
    amount_major: 500,
    currency: 'XOF',
    method: 'mobile_money',
    phone: '+22674750815',
    provider: 'orange',
    description: 'Debug payment - Check live keys'
  };

  console.log('📋 Debug Payload:');
  console.log(JSON.stringify(testPayload, null, 2));
  console.log('\n🚀 Calling create-payment function...\n');

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-payment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'x-application-name': 'temba-debug'
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Body:');
    console.log(responseText);

    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        
        console.log('\n🔍 ANALYSIS:');
        
        if (data.success) {
          const token = data.payment_token;
          console.log('✅ Payment creation succeeded');
          console.log(`🎯 Payment Token: ${token}`);
          
          // Analyze token pattern
          if (token && token.startsWith('test_')) {
            console.log('❌ ISSUE: Token starts with "test_" - This suggests:');
            console.log('   1. Paydunya API keys might be test keys');
            console.log('   2. Paydunya account might be in test mode');
            console.log('   3. API endpoint might be sandbox instead of live');
          } else if (token && token.length > 10) {
            console.log('✅ GOOD: Token looks like a real Paydunya token');
          } else {
            console.log('⚠️  WARNING: Unexpected token format');
          }
          
          if (data.payment_url) {
            console.log(`🔗 Payment URL: ${data.payment_url}`);
            
            if (data.payment_url.includes('sandbox') || data.payment_url.includes('test')) {
              console.log('❌ ISSUE: Payment URL contains "sandbox" or "test"');
            } else {
              console.log('✅ GOOD: Payment URL looks like live Paydunya');
            }
          } else {
            console.log('❌ ISSUE: No payment URL returned');
          }
          
        } else {
          console.log('❌ Payment creation failed:', data.error);
        }
        
      } catch (parseError) {
        console.log('⚠️  Response is not JSON:', responseText);
      }
    } else {
      console.log('❌ Request failed:', responseText);
    }

  } catch (error) {
    console.error('💥 Debug failed:', error.message);
  }

  console.log('\n📝 RECOMMENDATIONS:');
  console.log('1. Check Supabase Edge Function environment variables');
  console.log('2. Verify Paydunya account is in LIVE mode');
  console.log('3. Confirm API keys are PRODUCTION keys, not test keys');
  console.log('4. Check Paydunya dashboard for account status');
  console.log('\n🏁 Debug completed.');
}

// Run the debug
debugPaydunyaKeys().catch(console.error);
