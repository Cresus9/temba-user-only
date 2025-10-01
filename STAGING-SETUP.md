# 🚀 Staging Environment Setup

This guide will help you connect your staging branch to your Supabase staging environment.

## 📋 Prerequisites

1. **Supabase Staging Project**: You should have created a staging branch/project in Supabase
2. **Staging Credentials**: Get your staging project URL and anon key from Supabase

## 🔧 Setup Steps

### Step 1: Update Staging Configuration

Edit `src/config/staging.ts` and replace the placeholder values with your actual staging credentials:

```typescript
export const STAGING_CONFIG = {
  // Replace with your actual staging Supabase project URL
  SUPABASE_URL: 'https://your-actual-staging-ref.supabase.co',
  
  // Replace with your actual staging anon key
  SUPABASE_ANON_KEY: 'your-actual-staging-anon-key-here',
  
  // ... rest of config
};
```

### Step 2: Get Your Staging Credentials

1. Go to your Supabase dashboard
2. Select your **staging project**
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **Project API Keys** → **anon public** key

### Step 3: Update the Configuration

Replace the values in `src/config/staging.ts`:

```typescript
export const STAGING_CONFIG = {
  SUPABASE_URL: 'https://your-staging-ref.supabase.co', // ← Your staging URL
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', // ← Your staging anon key
  // ... rest stays the same
};
```

## 🚀 Running in Staging Mode

### Option 1: Using npm scripts (Recommended)
```bash
# Start in staging mode
npm run dev:staging

# Build for staging
npm run build:staging

# Preview staging build
npm run preview:staging
```

### Option 2: Using environment scripts
```bash
# Switch to staging and run
npm run staging

# Switch back to production
npm run production
```

### Option 3: Manual environment variable
```bash
# Set environment variable and run
VITE_ENVIRONMENT=staging npm run dev
```

## 🔍 How It Works

The app automatically detects the environment using:

1. **Environment Variable**: `VITE_ENVIRONMENT=staging`
2. **Hostname Detection**: URLs containing "staging"
3. **Build Mode**: `import.meta.env.MODE === 'staging'`

When in staging mode:
- ✅ Uses staging Supabase credentials
- ✅ Shows "Temba (Staging)" in the app
- ✅ Enables debug mode and logging
- ✅ Console shows "🚀 Using STAGING Supabase configuration"

When in production mode:
- ✅ Uses production Supabase credentials
- ✅ Shows normal "Temba" branding
- ✅ Console shows "🌍 Using PRODUCTION Supabase configuration"

## 🔧 Environment Detection

You can check which environment you're in by looking at the browser console:

- **Staging**: `🚀 Using STAGING Supabase configuration`
- **Production**: `🌍 Using PRODUCTION Supabase configuration`

## 📁 File Structure

```
src/
├── config/
│   ├── staging.ts          # Staging configuration
│   └── auth.ts            # Auth configuration (shared)
├── lib/
│   └── supabase-client.ts # Environment-aware Supabase client
└── ...

scripts/
├── switch-to-staging.sh   # Switch to staging script
└── switch-to-production.sh # Switch to production script
```

## 🚨 Important Notes

1. **Never commit real credentials** to version control
2. **Test thoroughly** in staging before deploying to production
3. **Database migrations** should be applied to staging first
4. **Environment variables** take precedence over hardcoded values

## 🐛 Troubleshooting

### Issue: Still connecting to production
- Check console for environment detection message
- Verify `VITE_ENVIRONMENT=staging` is set
- Clear browser cache and restart dev server

### Issue: Supabase connection errors
- Verify staging credentials are correct
- Check Supabase project is active
- Ensure API keys have correct permissions

### Issue: Environment not switching
- Restart the dev server after changing environment
- Check browser console for configuration logs
- Verify scripts have execute permissions: `chmod +x scripts/*.sh`

## 🎯 Next Steps

1. **Update staging config** with real credentials
2. **Test the connection** by running `npm run dev:staging`
3. **Verify in console** you see the staging message
4. **Deploy staging branch** to your staging environment
5. **Test all features** in staging before production deployment

---

**Happy staging! 🚀**
