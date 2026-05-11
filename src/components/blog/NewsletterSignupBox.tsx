import React, { useState } from 'react';
import { Mail, Check, ArrowRight, Sparkles } from 'lucide-react';
import { newsletterService } from '../../services/newsletterService';
import toast from 'react-hot-toast';

interface NewsletterSignupBoxProps {
  /**
   * `compact`  = sidebar-friendly (default)
   * `featured` = inline mid-article callout (more bold)
   */
  variant?: 'compact' | 'featured';
}

const monoFamily =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const displayFamily = '"Plus Jakarta Sans", Inter, sans-serif';

export default function NewsletterSignupBox({
  variant = 'compact',
}: NewsletterSignupBoxProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.trim()) {
      toast.error('Veuillez entrer une adresse email');
      return;
    }

    try {
      setLoading(true);
      await newsletterService.subscribe(email.trim());
      setSubscribed(true);
      setEmail('');
      toast.success('Abonnement réussi ! Vérifiez votre email pour confirmer.');
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'abonnement");
    } finally {
      setLoading(false);
    }
  };

  /* ── Success state ── */
  if (subscribed) {
    return (
      <div
        className={`bg-paper rounded-xl2 border border-line shadow-card p-5 text-center ${
          variant === 'featured' ? 'md:p-7' : ''
        }`}
      >
        <div className="w-11 h-11 mx-auto mb-3 rounded-full bg-brand-50 grid place-items-center ring-1 ring-brand-100">
          <Check className="h-5 w-5 text-brand" strokeWidth={2.5} />
        </div>
        <p
          className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand mb-1"
          style={{ fontFamily: monoFamily }}
        >
          Bienvenue
        </p>
        <h3
          className="text-[16px] font-bold text-ink mb-1.5 tracking-tight"
          style={{ fontFamily: displayFamily }}
        >
          C'est noté !
        </h3>
        <p className="text-[13px] text-ink-mute leading-relaxed">
          Confirmez votre email et vous recevrez le prochain numéro.
        </p>
      </div>
    );
  }

  /* ── Featured (inline mid-article) ── */
  if (variant === 'featured') {
    return (
      <div className="relative bg-ink text-paper rounded-[20px] overflow-hidden shadow-pop">
        {/* Brand glows */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-16 w-[320px] h-[320px] rounded-full bg-brand/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-12 w-[260px] h-[260px] rounded-full bg-accent/25 blur-3xl"
        />

        <div className="relative p-6 md:p-9">
          <p
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-paper/10 ring-1 ring-paper/15 text-[10px] font-bold uppercase tracking-[0.22em] text-paper/85 mb-4"
            style={{ fontFamily: monoFamily }}
          >
            <Sparkles className="h-3 w-3 text-accent" strokeWidth={2.5} />
            Newsletter Temba
          </p>

          <h3
            className="text-[24px] md:text-[30px] font-bold leading-[1.1] tracking-tight mb-2.5"
            style={{ fontFamily: displayFamily }}
          >
            Les meilleures soirées,
            <br />
            <span className="relative inline-block">
              <span className="relative z-10">avant tout le monde.</span>
              <span
                aria-hidden
                className="absolute left-0 right-0 bottom-1 h-2 md:h-2.5 bg-accent/45 rounded-sm -z-0"
              />
            </span>
          </h3>
          <p className="text-[14px] md:text-[15px] text-paper/75 leading-relaxed max-w-md mb-5">
            Un email par semaine, signé par notre équipe. Concerts, festivals,
            soirées — et un guide à ne pas manquer.
          </p>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-2 max-w-lg"
          >
            <div className="relative flex-1">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-paper/55" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@email.com"
                className="w-full h-11 pl-10 pr-3 bg-paper/10 border border-paper/15 text-paper placeholder:text-paper/45 rounded-lg focus:outline-none focus:border-paper/40 focus:bg-paper/15 transition-colors"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-lg bg-paper text-ink text-[13px] font-bold hover:bg-cream active:bg-cream-deep disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                'Inscription…'
              ) : (
                <>
                  S'abonner
                  <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          <p
            className="text-[11px] text-paper/45 mt-3"
            style={{ fontFamily: monoFamily }}
          >
            Désabonnement en un clic · Pas de spam
          </p>
        </div>
      </div>
    );
  }

  /* ── Compact (sidebar) ── */
  return (
    <div className="bg-paper rounded-xl2 border border-line shadow-card p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-lg bg-brand-50 ring-1 ring-brand-100 grid place-items-center flex-shrink-0">
          <Mail className="h-4 w-4 text-brand" strokeWidth={2.2} />
        </div>
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand"
            style={{ fontFamily: monoFamily }}
          >
            Newsletter
          </p>
          <h3
            className="text-[14px] font-bold text-ink leading-tight tracking-tight"
            style={{ fontFamily: displayFamily }}
          >
            Restez à l'affût
          </h3>
        </div>
      </div>

      <p className="text-[13px] text-ink-mute leading-relaxed mb-3">
        Recevez les nouveaux articles et les soirées à ne pas manquer, chaque
        semaine.
      </p>

      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@email.com"
          className="w-full h-10 px-3 bg-paper border border-line text-[13px] text-ink placeholder:text-ink-mute rounded-lg focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-50 transition-colors"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-1.5 h-10 px-3 bg-brand text-paper text-[13px] font-bold rounded-lg hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            'Inscription…'
          ) : (
            <>
              S'abonner
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </>
          )}
        </button>
      </form>

      <p
        className="text-[10px] text-ink-mute mt-3 leading-relaxed"
        style={{ fontFamily: monoFamily }}
      >
        Désabonnement en un clic · Pas de spam
      </p>
    </div>
  );
}
