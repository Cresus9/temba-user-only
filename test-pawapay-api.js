/**
 * pawaPay API Diagnostic Script
 * 
 * This script tests different payload variations to identify what pawaPay accepts.
 * Run this to help diagnose UNKNOWN_ERROR issues.
 * 
 * Usage:
 * 1. Set your pawaPay API key as environment variable: PAWAPAY_API_KEY=your_key
 * 2. Run: node test-pawapay-api.js
 */

const PAWAPAY_API_KEY = process.env.PAWAPAY_API_KEY || '';
const PAWAPAY_API_SECRET = process.env.PAWAPAY_API_SECRET || '';
const MODE = process.env.MODE || 'production'; // or 'sandbox'

if (!PAWAPAY_API_KEY) {
  console.error('❌ Error: PAWAPAY_API_KEY environment variable not set');
  console.log('Set it with: export PAWAPAY_API_KEY=your_key');
  process.exit(1);
}

const API_URL = MODE === 'production'
  ? 'https://api.pawapay.cloud/v1/payments'
  : 'https://api-sandbox.pawapay.cloud/v1/payments';

console.log(`🔍 Testing pawaPay API (${MODE} mode)`);
console.log(`📡 Endpoint: ${API_URL}`);
console.log(`🔑 API Key: ${PAWAPAY_API_KEY.substring(0, 10)}...`);
console.log('');

// Test cases with different variations
const testCases = [
  {
    name: 'Test 1: Minimal payload (string value)',
    payload: {
      amount: {
        currency: 'XOF',
        value: '1100'  // String
      },
      payer: {
        type: 'MSISDN',
        account: '+22675581026'
      },
      paymentMethod: 'ORANGE',
      reference: `test-${Date.now()}`,
      description: 'Test payment',
      callbackUrl: 'https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/pawapay-webhook'
    }
  },
  {
    name: 'Test 2: Number value',
    payload: {
      amount: {
        currency: 'XOF',
        value: 1100  // Number
      },
      payer: {
        type: 'MSISDN',
        account: '+22675581026'
      },
      paymentMethod: 'ORANGE',
      reference: `test-${Date.now()}`,
      description: 'Test payment',
      callbackUrl: 'https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/pawapay-webhook'
    }
  },
  {
    name: 'Test 3: ORANGE_MONEY_BF',
    payload: {
      amount: {
        currency: 'XOF',
        value: 1100
      },
      payer: {
        type: 'MSISDN',
        account: '+22675581026'
      },
      paymentMethod: 'ORANGE_MONEY_BF',
      reference: `test-${Date.now()}`,
      description: 'Test payment',
      callbackUrl: 'https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/pawapay-webhook'
    }
  },
  {
    name: 'Test 4: Phone without +',
    payload: {
      amount: {
        currency: 'XOF',
        value: 1100
      },
      payer: {
        type: 'MSISDN',
        account: '22675581026'  // No +
      },
      paymentMethod: 'ORANGE',
      reference: `test-${Date.now()}`,
      description: 'Test payment',
      callbackUrl: 'https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/pawapay-webhook'
    }
  },
  {
    name: 'Test 5: Full payload with all fields',
    payload: {
      amount: {
        currency: 'XOF',
        value: 1100
      },
      payer: {
        type: 'MSISDN',
        account: '+22675581026'
      },
      paymentMethod: 'ORANGE',
      reference: `test-${Date.now()}`,
      description: 'Test payment - Full payload',
      callbackUrl: 'https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/pawapay-webhook',
      returnUrl: 'http://localhost:5174/payment/success',
      cancelUrl: 'http://localhost:5174/payment/cancelled',
      metadata: {
        test: true,
        timestamp: Date.now()
      }
    }
  }
];

async function testPayload(testCase) {
  console.log(`\n🧪 ${testCase.name}`);
  console.log('📤 Request payload:');
  console.log(JSON.stringify(testCase.payload, null, 2));

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${PAWAPAY_API_KEY}`
  };

  if (PAWAPAY_API_SECRET && PAWAPAY_API_SECRET.trim() !== '') {
    headers['X-API-Secret'] = PAWAPAY_API_SECRET;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(testCase.payload)
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { raw: responseText };
    }

    console.log(`📥 Response status: ${response.status} ${response.statusText}`);
    console.log('📥 Response body:');
    console.log(JSON.stringify(responseData, null, 2));

    if (response.ok) {
      console.log('✅ SUCCESS! This payload format works!');
      return { success: true, testCase: testCase.name };
    } else {
      console.log('❌ FAILED');
      if (responseData.failureReason) {
        console.log(`Error code: ${responseData.failureReason.failureCode}`);
        console.log(`Error message: ${responseData.failureReason.failureMessage}`);
      }
      return { success: false, error: responseData };
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting pawaPay API diagnostic tests...\n');
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await testPayload(testCase);
    results.push({ ...result, name: testCase.name });
    
    // Wait 2 seconds between tests to avoid rate limiting
    if (testCase !== testCases[testCases.length - 1]) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n\n📊 SUMMARY:');
  console.log('='.repeat(50));
  
  const successes = results.filter(r => r.success);
  const failures = results.filter(r => !r.success);
  
  if (successes.length > 0) {
    console.log(`\n✅ ${successes.length} successful test(s):`);
    successes.forEach(r => console.log(`   - ${r.name}`));
  }
  
  if (failures.length > 0) {
    console.log(`\n❌ ${failures.length} failed test(s):`);
    failures.forEach(r => console.log(`   - ${r.name}`));
  }

  if (successes.length === 0) {
    console.log('\n⚠️  All tests failed. This suggests:');
    console.log('   1. Account not activated/KYC not completed');
    console.log('   2. Wrong API endpoint (try /v2/ instead of /v1/)');
    console.log('   3. Invalid API credentials');
    console.log('   4. Webhook URL not configured in dashboard');
    console.log('\n💡 Contact pawaPay support with these test results.');
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

