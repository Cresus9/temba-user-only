import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';

const AppStoreIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

const GooglePlayIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
  </svg>
);

// Hand-drawn arrow squiggle — gives the section its "scribbled note" feel
const DoodleArrow = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 64 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12 C 12 12, 18 4, 28 8 S 44 18, 56 12" />
    <path d="M48 6 L 56 12 L 50 18" />
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
    window.open(
      'https://play.google.com/store/apps/details?id=app.rork.temba&pcampaignid=web_share',
      '_blank'
    );
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

  const year = new Date().getFullYear();

  return (
    <section className="section-compact surface-cream">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        {/* — — — TICKET — — — */}
        <article className="relative bg-ink text-paper rounded-[20px] overflow-hidden shadow-pop">
          {/* Subtle paper grain */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.05] mix-blend-screen pointer-events-none"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0'/></filter><rect width='160' height='160' filter='url(%23n)' opacity='0.55'/></svg>\")",
            }}
          />

          {/* Top rail — looks like a ticket header */}
          <div className="relative border-b border-paper/10 px-5 md:px-10 py-2.5 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-paper/55">
            <span className="flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
              TEMBA / APP — BFA &nbsp;→&nbsp; AFRIQUE DE L'OUEST
            </span>
            <span className="hidden sm:block">REF · BFA—{year}</span>
          </div>

          <div className="relative grid lg:grid-cols-12 items-stretch">
            {/* Giant ghost mark anchored bottom-left — adds depth without noise */}
            <svg
              aria-hidden
              viewBox="0 0 64 64"
              className="absolute -bottom-10 -left-12 w-[260px] h-[260px] text-paper opacity-[0.04] pointer-events-none"
              fill="none"
            >
              <rect x="3" y="3" width="58" height="58" rx="1" stroke="currentColor" strokeWidth="2" />
              <rect x="14" y="14" width="36" height="36" fill="currentColor" />
              <rect x="18" y="20" width="28" height="5" fill="#0E1020" />
              <rect x="29" y="20" width="6" height="22" fill="#0E1020" />
            </svg>

            {/* — Main ticket area — */}
            <div className="lg:col-span-8 relative px-5 md:px-10 py-7 md:py-10 lg:py-12">
              {/* Editorial title — broken, weighted, with accent underline */}
              <h2
                className="text-paper tracking-tight !text-[clamp(24px,4.2vw,42px)] !leading-[1.05] mb-3"
                style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
              >
                Vos prochaines soirées.
                <br />
                <span className="relative inline-block">
                  <span className="relative z-10 italic font-bold">Déjà dans votre poche.</span>
                  <span aria-hidden className="absolute left-0 right-1 bottom-0.5 h-2 bg-accent/45 -z-0 rounded-sm" />
                </span>
              </h2>

              <p className="text-[14px] md:text-[15px] text-paper/65 max-w-md mb-6 leading-relaxed">
                iOS, Android, Web. Achetez en FCFA, transférez en un clic et
                présentez vos billets à l&apos;entrée. Connexion requise pour la
                validation et les paiements.
              </p>

              {/* Store buttons */}
              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={handleAppStoreDownload}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 bg-paper text-ink rounded-lg hover:bg-paper/90 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <AppStoreIcon className="h-5 w-5" />
                  <div className="text-left leading-tight">
                    <div className="text-[9px] text-ink-mute uppercase tracking-wider">Télécharger sur</div>
                    <div className="text-[13px] font-bold">App Store</div>
                  </div>
                </button>

                <button
                  onClick={handleGooglePlayDownload}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 bg-paper text-ink rounded-lg hover:bg-paper/90 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <GooglePlayIcon className="h-5 w-5" />
                  <div className="text-left leading-tight">
                    <div className="text-[9px] text-ink-mute uppercase tracking-wider">Disponible sur</div>
                    <div className="text-[13px] font-bold">Google Play</div>
                  </div>
                </button>

                {showInstallPrompt && (
                  <button
                    onClick={handleInstallWebApp}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 bg-transparent text-paper border border-paper/25 rounded-lg hover:border-paper/45 transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <Globe className="h-5 w-5 text-accent" />
                    <div className="text-left leading-tight">
                      <div className="text-[9px] text-paper/55 uppercase tracking-wider">Installer</div>
                      <div className="text-[13px] font-bold">App Web</div>
                    </div>
                  </button>
                )}
              </div>

              {/* Hand-drawn annotation pointing to the phone (only on lg+) */}
              <div className="hidden lg:flex items-center gap-2 mt-7 text-[12px] text-paper/50">
                <span
                  className="italic"
                  style={{ fontFamily: '"Plus Jakarta Sans", serif' }}
                >
                  testez l'app, ça prend 30 secondes
                </span>
                <DoodleArrow className="h-5 w-12 text-accent" />
              </div>
            </div>

            {/* Perforation — vertical row of dots between ticket & stub */}
            <div
              aria-hidden
              className="hidden lg:flex absolute top-0 bottom-0 left-[66.666%] -translate-x-1/2 flex-col items-center justify-around py-3 z-[1]"
            >
              {Array.from({ length: 22 }).map((_, i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-paper/20" />
              ))}
            </div>
            {/* Round notches at perforation top + bottom */}
            <span aria-hidden className="hidden lg:block absolute top-0 left-[66.666%] -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-cream" />
            <span aria-hidden className="hidden lg:block absolute bottom-0 left-[66.666%] -translate-x-1/2 translate-y-1/2 w-5 h-5 rounded-full bg-cream" />

            {/* — Stub area — */}
            <div className="lg:col-span-4 relative px-5 md:px-7 py-5 md:py-8 lg:py-10 flex flex-col items-center justify-center bg-ink-900/40">
              {/* Pinned promotional card — slightly rotated, like it's resting on the ticket */}
              <div className="relative w-full max-w-[180px] sm:max-w-[200px] md:max-w-[220px] lg:max-w-[260px]">
                {/* Tape effect — top-left corner */}
                <span
                  aria-hidden
                  className="absolute -top-1.5 left-4 z-20 w-9 h-3 bg-accent/30 backdrop-blur-sm border border-accent/40 rounded-sm"
                  style={{ transform: 'rotate(-8deg)' }}
                />

                <div
                  className="relative rounded-xl overflow-hidden shadow-2xl ring-1 ring-paper/10 bg-paper"
                  style={{ transform: 'rotate(-2.5deg)' }}
                >
                  <img
                    src="/temba-promo-card.png"
                    alt="Application Temba — Vos billets d'événements à Ouagadougou"
                    className="block w-full h-auto"
                    loading="lazy"
                  />

                  {/* Hand-stamped 4.8 seal — pinned on the card */}
                  <div
                    className="absolute top-2 right-2 px-1.5 py-0.5 border-[1.5px] border-accent text-accent rounded text-[8px] md:text-[9px] font-bold uppercase tracking-[0.16em] bg-ink-900/85 backdrop-blur-sm whitespace-nowrap shadow-md"
                    style={{ transform: 'rotate(8deg)', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                  >
                    ★ 4.8 · VÉRIFIÉ
                  </div>
                </div>
              </div>

              {/* Stub caption — counter (hidden on smallest screens to save space) */}
              <div className="mt-4 lg:mt-6 text-center">
                <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-paper/40 mb-0.5">
                  Téléchargements
                </div>
                <div
                  className="text-[16px] lg:text-[18px] font-bold text-paper"
                  style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                >
                  10&nbsp;482+
                </div>
              </div>
            </div>
          </div>

          {/* Bottom rail */}
          <div className="relative border-t border-paper/10 px-5 md:px-10 py-2.5 flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.24em] text-paper/35">
            <span>—— TEMBAS.COM ——</span>
            <span className="hidden sm:block">VALID · {year}</span>
          </div>
        </article>
      </div>
    </section>
  );
}
