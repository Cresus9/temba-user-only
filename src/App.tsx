import React, { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AppRoutes from './routes';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineWarning from './components/common/OfflineWarning';
import AppBanner from './components/AppBanner';
import PendingTransfersNotification from './components/tickets/PendingTransfersNotification';
import ReferralQueryCapture from './components/referral/ReferralQueryCapture';
import { useEvents } from './context/EventContext';
import { imageCacheWarmer } from './utils/imageCacheWarmer';

function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  const { featuredEvents } = useEvents();

  // Warm image cache when app loads
  useEffect(() => {
    // Wait a bit for initial page load, then start warming cache
    const timer = setTimeout(() => {
      if (featuredEvents && featuredEvents.length > 0) {
        imageCacheWarmer.warmCache({
          featuredEvents: featuredEvents.map(event => ({
            image_url: event.image_url,
            title: event.title
          }))
        });
      }
    }, 1500); // Wait 1.5s after app loads

    return () => clearTimeout(timer);
  }, [featuredEvents]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 to-indigo-50">
        <ReferralQueryCapture />
        <AppBanner />
        <Navbar />
        <main className="flex-grow">
          <PageTransition>
            <AppRoutes />
          </PageTransition>
        </main>
        <Footer />
        <Toaster position="top-right" />
        <OfflineWarning />
        <PendingTransfersNotification />
      </div>
    </ErrorBoundary>
  );
}

export default App;