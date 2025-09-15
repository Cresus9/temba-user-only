#!/usr/bin/env node

/**
 * Production Payment Testing Script
 * Tests the complete payment flow using API Direct Testing methodology
 */

const PROD_SUPABASE_URL = 'https://uwmlagvsivxqocklxbbo.supabase.co';
const PROD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3bWxhZ3ZzaXZ4cW9ja2x4YmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NzM4MjcsImV4cCI6MjA1MTI0OTgyN30.L8zTSaKJ5t9QyNZwKvx8xSvVLJvBtZnfKdRYQZW4fPE';

// Test configuration
const TEST_CONFIG = {
  event_id: '75efd523-bf76-4cbd-a8ae-03d4d12b3de0', // Use existing event ID
  ticket_type_id: 'c4f8d2a1-9b3e-4c5d-8f7a-1e2d3c4b5a69', // Use existing ticket type
  return_url: 'https://tembas.com/payment/success',
  cancel_url: 'https://tembas.com/payment/cancelled'
};

console.log('🔍 Starting Production Payment Debug Test...\n');

async function testCreatePayment() {
  console.log('📝 Step 1: Testing CREATE PAYMENT');
  console.log('=' .repeat(50));
  
  const createPayload = {
    idempotency_key: `test-${Date.now()}`,
    event_id: TEST_CONFIG.event_id,
    ticket_lines: [{
      ticket_type_id: TEST_CONFIG.ticket_type_id,
      quantity: 1,
      price_major: 15000,
      currency: 'XOF'
    }],
    amount_major: 15000,
    method: 'mobile_money',
    provider: 'orange',
    phone: '+22670000000',
    description: 'Test production payment',
    return_url: TEST_CONFIG.return_url,
    cancel_url: TEST_CONFIG.cancel_url
  };

  try {
    console.log('🚀 Sending create-payment request...');
    console.log('Payload:', JSON.stringify(createPayload, null, 2));
    
    const response = await fetch(`${PROD_SUPABASE_URL}/functions/v1/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': PROD_ANON_KEY,
        'Authorization': `Bearer ${PROD_ANON_KEY}`
      },
      body: JSON.stringify(createPayload)
    });

    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error Response:', errorText);
      return null;
    }

    const result = await response.json();
    console.log('✅ Success Response:', JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.log('❌ Network Error:', error.message);
    return null;
  }
}

async function testVerifyPayment(paymentToken, orderId) {
  console.log('\n📝 Step 2: Testing VERIFY PAYMENT');
  console.log('=' .repeat(50));
  
  const verifyPayload = {
    payment_token: paymentToken,
    order_id: orderId
  };

  try {
    console.log('🔍 Sending verify-payment request...');
    console.log('Payload:', JSON.stringify(verifyPayload, null, 2));
    
    const response = await fetch(`${PROD_SUPABASE_URL}/functions/v1/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': PROD_ANON_KEY,
        'Authorization': `Bearer ${PROD_ANON_KEY}`
      },
      body: JSON.stringify(verifyPayload)
    });

    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error Response:', errorText);
      return null;
    }

    const result = await response.json();
    console.log('✅ Success Response:', JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.log('❌ Network Error:', error.message);
    return null;
  }
}

async function testNotificationCount() {
  console.log('\n📝 Step 3: Testing NOTIFICATION COUNT');
  console.log('=' .repeat(50));
  
  try {
    console.log('🔔 Sending notification count request...');
    
    const response = await fetch(`${PROD_SUPABASE_URL}/rest/v1/notifications?select=*&read_at=is.null`, {
      method: 'HEAD',
      headers: {
        'apikey': PROD_ANON_KEY,
        'Authorization': `Bearer ${PROD_ANON_KEY}`
      }
    });

    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      console.log('❌ Notification endpoint failed');
      return false;
    }

    console.log('✅ Notification endpoint working');
    return true;
  } catch (error) {
    console.log('❌ Network Error:', error.message);
    return false;
  }
}

async function runCompleteTest() {
  console.log('🎯 Production Payment System Test');
  console.log('🌐 Environment: Production');
  console.log('🔗 Supabase URL:', PROD_SUPABASE_URL);
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('\n');

  // Step 1: Test create payment
  const createResult = await testCreatePayment();
  if (!createResult) {
    console.log('\n❌ CREATE PAYMENT FAILED - Cannot continue');
    return;
  }

  // Extract tokens and order info
  const paymentToken = createResult.payment_token;
  const orderId = createResult.order_id;
  
  console.log('\n🔑 Extracted Information:');
  console.log(`Payment Token: ${paymentToken}`);
  console.log(`Order ID: ${orderId}`);

  // Step 2: Test verify payment
  const verifyResult = await testVerifyPayment(paymentToken, orderId);
  if (!verifyResult) {
    console.log('\n❌ VERIFY PAYMENT FAILED');
  }

  // Step 3: Test notification endpoint
  await testNotificationCount();

  // Final summary
  console.log('\n📋 TEST SUMMARY');
  console.log('=' .repeat(50));
  console.log(`✅ Create Payment: ${createResult ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Verify Payment: ${verifyResult ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Notifications: ${await testNotificationCount() ? 'PASS' : 'FAIL'}`);
  
  if (createResult && verifyResult) {
    console.log('\n🎉 ALL TESTS PASSED - Payment system is working!');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED - Check the errors above');
  }
}

// Run the test
runCompleteTest().catch(console.error);
