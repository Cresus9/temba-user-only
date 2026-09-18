import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import PageSEO from '../components/SEO/PageSEO';

const display = '"Plus Jakarta Sans", Inter, sans-serif';

function waMeNumber(): string {
  return String(import.meta.env.VITE_WHATSAPP_WA_ME_NUMBER || '').replace(/\D/g, '');
}

/**
 * Local / SPA fallback for tembas.com/w/:slug.
 * Production uses the Netlify edge 302 (wa-share) when WHATSAPP_WA_ME_NUMBER is set.
 */
export default function WhatsAppShare() {
  const { slug = '' } = useParams<{ slug: string }>();
  const digits = waMeNumber();
  const href = digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent(slug)}`
    : '';

  useEffect(() => {
    if (href) window.location.replace(href);
  }, [href]);

  return (
    <>
      <PageSEO
        title="Réserver sur WhatsApp | TEMBA"
        description="Ouvre WhatsApp pour acheter ton billet TEMBA."
        robots="noindex, nofollow"
      />
      <main className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="max-w-md w-full rounded-xl2 border border-line bg-paper p-8 text-center">
          <p className="eyebrow text-accent mb-3">TEMBA</p>
          <h1
            className="text-2xl font-semibold text-ink mb-3"
            style={{ fontFamily: display }}
          >
            Continuer sur WhatsApp
          </h1>
          {href ? (
            <p className="text-ink-mute text-[15px] mb-6">
              Redirection… Si rien ne s’ouvre, appuie ci-dessous.
            </p>
          ) : (
            <p className="text-ink-mute text-[15px] mb-6">
              Le numéro WhatsApp n’est pas encore configuré. Écris au{' '}
              <a className="text-brand font-medium" href="https://wa.me/22674750815">
                +226 74 75 08 15
              </a>
              .
            </p>
          )}
          {href ? (
            <a
              href={href}
              className="inline-flex h-12 items-center justify-center px-6 rounded-xl bg-brand text-white font-semibold"
            >
              Ouvrir WhatsApp
            </a>
          ) : null}
        </div>
      </main>
    </>
  );
}
