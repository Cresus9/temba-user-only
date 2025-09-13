import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AppRoutes from './routes';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineWarning from './components/common/OfflineWarning';
import { useEvents } from './context/EventContext';
import { imageCacheWarmer } from './utils/imageCacheWarmer';

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
        <Navbar />
        <main className="flex-grow">
          <AppRoutes />
        </main>
        <Footer />
        <Toaster position="top-right" />
        <OfflineWarning />
      </div>
    </ErrorBoundary>
  );
}

export default App;