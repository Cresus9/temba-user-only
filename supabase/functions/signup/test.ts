// Test script for the signup edge function
// Run this with: deno run --allow-net test.ts

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://your-project-ref.supabase.co';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || 'your-anon-key';

async function testSignup() {
  console.log('🧪 Testing signup edge function...\n');

  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'testpassword123',
    name: 'Test User',
    phone: '+22612345678'
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify(testUser)
    });

    const result = await response.json();

    console.log('📤 Request:', testUser);
    console.log('📥 Response Status:', response.status);
    console.log('📥 Response:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('✅ Signup test PASSED');
      console.log('👤 User created:', result.user.email);
    } else {
      console.log('❌ Signup test FAILED');
      console.log('🚨 Error:', result.error);
    }

  } catch (error) {
    console.log('❌ Test failed with error:', error);
  }
}

async function testValidation() {
  console.log('\n🧪 Testing validation...\n');

  const testCases = [
    {
      name: 'Missing email',
      data: { password: 'test123', name: 'Test' },
      expectedError: 'Email, password, and name are required'
    },
    {
      name: 'Invalid email',
      data: { email: 'invalid-email', password: 'test123', name: 'Test' },
      expectedError: 'Invalid email format'
    },
    {
      name: 'Weak password',
      data: { email: 'test@example.com', password: '123', name: 'Test' },
      expectedError: 'Password must be at least 8 characters long'
    }
  ];

  for (const testCase of testCases) {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`
        },
        body: JSON.stringify(testCase.data)
      });

      const result = await response.json();

      console.log(`📤 ${testCase.name}:`, testCase.data);
      console.log(`📥 Response:`, result);

      if (result.error === testCase.expectedError) {
        console.log(`✅ ${testCase.name} PASSED`);
      } else {
        console.log(`❌ ${testCase.name} FAILED`);
        console.log(`Expected: ${testCase.expectedError}`);
        console.log(`Got: ${result.error}`);
      }

    } catch (error) {
      console.log(`❌ ${testCase.name} failed with error:`, error);
    }
  }
}

// Run tests
if (import.meta.main) {
  await testValidation();
  await testSignup();
} 