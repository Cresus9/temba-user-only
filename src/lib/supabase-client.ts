import React from 'react';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
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
  // Add retrying for failed requests
  fetch: (url, options) => {
    const retryCount = 3;
    const retryDelay = 1000;

    const fetchWithRetry = async (attempt = 0): Promise<Response> => {
      try {
        const response = await fetch(url, options);
        
        // Only retry on network errors or 5xx server errors
        if (!response.ok && response.status >= 500 && attempt < retryCount) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return response;
      } catch (error) {
        if (attempt < retryCount) {
          console.warn(`Retrying failed request (attempt ${attempt + 1}/${retryCount})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
          return fetchWithRetry(attempt + 1);
        }
        throw error;
      }
    };

    return fetchWithRetry();
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

  // Implement retry logic for network errors
  if (error.message?.includes('Failed to fetch')) {
    let retries = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    while (retries < maxRetries) {
      try {
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, retries)));
        await supabase.auth.getSession();
        return;
      } catch (retryError) {
        retries++;
        if (retries === maxRetries) {
          toast.error('Unable to connect to the server. Please try again later.', {
            id: 'connection-error',
            duration: 4000,
            icon: React.createElement('img', { src: '/favicon.svg', alt: 'Temba Icon', className: 'w-6 h-6' }),
          });
        }
      }
    }
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