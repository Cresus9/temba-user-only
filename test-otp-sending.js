/**
 * OTP Sending Diagnostic Tool
 * 
 * Usage:
 *   node test-otp-sending.js +22675581026
 *   node test-otp-sending.js 75581026
 *   node test-otp-sending.js --check-config
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
try {
  const envPath = join(__dirname, '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (e) {
  // .env.local might not exist, that's OK
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

// Normalize phone number to E.164 format
function normalizePhone(phone) {
  if (!phone) return phone;
  
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  cleaned = cleaned.replace(/^0+/, '');
  
  if (cleaned.startsWith('226') && cleaned.length === 11) {
    return '+' + cleaned;
  }
  
  if (cleaned.length === 8) {
    return '+226' + cleaned;
  }
  
  const westAfricanCodes = ['226', '225', '233', '221', '223', '227', '228', '229'];
  for (const code of westAfricanCodes) {
    if (cleaned.startsWith(code) && cleaned.length >= 10 && cleaned.length <= 13) {
      return '+' + cleaned;
    }
  }
  
  if (cleaned.length >= 7 && cleaned.length <= 10) {
    return '+226' + cleaned;
  }
  
  return '+' + cleaned;
}

// Validate phone format
function isValidPhone(phone) {
  return /^\+\d{7,15}$/.test(phone);
}

// Check configuration
async function checkConfig() {
  console.log('\n🔍 Checking Configuration...\n');
  
  console.log('✅ Supabase URL:', SUPABASE_URL ? 'Set' : '❌ Missing');
  console.log('✅ Supabase Anon Key:', SUPABASE_ANON_KEY ? 'Set' : '❌ Missing');
  
  // Test Supabase connection
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.from('otp_codes').select('count').limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist (OK)
      console.log('⚠️  Database connection:', error.message);
    } else {
      console.log('✅ Database connection: OK');
    }
  } catch (error) {
    console.log('❌ Database connection:', error.message);
  }
  
  console.log('\n📝 Note: Twilio credentials are stored as Supabase secrets');
  console.log('   Check with: supabase secrets list | grep TWILIO\n');
}

// Test OTP sending
async function testOTPSending(phone) {
  console.log('\n🧪 Testing OTP Sending...\n');
  
  const normalizedPhone = normalizePhone(phone);
  
  console.log('📱 Phone Number:');
  console.log('   Original:', phone);
  console.log('   Normalized:', normalizedPhone);
  console.log('   Valid Format:', isValidPhone(normalizedPhone) ? '✅ Yes' : '❌ No');
  
  if (!isValidPhone(normalizedPhone)) {
    console.error('\n❌ Invalid phone number format!');
    console.error('   Expected: E.164 format (+[country][number])');
    console.error('   Example: +22675581026');
    process.exit(1);
  }
  
  // Extract country code
  const countryCode = normalizedPhone.substring(0, 4);
  const localNumber = normalizedPhone.substring(4);
  
  console.log('   Country Code:', countryCode);
  console.log('   Local Number:', localNumber);
  console.log('   Total Length:', normalizedPhone.length, 'characters');
  
  console.log('\n📤 Sending OTP Request...\n');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ phone: normalizedPhone })
    });
    
    const result = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Body:', JSON.stringify(result, null, 2));
    
    if (response.ok && result.success) {
      console.log('\n✅ OTP sent successfully!');
      console.log('   Phone:', result.phone || normalizedPhone);
      console.log('\n💡 Check the phone for SMS message');
      console.log('   If SMS not received, check:');
      console.log('   1. Twilio Console logs');
      console.log('   2. Geo Permissions settings');
      console.log('   3. Phone number validity');
      console.log('   4. Carrier SMS support');
    } else {
      console.log('\n❌ OTP sending failed!');
      console.log('   Error:', result.error || 'Unknown error');
      
      // Provide specific guidance based on error
      if (result.error?.includes('configuration')) {
        console.log('\n💡 Fix: Set Twilio secrets in Supabase');
        console.log('   supabase secrets set TWILIO_ACCOUNT_SID=...');
        console.log('   supabase secrets set TWILIO_AUTH_TOKEN=...');
        console.log('   supabase secrets set TWILIO_PHONE_NUMBER=...');
      } else if (result.error?.includes('21408') || result.error?.includes('Permission')) {
        console.log('\n💡 Fix: Enable Geo Permissions in Twilio Console');
        console.log('   1. Go to Twilio Console → Settings → Geo Permissions');
        console.log('   2. Enable SMS for required countries');
      } else if (result.error?.includes('21211') || result.error?.includes('Invalid')) {
        console.log('\n💡 Fix: Check phone number format');
        console.log('   Must be E.164 format: +[country][number]');
      }
    }
    
    // Check database for OTP record
    if (response.ok) {
      console.log('\n🔍 Checking Database...\n');
      
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data: otpRecords, error: dbError } = await supabase
          .from('otp_codes')
          .select('*')
          .eq('phone', normalizedPhone)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (dbError) {
          console.log('⚠️  Could not check database:', dbError.message);
        } else if (otpRecords && otpRecords.length > 0) {
          const otp = otpRecords[0];
          console.log('✅ OTP found in database:');
          console.log('   Code:', otp.code);
          console.log('   Created:', new Date(otp.created_at).toLocaleString());
          console.log('   Expires:', new Date(otp.expires_at).toLocaleString());
          console.log('   Verified:', otp.verified ? 'Yes' : 'No');
          console.log('   Attempts:', otp.attempts);
          
          const now = new Date();
          const expiresAt = new Date(otp.expires_at);
          if (now > expiresAt) {
            console.log('   ⚠️  Status: EXPIRED');
          } else if (otp.verified) {
            console.log('   ✅ Status: VERIFIED');
          } else {
            console.log('   ✅ Status: ACTIVE');
          }
        } else {
          console.log('⚠️  No OTP record found in database');
          console.log('   (This might be OK if database storage failed but SMS was sent)');
        }
      } catch (error) {
        console.log('⚠️  Database check error:', error.message);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
    console.error('\n💡 Check:');
    console.error('   1. Network connectivity');
    console.error('   2. Supabase URL is correct');
    console.error('   3. Edge function is deployed');
    process.exit(1);
  }
}

// Main
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log('\n📱 OTP Sending Diagnostic Tool\n');
  console.log('Usage:');
  console.log('  node test-otp-sending.js <phone-number>');
  console.log('  node test-otp-sending.js --check-config');
  console.log('\nExamples:');
  console.log('  node test-otp-sending.js +22675581026');
  console.log('  node test-otp-sending.js 75581026');
  console.log('  node test-otp-sending.js --check-config');
  process.exit(0);
}

if (args[0] === '--check-config') {
  await checkConfig();
} else {
  const phone = args[0];
  await testOTPSending(phone);
}

console.log('\n');

