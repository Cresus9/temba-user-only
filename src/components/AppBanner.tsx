import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AppBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if user is on mobile device
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    setIsMobile(isMobileDevice);

    // Check if banner was dismissed
    const dismissed = localStorage.getItem('temba-app-banner-dismissed');
    const dismissedDate = dismissed ? new Date(dismissed) : null;
    const now = new Date();
    
    // Show again after 3 days for banner (less intrusive)
    const shouldShow = !dismissed || (dismissedDate && (now.getTime() - dismissedDate.getTime()) > 3 * 24 * 60 * 60 * 1000);
    
    // Only show if user is on mobile and hasn't dismissed recently
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isPWA = (window.navigator as any).standalone === true;
    
    if (isMobileDevice && shouldShow && !isStandalone && !isPWA) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('temba-app-banner-dismissed', new Date().toISOString());
  };

  const handleDownload = () => {
    // Detect platform and redirect accordingly
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    
    if (/android/i.test(userAgent)) {
      window.open('https://play.google.com/store/apps/details?id=app.rork.temba&pcampaignid=web_share', '_blank');
    } else if (/iPad|iPhone|iPod/.test(userAgent)) {
      // Official Temba app on Apple App Store
      window.open('https://apps.apple.com/us/app/temba/id6748848506', '_blank');
    } else {
      // Default to Google Play
      window.open('https://play.google.com/store/apps/details?id=app.rork.temba&pcampaignid=web_share', '_blank');
    }
    
    handleDismiss();
  };

  if (!isVisible || !isMobile) {
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg animate-slide-down">
      <div className="flex items-center justify-between p-3 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-1.5 bg-white/20 rounded-full">
            <Smartphone className="h-4 w-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              Téléchargez l'app Temba
            </p>
            <p className="text-xs text-indigo-100 truncate">
              Meilleure expérience mobile
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-3">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors text-sm font-medium"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Télécharger</span>
          </button>
          
          <button
            onClick={handleDismiss}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
