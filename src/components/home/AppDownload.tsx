import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';

// App Store Icon Component
const AppStoreIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
);

// Google Play Icon Component
const GooglePlayIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
  </svg>
);

export default function AppDownload() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleAppStoreDownload = () => {
    window.open('https://apps.apple.com/us/app/temba/id6748848506', '_blank');
  };

  const handleGooglePlayDownload = () => {
    window.open('https://play.google.com/store/apps/details?id=app.rork.temba&pcampaignid=web_share', '_blank');
  };

  const handleInstallWebApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
      }
    }
  };

  return (
    <section className="bg-gradient-to-r from-indigo-600 to-purple-600">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          
          {/* Left Side - Content */}
          <div className="flex-1 text-center lg:text-left">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Téléchargez l'application Temba
            </h2>
            <p className="text-lg text-white/80 mb-6 max-w-md mx-auto lg:mx-0">
              Accédez à vos billets hors ligne et découvrez des événements près de chez vous
            </p>

            {/* Download Buttons */}
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
              <button
                onClick={handleAppStoreDownload}
                className="flex items-center gap-3 px-5 py-3 bg-black text-white rounded-xl hover:bg-gray-900 transition-colors"
              >
                <AppStoreIcon className="h-6 w-6" />
                <div className="text-left">
                  <div className="text-[10px] text-gray-400 leading-none">Télécharger sur</div>
                  <div className="text-sm font-semibold leading-tight">App Store</div>
                </div>
              </button>
              
              <button
                onClick={handleGooglePlayDownload}
                className="flex items-center gap-3 px-5 py-3 bg-black text-white rounded-xl hover:bg-gray-900 transition-colors"
              >
                <GooglePlayIcon className="h-6 w-6" />
                <div className="text-left">
                  <div className="text-[10px] text-gray-400 leading-none">Disponible sur</div>
                  <div className="text-sm font-semibold leading-tight">Google Play</div>
                </div>
              </button>

              {showInstallPrompt && (
                <button
                  onClick={handleInstallWebApp}
                  className="flex items-center gap-3 px-5 py-3 bg-white text-gray-900 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <Globe className="h-5 w-5 text-indigo-600" />
                  <div className="text-left">
                    <div className="text-[10px] text-gray-500 leading-none">Installer</div>
                    <div className="text-sm font-semibold leading-tight">App Web</div>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Right Side - Phone Mockup */}
          <div className="flex-shrink-0">
            <div className="relative bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
              {/* Dynamic Island */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-5 bg-black rounded-full z-20"></div>
              
              {/* Screen */}
              <div className="w-40 h-80 bg-white rounded-[2rem] overflow-hidden">
                <img 
                  src="/temba-app.png" 
                  alt="Temba App" 
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                />
              </div>

              {/* Home Indicator */}
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-20 h-1 bg-white/80 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
