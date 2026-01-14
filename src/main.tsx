// Import polyfills first for browser compatibility
import './polyfills';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import { EventProvider } from './context/EventContext';
import { NotificationProvider } from './context/NotificationContext';
import { RealtimeProvider } from './context/RealtimeContext';
import { TranslationProvider } from './context/TranslationContext';
import App from './App';
import './index.css';

// Initialize Supabase client
import './lib/supabase-client';

// Import test utilities in development
if (import.meta.env.DEV) {
  import('./utils/testNotifications');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <TranslationProvider>
          <AuthProvider>
            <EventProvider>
              <NotificationProvider>
                <RealtimeProvider>
                  <App />
                </RealtimeProvider>
              </NotificationProvider>
            </EventProvider>
          </AuthProvider>
        </TranslationProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
);