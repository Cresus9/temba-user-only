// Production Payment Debugging Script
// This script tests the exact same flow as the frontend

const SUPABASE_URL = 'https://uwmlagvsivxqocklxbbo.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3bWxhZ3ZzaXZ4cW9ja2x4YmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyNzMwMjYsImV4cCI6MjA1MTg0OTAyNn0.ylTM28oYPVjotPmEn9TSZGPy4EQW2pbWgNLRqWYduLc';

async function testPaymentFlow() {
  console.log('🚀 Testing Production Payment Flow...\n');

  try {
    // Step 1: Create Payment
    console.log('1️⃣ Creating payment...');
    const createResponse = await fetch(`${SUPABASE_URL}/functions/v1/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        idempotency_key: `test-payment-${Date.now()}`,
        event_id: '889e61fc-ee25-4945-889a-29ec270bd4e2',
        ticket_lines: [{
          ticket_type_id: '28446aef-4fad-42b3-ac6b-c9a43cc62c0d',
          quantity: 1,
          price_major: 15000,
          currency: 'XOF'
        }],
        amount_major: 15000,
        currency: 'XOF',
        method: 'mobile_money',
        provider: 'orange',
        phone: '+22670000000',
        buyer_email: 'debug@test.com',
        description: 'Debug test payment',
        return_url: 'https://test.com/success',
        cancel_url: 'https://test.com/cancel'
      })
    });

    const createData = await createResponse.json();
    console.log('✅ Create Response:', createData);

    if (!createData.success) {
      console.log('❌ Payment creation failed:', createData.error);
      return;
    }

    // Step 2: Extract tokens
    const paymentToken = createData.payment_token;
    const paymentId = createData.payment_id;
    const internalToken = createData.internal_token;

    console.log('\n2️⃣ Extracted tokens:');
    console.log('   Payment Token:', paymentToken);
    console.log('   Payment ID:', paymentId);
    console.log('   Internal Token:', internalToken);

    // Step 3: Verify Payment (simulate frontend)
    console.log('\n3️⃣ Verifying payment (Frontend style)...');
    const verifyResponse = await fetch(`${SUPABASE_URL}/functions/v1/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        payment_token: paymentToken,
        order_id: paymentId
      })
    });

    const verifyData = await verifyResponse.json();
    console.log('✅ Verify Response:', verifyData);

    // Step 4: Test alternative verification methods
    console.log('\n4️⃣ Testing alternative verification...');
    
    // Try with internal token
    const altVerifyResponse = await fetch(`${SUPABASE_URL}/functions/v1/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        payment_token: internalToken,
        order_id: paymentId
      })
    });

    const altVerifyData = await altVerifyResponse.json();
    console.log('✅ Alt Verify Response:', altVerifyData);

    // Step 5: Summary
    console.log('\n📊 SUMMARY:');
    console.log('   Create Payment:', createData.success ? '✅ SUCCESS' : '❌ FAILED');
    console.log('   Verify Payment:', verifyData.success ? '✅ SUCCESS' : '❌ FAILED');
    console.log('   Alt Verify:', altVerifyData.success ? '✅ SUCCESS' : '❌ FAILED');

    if (verifyData.success) {
      console.log('\n🎉 PAYMENT FLOW IS WORKING IN PRODUCTION!');
      console.log('   The issue is likely in the frontend token handling.');
    } else {
      console.log('\n❌ PAYMENT VERIFICATION FAILED');
      console.log('   Error:', verifyData.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPaymentFlow();
