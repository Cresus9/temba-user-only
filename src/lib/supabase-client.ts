import React from 'react';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import { AUTH_CONFIG } from '../config/auth';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local, set the project you want (US staging vs Paris prod), then restart the dev server.'
  );
}

/** For Edge Function `fetch` fallbacks (same values as the client). */
export { supabaseUrl, supabaseAnonKey };

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: AUTH_CONFIG.SESSION.PERSIST_SESSION,
    autoRefreshToken: AUTH_CONFIG.SESSION.AUTO_REFRESH_TOKEN,
    detectSessionInUrl: AUTH_CONFIG.SESSION.DETECT_SESSION_IN_URL,
    flowType: AUTH_CONFIG.SESSION.FLOW_TYPE,
    redirectTo: AUTH_CONFIG.REDIRECT_URLS.PASSWORD_RESET
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'x-application-name': 'afritix'
    }
  },
  db: {
    schema: 'public'
  },
  // Retry only dropped connections. Replaying 503s turns ordinary load into a REST storm.
  fetch: async (url, options) => {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (!navigator.onLine) throw error;
      await new Promise((resolve) => setTimeout(resolve, 400));
      return fetch(url, options);
    }
  }
});

// Add error handling middleware
const handleSupabaseError = async (error: Error): Promise<void> => {
  console.error('Supabase error:', error);
  
  if (!navigator.onLine) {
    toast.error('You are offline. Please check your internet connection.', {
      id: 'offline-error',
      duration: 4000,
      icon: React.createElement('img', { src: '/favicon.svg', alt: 'Temba Icon', className: 'w-6 h-6' }),
    });
    return;
  }

  if (error.message?.includes('Failed to fetch')) {
    toast.error('Unable to connect to the server. Please try again later.', {
      id: 'connection-error',
      duration: 4000,
      icon: React.createElement('img', { src: '/favicon.svg', alt: 'Temba Icon', className: 'w-6 h-6' }),
    });
    return;
  }

  // Handle other errors
  toast.error(error.message || 'An unexpected error occurred', {
    id: 'supabase-error',
    duration: 4000,
    icon: React.createElement('img', { src: '/favicon.svg', alt: 'Temba Icon', className: 'w-6 h-6' }),
  });
};

// Add error handler to supabase client
supabase.handleError = handleSupabaseError;

export default supabase;