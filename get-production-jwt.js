#!/usr/bin/env node

/**
 * Get Production JWT Token Helper
 * This script helps identify the correct JWT token for production
 */

console.log('🔍 Production JWT Token Detective');
console.log('=================================');
console.log('');

console.log('🎯 The Issue:');
console.log('- The JWT token in our test script is invalid/expired');
console.log('- Production is using a different JWT token');
console.log('- We need to find the correct production JWT token');
console.log('');

console.log('🔍 How to Find the Real Production JWT Token:');
console.log('============================================');
console.log('');

console.log('📋 Method 1: Browser DevTools (Recommended)');
console.log('-------------------------------------------');
console.log('1. 🌐 Go to https://tembas.com');
console.log('2. 🔧 Open DevTools (F12 or Right-click → Inspect)');
console.log('3. 🔗 Go to Network tab');
console.log('4. 🔄 Refresh the page or make any API call');
console.log('5. 🔍 Look for requests to "uwmlagvsivxqocklxbbo.supabase.co"');
console.log('6. 📋 Click on any request and check Headers');
console.log('7. 🔑 Copy the "Authorization: Bearer <token>" value');
console.log('8. 📝 The <token> part is your production JWT');
console.log('');

console.log('📋 Method 2: Check Deployment Platform');
console.log('--------------------------------------');
console.log('1. 🚀 Go to your deployment platform (Netlify/Vercel/etc.)');
console.log('2. ⚙️  Find Environment Variables section');
console.log('3. 🔍 Look for VITE_SUPABASE_ANON_KEY');
console.log('4. 📋 Copy that value - that\'s your production JWT');
console.log('');

console.log('📋 Method 3: Check Local Environment');
console.log('------------------------------------');
console.log('1. 📁 Check if you have a .env file in your project');
console.log('2. 🔍 Look for VITE_SUPABASE_ANON_KEY');
console.log('3. 📋 That might be your production key');
console.log('');

console.log('🎯 Once You Have the Real JWT Token:');
console.log('====================================');
console.log('1. 📝 Replace the PROD_ANON_KEY in debug-payment-production.js');
console.log('2. 🧪 Run the test again: node debug-payment-production.js');
console.log('3. ✅ The payment flow should work with the correct token');
console.log('');

console.log('💡 Expected JWT Token Format:');
console.log('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3bWxhZ3ZzaXZ4cW9ja2x4YmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NzM4MjcsImV4cCI6MjA1MTI0OTgyN30.DIFFERENT_SIGNATURE');
console.log('');

console.log('⚠️  Current Issue Summary:');
console.log('=========================');
console.log('❌ Invalid JWT: The token in our test script is expired/wrong');
console.log('✅ Functions Work: create-payment and verify-payment are deployed');
console.log('✅ Infrastructure: Production environment is healthy');
console.log('🔑 Solution: Get the real production JWT token');
console.log('');

console.log('🚀 Next Action: Get the real JWT token using Method 1 above!');
