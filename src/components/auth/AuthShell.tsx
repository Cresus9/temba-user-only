import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DomePattern from '../design/DomePattern';
import Logo from '../brand/Logo';

export type AuthIllustration = 'party' | 'living-room' | 'party-2';

interface AuthShellProps {
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  backTo?: string;
  backLabel?: string;
  illustration?: AuthIllustration;
  posterEyebrow?: string;
  posterHeadline?: string;
  posterSub?: string;
  posterTagline?: string;
}

const displayFamily = '"Inter Tight", Inter, sans-serif';

export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  backTo,
  backLabel,
  posterHeadline = 'Une billetterie née à Ouagadougou.',
  posterSub = 'Vos billets, vos commandes et vos transferts, au même endroit sur le site et dans l’app.',
}: AuthShellProps) {
  return (
    <div className="bg-white">
      <div className="mx-auto grid max-w-7xl items-start gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(420px,560px)] lg:gap-12 lg:px-8 lg:py-10">
        <div>
          {backTo && (
            <Link
              to={backTo}
              className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-3 hover:text-brand"
            >
              <ArrowLeft className="h-4 w-4" />
              {backLabel || 'Retour'}
            </Link>
          )}

          <div className="max-w-md">
            {eyebrow && <p className="mb-2 text-[13px] font-semibold text-brand">{eyebrow}</p>}
            <h1
              className="text-[28px] font-bold leading-[1.1] tracking-tight text-ink sm:text-[34px]"
              style={{ fontFamily: displayFamily }}
            >
              {title}
            </h1>
            {subtitle && <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{subtitle}</p>}
          </div>

          <div className="mt-7 max-w-md">{children}</div>
        </div>

        <aside className="relative hidden min-h-[560px] overflow-hidden rounded-2xl bg-brand text-white lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100vh-7.5rem)] lg:flex-col lg:justify-between">
          <DomePattern variant="dome" className="opacity-90" />
          <div className="relative px-10 pt-10">
            <Logo variant="light" size={26} />
          </div>
          <div className="relative px-10 pb-4">
            <h2 className="max-w-[420px] font-display text-[36px] font-bold leading-[1.08] tracking-[-0.03em]">
              {posterHeadline}
            </h2>
            {posterSub && <p className="mt-3 max-w-[400px] text-[16px] leading-relaxed text-white/85">{posterSub}</p>}
          </div>
          <div className="relative flex gap-8 border-t border-white/20 px-10 py-6">
            <div>
              <b className="block font-display text-[26px] font-bold">15 000+</b>
              <span className="text-[14px] text-white/80">utilisateurs</span>
            </div>
            <div>
              <b className="block font-display text-[26px] font-bold">FCFA</b>
              <span className="text-[14px] text-white/80">Orange Money, Moov, carte</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
