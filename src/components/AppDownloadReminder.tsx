import React, { useState, useEffect } from 'react';
import { X, Ticket, Bell, Zap } from 'lucide-react';
import Logo from './brand/Logo';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=app.rork.temba&pcampaignid=web_share';
const APP_STORE_URL  = 'https://apps.apple.com/us/app/temba/id6748848506';

const mono    = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const display = '"Plus Jakarta Sans", Inter, sans-serif';

const PERKS = [
  { Icon: Ticket, label: 'Billets toujours dans votre poche' },
  { Icon: Bell,   label: 'Notifications instantanées' },
  { Icon: Zap,    label: 'Paiement Mobile Money en 2 taps' },
];

function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent);
}
function isiOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export default function AppDownloadReminder() {
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    const mobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    setIsMobile(mobile);

    const dismissed   = localStorage.getItem('temba-app-reminder-dismissed');
    const dismissedAt = dismissed ? new Date(dismissed) : null;
    const stale       = !dismissedAt || Date.now() - dismissedAt.getTime() > 7 * 24 * 60 * 60 * 1000;

    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    const pwa        = (window.navigator as any).standalone === true;

    if (mobile && stale && !standalone && !pwa) {
      const t = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem('temba-app-reminder-dismissed', new Date().toISOString());
  };

  const handleDownload = (store: 'android' | 'ios') => {
    window.open(store === 'ios' ? APP_STORE_URL : PLAY_STORE_URL, '_blank');
    dismiss();
  };

  const smartDownload = () => {
    if (isiOS())     handleDownload('ios');
    else             handleDownload('android');
  };

  if (!visible || !isMobile) return null;

  const showBoth = !isAndroid() && !isiOS();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-50"
        onClick={dismiss}
        aria-hidden
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-4 sm:bottom-4 sm:left-auto sm:right-4 sm:px-0 sm:w-[340px]">
        <div className="bg-paper rounded-2xl border border-line shadow-pop overflow-hidden">

          {/* ── Hero strip */}
          <div className="relative bg-cream bg-grain border-b border-line px-4 pt-4 pb-5 overflow-hidden">
            {/* decorative blobs */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-brand-50 blur-2xl opacity-70"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute top-8 -left-8 w-28 h-28 rounded-full bg-accent/20 blur-2xl opacity-60"
            />

            {/* close */}
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 w-7 h-7 grid place-items-center rounded-full border border-line bg-paper/80 text-ink-mute hover:text-ink hover:bg-paper transition-colors"
              aria-label="Fermer"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* identity */}
            <div className="relative flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl2 bg-brand flex items-center justify-center shadow-card flex-shrink-0 overflow-hidden">
                <Logo size={28} variant="light" />
              </div>
              <div>
                <p
                  className="text-[17px] font-bold text-ink leading-tight"
                  style={{ fontFamily: display }}
                >
                  Temba App
                </p>
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand mt-0.5"
                  style={{ fontFamily: mono }}
                >
                  Expérience native
                </p>
              </div>
            </div>
          </div>

          {/* ── Perks */}
          <div className="px-4 py-4 space-y-3">
            {PERKS.map(({ Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand/15 grid place-items-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-brand" strokeWidth={2.2} />
                </div>
                <p className="text-[13px] text-ink leading-snug">{label}</p>
              </div>
            ))}
          </div>

          {/* ── Store buttons */}
          <div className="px-4 pb-4 space-y-2">
            {showBoth ? (
              <>
                <button
                  onClick={() => handleDownload('android')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-ink text-paper hover:bg-ink/85 active:scale-[0.98] transition-all"
                >
                  {/* Play Store icon */}
                  <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" fill="currentColor">
                    <path d="M3.18 23.76c.38.21.82.22 1.22.04l11.4-6.58-2.54-2.54-10.08 9.08zM.36 1.6A1.5 1.5 0 0 0 0 2.56v18.88a1.5 1.5 0 0 0 .36.96l.06.06 10.57-10.57v-.25L.42 1.54l-.06.06zM20.44 10.4l-2.9-1.67-2.84 2.84 2.84 2.83 2.92-1.68a1.5 1.5 0 0 0 0-2.32zM4.4.2 15.8 6.78l-2.54 2.54L3.18.24A1.5 1.5 0 0 1 4.4.2z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-[10px] text-paper/60 leading-none" style={{ fontFamily: mono }}>
                      Télécharger sur
                    </p>
                    <p className="text-[13px] font-bold leading-tight">Google Play</p>
                  </div>
                </button>

                <button
                  onClick={() => handleDownload('ios')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-line bg-cream hover:bg-cream-deep active:scale-[0.98] transition-all"
                >
                  {/* Apple icon */}
                  <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0 text-ink" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-[10px] text-ink-mute leading-none" style={{ fontFamily: mono }}>
                      Télécharger sur l'
                    </p>
                    <p className="text-[13px] font-bold text-ink leading-tight">App Store</p>
                  </div>
                </button>
              </>
            ) : (
              <button
                onClick={smartDownload}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl bg-brand text-paper text-[13px] font-bold hover:bg-brand/90 active:scale-[0.98] transition-all shadow-card"
              >
                {isiOS() ? (
                  <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="currentColor">
                    <path d="M3.18 23.76c.38.21.82.22 1.22.04l11.4-6.58-2.54-2.54-10.08 9.08zM.36 1.6A1.5 1.5 0 0 0 0 2.56v18.88a1.5 1.5 0 0 0 .36.96l.06.06 10.57-10.57v-.25L.42 1.54l-.06.06zM20.44 10.4l-2.9-1.67-2.84 2.84 2.84 2.83 2.92-1.68a1.5 1.5 0 0 0 0-2.32zM4.4.2 15.8 6.78l-2.54 2.54L3.18.24A1.5 1.5 0 0 1 4.4.2z" />
                  </svg>
                )}
                {isiOS() ? "Télécharger sur l'App Store" : 'Télécharger sur Google Play'}
              </button>
            )}

            {/* Dismiss */}
            <button
              onClick={dismiss}
              className="w-full py-2 text-[12px] font-medium text-ink-mute hover:text-ink transition-colors"
            >
              Continuer sur le web
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
