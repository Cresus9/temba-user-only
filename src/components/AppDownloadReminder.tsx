import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AppDownloadReminder() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if user is on mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      setIsMobile(isMobileDevice);
    };

    // Check if reminder was dismissed
    const checkDismissed = () => {
      const dismissed = localStorage.getItem('temba-app-reminder-dismissed');
      const dismissedDate = dismissed ? new Date(dismissed) : null;
      const now = new Date();
      
      // Show again after 7 days
      if (!dismissed || (dismissedDate && (now.getTime() - dismissedDate.getTime()) > 7 * 24 * 60 * 60 * 1000)) {
        return false;
      }
      return true;
    };

    checkMobile();
    
    // Only show reminder if:
    // 1. User is on mobile device
    // 2. Reminder hasn't been dismissed recently
    // 3. User is not in a standalone PWA (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isPWA = (window.navigator as any).standalone === true;
    
    if (isMobileDevice && !checkDismissed() && !isStandalone && !isPWA) {
      // Show after a short delay to not be intrusive
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('temba-app-reminder-dismissed', new Date().toISOString());
  };

  const handleDownloadAndroid = () => {
    window.open('https://play.google.com/store/apps/details?id=app.rork.temba&pcampaignid=web_share', '_blank');
    handleDismiss();
  };

  const handleDownloadiOS = () => {
    // Official Temba app on Apple App Store
    window.open('https://apps.apple.com/us/app/temba/id6748848506', '_blank');
    handleDismiss();
  };

  if (!isVisible || !isMobile) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 animate-fade-in" />
      
      {/* Modal */}
      <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-w-sm mx-auto">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white">
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Temba App</h3>
                <p className="text-sm text-indigo-100">Meilleure expérience mobile</p>
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-4">
            <p className="text-gray-600 text-sm mb-4">
              Téléchargez l'app Temba pour une expérience optimisée : billets hors ligne, notifications et plus encore !
            </p>
            
            {/* Download Buttons */}
            <div className="space-y-2">
              <button
                onClick={handleDownloadAndroid}
                className="w-full flex items-center gap-3 p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
              >
                <Download className="h-5 w-5" />
                <div className="text-left">
                  <div className="text-xs text-green-100">Télécharger sur</div>
                  <div className="text-sm font-semibold">Google Play</div>
                </div>
              </button>
              
              <button
                onClick={handleDownloadiOS}
                className="w-full flex items-center gap-3 p-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
              >
                <Download className="h-5 w-5" />
                <div className="text-left">
                  <div className="text-xs text-gray-300">Télécharger sur l'</div>
                  <div className="text-sm font-semibold">App Store</div>
                </div>
              </button>
            </div>
            
            {/* Continue Web Button */}
            <button
              onClick={handleDismiss}
              className="w-full mt-3 p-2 text-gray-500 text-sm hover:text-gray-700 transition-colors"
            >
              Continuer sur le web
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
