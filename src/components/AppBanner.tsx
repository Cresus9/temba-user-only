import React, { useState, useEffect } from 'react';
import { X, ArrowDownToLine, Smartphone } from 'lucide-react';

const display = '"Plus Jakarta Sans", Inter, sans-serif';
const mono    = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

export default function AppBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    setIsMobile(isMobileDevice);

    const dismissed    = localStorage.getItem('temba-app-banner-dismissed');
    const dismissedAt  = dismissed ? new Date(dismissed) : null;
    const stale        = !dismissedAt || (Date.now() - dismissedAt.getTime() > 3 * 24 * 60 * 60 * 1000);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isPWA        = (window.navigator as any).standalone === true;

    if (isMobileDevice && stale && !isStandalone && !isPWA) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('temba-app-banner-dismissed', new Date().toISOString());
  };

  const handleDownload = () => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    if (/android/i.test(ua)) {
      window.open('https://play.google.com/store/apps/details?id=app.rork.temba&pcampaignid=web_share', '_blank');
    } else if (/iPad|iPhone|iPod/.test(ua)) {
      window.open('https://apps.apple.com/us/app/temba/id6748848506', '_blank');
    } else {
      window.open('https://play.google.com/store/apps/details?id=app.rork.temba&pcampaignid=web_share', '_blank');
    }
    handleDismiss();
  };

  if (!isVisible || !isMobile) return null;

  return (
    <div
      className="w-full border-b border-line bg-paper shadow-sm animate-slide-down"
      role="banner"
      aria-label="Télécharger l'application Temba"
    >
      <div className="max-w-7xl mx-auto px-3 py-2.5 flex items-center gap-3">
        {/* Icon */}
        <div className="w-9 h-9 rounded-xl bg-brand/10 border border-brand/20 flex-shrink-0 grid place-items-center">
          <Smartphone className="w-4 h-4 text-brand" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[13px] font-bold text-ink leading-tight truncate"
            style={{ fontFamily: display }}
          >
            Téléchargez l&apos;app Temba
          </p>
          <p
            className="text-[11px] text-ink-mute truncate"
            style={{ fontFamily: mono }}
          >
            Meilleure expérience mobile
          </p>
        </div>

        {/* Download CTA */}
        <button
          onClick={handleDownload}
          className="flex-shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-brand text-paper text-[12px] font-bold hover:bg-brand/90 active:scale-[0.97] transition-all shadow-card"
          style={{ fontFamily: display }}
        >
          <ArrowDownToLine className="w-3.5 h-3.5" />
          <span>Télécharger</span>
        </button>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          aria-label="Fermer"
          className="flex-shrink-0 w-7 h-7 rounded-lg grid place-items-center text-ink-mute hover:text-ink hover:bg-cream transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

