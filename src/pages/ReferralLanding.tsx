import React, { useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Gift, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { referralService } from '../services/referralService';
import { setPendingReferralCode } from '../utils/referralStorage';
import { codeFromLocation } from '../config/appLinks';
import OpenInAppBanner from '../components/events/OpenInAppBanner';
import PageSEO from '../components/SEO/PageSEO';
import toast from 'react-hot-toast';

export default function ReferralLanding() {
  const { code: rawCode } = useParams<{ code: string }>();
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [tracking, setTracking] = React.useState(false);

  const code = useMemo(
    () => codeFromLocation(location.pathname, location.search) ?? codeFromLocation(`/ref/${rawCode ?? ''}`, ''),
    [location.pathname, location.search, rawCode],
  );

  const pageTitle = code ? `Invitation TEMBA — code ${code}` : 'Invitation TEMBA';
  const pageDescription =
    'Rejoignez TEMBA avec une invitation : créez un compte et profitez des avantages parrainage sur vos billets.';

  useEffect(() => {
    if (!code) return;

    setPendingReferralCode(code);

    if (loading) return;

    if (!isAuthenticated) return;

    let cancelled = false;
    (async () => {
      setTracking(true);
      const result = await referralService.trackReferral(code);
      if (cancelled) return;
      if (result.ok) {
        toast.success('Invitation enregistrée. Elle reste active pour votre prochain achat.');
      } else if (result.message && !result.message.includes('no session') && !result.message.toLowerCase().includes('disabled')) {
        toast(result.message, { icon: 'ℹ️' });
      }
      setTracking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [code, isAuthenticated, loading]);

  const structuredData = useMemo(
    () =>
      code
        ? [
            {
              '@context': 'https://schema.org',
              '@type': 'WebPage',
              name: pageTitle,
              description: pageDescription,
              url: `https://tembas.com/ref/${code}`,
            },
          ]
        : undefined,
    [code, pageTitle, pageDescription]
  );

  if (!code) {
    return (
      <>
        <PageSEO title="Invitation invalide | TEMBA" description={pageDescription} canonicalUrl="https://tembas.com/" />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <p className="text-gray-600 mb-6">Ce lien d&apos;invitation est invalide.</p>
          <Link to="/" className="text-indigo-600 font-medium">
            Retour à l&apos;accueil
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageSEO
        title={pageTitle}
        description={pageDescription}
        canonicalUrl={`https://tembas.com/ref/${code}`}
        ogImage="https://tembas.com/temba-app.png"
        keywords={['TEMBA', 'parrainage', 'billets', 'Burkina Faso', code]}
        structuredData={structuredData}
      />
      <OpenInAppBanner hint="Votre code vous suit dans l'application." />
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 mb-6">
          <Gift className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Vous êtes invité sur TEMBA</h1>
        <p className="text-gray-600 mb-2">
          Code d&apos;invitation : <span className="font-mono font-semibold text-indigo-700">{code}</span>
        </p>
        <p className="text-sm text-gray-500 mb-8">
          {isAuthenticated
            ? tracking
              ? 'Enregistrement de votre invitation…'
              : 'Vous pouvez explorer les événements ou ouvrir votre profil.'
            : 'Créez un compte ou connectez-vous pour activer votre invitation.'}
        </p>

        {tracking && (
          <div className="flex justify-center mb-6">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        )}

        {!isAuthenticated && !loading && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to={`/signup?r=${encodeURIComponent(code)}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-white font-medium hover:bg-indigo-700"
            >
              Créer un compte
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to={`/login?r=${encodeURIComponent(code)}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-6 py-3 text-gray-800 font-medium hover:bg-gray-50"
            >
              J&apos;ai déjà un compte
            </Link>
          </div>
        )}

        {isAuthenticated && !tracking && (
          <button
            type="button"
            onClick={() => navigate('/events')}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-white font-medium hover:bg-indigo-700"
          >
            Voir les événements
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </>
  );
}
