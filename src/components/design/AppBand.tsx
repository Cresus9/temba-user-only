import { QRCodeSVG } from 'qrcode.react';
import DomePattern from './DomePattern';
import StoreBadges from './StoreBadges';
import { ONELINK_BASE } from '../../config/appLinks';

const STEPS = [
  'Choisissez votre sortie sur tembas.com ou dans l’appli.',
  'Payez en FCFA, par Mobile Money ou carte.',
  'Présentez le QR à l’entrée, même sans réseau.',
];

/** The v6 home app band. Store badges and a download QR; no sample ticket. */
export default function AppBand() {
  return (
    <div className="relative grid items-center gap-8 overflow-hidden rounded-[20px] bg-brand px-6 py-8 text-white md:grid-cols-[minmax(0,1fr)_auto] md:px-14 md:py-12">
      <DomePattern variant="dome" className="object-right-bottom opacity-90" />
      <div className="relative">
        <p className="text-[13.5px] font-semibold text-white/75">L’application Temba</p>
        <h2 className="mt-3 font-display text-[28px] font-bold leading-[1.04] tracking-[-0.035em] !text-white md:text-[44px]">
          Vos billets,<br />même sans réseau.
        </h2>
        <ol className="mt-5 space-y-3 text-[15px]">
          {STEPS.map((step, index) => (
            <li key={step} className="flex items-center gap-3">
              <b className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-white font-display text-[14px] text-brand">{index + 1}</b>
              {step}
            </li>
          ))}
        </ol>
        <div className="mt-6"><StoreBadges /></div>
      </div>
      <div className="relative hidden w-[168px] rounded-[14px] bg-white p-3.5 text-center text-ink md:block">
        <QRCodeSVG value={ONELINK_BASE} size={140} className="mx-auto" aria-label="QR de téléchargement" />
        <p className="mt-2 text-[12.5px] font-semibold">Scannez pour télécharger</p>
        <p className="text-[11.5px] text-ink-3">iPhone et Android</p>
      </div>
    </div>
  );
}
