import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import toast from 'react-hot-toast';

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
    toast('📱 L\'application Temba sera bientôt disponible sur l\'App Store !', {
      icon: '🍎',
      duration: 4000,
    });
  };

  const handleGooglePlayDownload = () => {
    // Official Temba app on Google Play Store
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
    <section className="relative bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      {/* Dynamic Animated Background */}
      <div className="absolute inset-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"></div>
        
        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-orange-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-green-500/15 to-teal-500/15 rounded-full blur-3xl animate-pulse delay-500"></div>
        
        {/* Floating particles */}
        <div className="absolute top-1/3 left-1/3 w-2 h-2 bg-white/20 rounded-full animate-bounce delay-300"></div>
        <div className="absolute top-2/3 right-1/3 w-1 h-1 bg-blue-400/30 rounded-full animate-bounce delay-700"></div>
        <div className="absolute bottom-1/3 left-2/3 w-1.5 h-1.5 bg-orange-400/25 rounded-full animate-bounce delay-1000"></div>
        <div className="absolute top-1/4 right-1/4 w-1 h-1 bg-purple-400/30 rounded-full animate-bounce delay-500"></div>
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_50%,transparent_75%)] bg-[length:30px_30px] opacity-50"></div>
        
        {/* Radial light effects */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_30%,rgba(120,119,198,0.1),transparent_60%)]"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_70%,rgba(255,119,48,0.1),transparent_60%)]"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 items-center">
          
          {/* Left Side - Content */}
          <div className="text-center lg:text-left">
            <div className="max-w-2xl mx-auto lg:mx-0">
              {/* Brand Logo */}
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
                <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">T</span>
                </div>
                <span className="text-lg font-bold text-white">TEMBA</span>
              </div>

              {/* Main Headline */}
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 leading-tight">
                Téléchargez l'application
                <span className="block bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                  Temba
                </span>
              </h2>

              {/* Description */}
              <p className="text-sm sm:text-base text-slate-300 mb-3 leading-relaxed">
                Accédez à vos billets hors ligne, recevez des notifications pour vos événements favoris, et découvrez de nouveaux événements partout au Burkina Faso.
              </p>

              {/* Download Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 justify-center lg:justify-start mb-3">
                <button
                  onClick={handleAppStoreDownload}
                  className="group flex items-center justify-center gap-2 px-3 py-2 bg-black/80 backdrop-blur-sm text-white rounded-lg hover:bg-black hover:scale-105 transition-all duration-300 font-semibold shadow-xl border border-white/10 min-w-[140px]"
                >
                  <AppStoreIcon className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                  <div className="text-left">
                    <div className="text-xs text-gray-300 font-normal">Télécharger sur l'</div>
                    <div className="text-xs font-bold">App Store</div>
                  </div>
                </button>
                
                <button
                  onClick={handleGooglePlayDownload}
                  className="group flex items-center justify-center gap-2 px-3 py-2 bg-black/80 backdrop-blur-sm text-white rounded-lg hover:bg-black hover:scale-105 transition-all duration-300 font-semibold shadow-xl border border-white/10 min-w-[140px]"
                >
                  <GooglePlayIcon className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                  <div className="text-left">
                    <div className="text-xs text-gray-300 font-normal">Disponible sur</div>
                    <div className="text-xs font-bold">Google Play</div>
                  </div>
                </button>
              </div>

              {/* Web App Install Button */}
              {showInstallPrompt && (
                <div className="flex justify-center lg:justify-start mb-3">
                  <button
                    onClick={handleInstallWebApp}
                    className="group flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-sm text-gray-900 rounded-lg hover:bg-white hover:scale-105 transition-all duration-300 font-semibold shadow-xl border border-white/20"
                  >
                    <Globe className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                    <div className="text-left">
                      <div className="text-xs text-gray-600 font-normal">Installer l'</div>
                      <div className="text-xs font-bold">App Web</div>
                    </div>
                  </button>
                </div>
              )}

            </div>
          </div>

          {/* Right Side - App Screenshot */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              {/* Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-3xl blur-3xl scale-110"></div>
              
              {/* Phone Frame */}
              <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-1.5 shadow-2xl border border-gray-700">
                {/* Phone Screen */}
                <div className="relative w-40 h-[320px] sm:w-48 sm:h-[380px] bg-white rounded-xl overflow-hidden shadow-inner">
                  {/* Status Bar */}
                  <div className="flex justify-between items-center px-2 py-1 bg-white border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-900">9:41</span>
                    <div className="flex items-center gap-0.5">
                      <div className="flex gap-0.5">
                        <div className="w-0.5 h-0.5 bg-gray-900 rounded-full"></div>
                        <div className="w-0.5 h-0.5 bg-gray-900 rounded-full"></div>
                        <div className="w-0.5 h-0.5 bg-gray-900 rounded-full"></div>
                      </div>
                      <div className="w-4 h-2 border border-gray-900 rounded-sm">
                        <div className="w-3 h-1 bg-gray-900 rounded-sm m-0.5"></div>
                      </div>
                    </div>
                  </div>

                  {/* App Content - Using the actual Temba app screenshot */}
                  <div className="h-full bg-white">
                    <img 
                      src="/temba-app.png" 
                      alt="Temba App Screenshot" 
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>

                {/* Home Indicator */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-0.5 bg-white/80 rounded-full"></div>
              </div>

              {/* Enhanced Floating Elements */}
              <div className="absolute -top-3 -left-3 w-6 h-6 bg-gradient-to-r from-orange-400 to-red-400 rounded-full animate-bounce delay-300 opacity-90 shadow-xl shadow-orange-400/30"></div>
              <div className="absolute -bottom-3 -right-3 w-5 h-5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse delay-700 opacity-90 shadow-xl shadow-blue-400/30"></div>
              <div className="absolute top-1/4 -left-4 w-3 h-3 bg-gradient-to-r from-green-400 to-teal-400 rounded-full animate-ping delay-500 opacity-70 shadow-xl shadow-green-400/30"></div>
              <div className="absolute bottom-1/4 -right-4 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-bounce delay-1000 opacity-80 shadow-xl shadow-yellow-400/25"></div>
              <div className="absolute top-1/2 -top-6 w-2 h-2 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full animate-pulse delay-300 opacity-75 shadow-xl shadow-pink-400/30"></div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
} 