#!/usr/bin/env node

// Test Production Payment Function
// This script tests the production payment system with a small amount

const SUPABASE_URL = 'https://uwmlagvsivxqocklxbbo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3bWxhZ3ZzaXZ4cW9ja2x4YmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyNzMwMjYsImV4cCI6MjA1MTg0OTAyNn0.ylTM28oYPVjotPmEn9TSZGPy4EQW2pbWgNLRqWYduLc';

async function testProductionPayment() {
  console.log('🧪 Testing Production Payment System...\n');

  const testPayload = {
    idempotency_key: `test-${Date.now()}`,
    event_id: '6a444ee3-20f7-4193-9d20-6e80f209f1f2', // Valid UUID
    amount_major: 500, // 500 XOF - small test amount
    currency: 'XOF',
    method: 'mobile_money',
    buyer_email: 'test@tembas.com',
    phone: '+22670123456', // Test phone number
    description: 'Test payment - Production system - 500 XOF'
  };

  console.log('📋 Test Payload:');
  console.log(JSON.stringify(testPayload, null, 2));
  console.log('\n🚀 Calling production payment function...\n');

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-payment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'x-application-name': 'temba-test'
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    console.log('\n📊 Response Body:');
    console.log(responseText);
    
    // Check if response indicates live mode
    if (responseText.includes('Live Mode') || responseText.includes('live')) {
      console.log('🚀 CONFIRMED: System is in LIVE MODE!');
    } else if (responseText.includes('Test Mode') || responseText.includes('test')) {
      console.log('⚠️  WARNING: System appears to be in TEST MODE!');
    }

    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        
        if (data.success) {
          console.log('\n✅ SUCCESS! Production payment system is working!');
          console.log('🎯 Key Results:');
          console.log(`  - Payment ID: ${data.payment_id || 'N/A'}`);
          console.log(`  - Payment Token: ${data.payment_token || 'N/A'}`);
          console.log(`  - Payment URL: ${data.payment_url || 'N/A'}`);
          console.log(`  - Processing Time: ${data.processing_time_ms || 'N/A'}ms`);
          
          if (data.payment_url) {
            console.log('\n🔗 Next Steps:');
            console.log('1. Open the payment URL to complete the test payment');
            console.log('2. Use real mobile money (500 XOF)');
            console.log('3. Check webhook processing in Supabase logs');
            console.log('\n💡 Payment URL:');
            console.log(data.payment_url);
          }
        } else {
          console.log('\n❌ Payment creation failed:');
          console.log(`  Error: ${data.error || 'Unknown error'}`);
        }
      } catch (parseError) {
        console.log('\n⚠️  Response is not JSON, but request succeeded');
        console.log('Raw response:', responseText);
      }
    } else {
      console.log('\n❌ Request failed with status:', response.status);
      console.log('Response:', responseText);
    }

  } catch (error) {
    console.error('\n💥 Test failed with error:');
    console.error(error.message);
    
    if (error.message.includes('fetch')) {
      console.log('\n🔧 Possible issues:');
      console.log('  - Function not deployed yet');
      console.log('  - Network connectivity issue');
      console.log('  - Supabase project not accessible');
    }
  }

  console.log('\n🏁 Test completed.');
}

// Run the test
testProductionPayment().catch(console.error);
