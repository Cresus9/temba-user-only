// Staging Environment Configuration
// This file contains staging-specific Supabase credentials

export const STAGING_CONFIG = {
  // Replace these with your actual staging Supabase project credentials
  SUPABASE_URL: 'https://your-staging-project-ref.supabase.co',
  SUPABASE_ANON_KEY: 'your-staging-anon-key-here',
  
  // Environment settings
  ENVIRONMENT: 'staging',
  APP_NAME: 'Temba (Staging)',
  DEBUG_MODE: true,
  
  // API endpoints (if different for staging)
  API_BASE_URL: 'https://your-staging-project-ref.supabase.co',
  
  // Feature flags for staging
  FEATURES: {
    ENABLE_LOGGING: true,
    ENABLE_DEBUG_TOOLS: true,
    MOCK_PAYMENTS: false, // Set to true if you want to test without real payments
  }
};

// Export environment detection helper
export const isStaging = () => {
  return import.meta.env.VITE_ENVIRONMENT === 'staging' || 
         window.location.hostname.includes('staging') ||
         import.meta.env.MODE === 'staging';
};
