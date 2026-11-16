import { QRCodeSVG } from 'qrcode.react';
import DomePattern from './DomePattern';
import StoreBadges from './StoreBadges';
import Logo from '../brand/Logo';

const STEPS = [
  'Choisissez votre sortie sur tembas.com ou dans l’appli.',
  'Payez en FCFA, par Mobile Money ou carte.',
  'Présentez le QR à l’entrée, même sans réseau.',
];

/** The v6 home app band. The mini ticket is an example, never a real order. */
export default function AppBand({
  exampleTitle = 'Alif Naaba',
  exampleWhen = 'Sam. 26 déc. · 20:00',
}: {
  exampleTitle?: string;
  exampleWhen?: string;
}) {
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
      <div className="relative flex flex-col items-center gap-4 md:flex-row md:items-end">
        <div className="w-[230px] overflow-hidden rounded-[14px] bg-white text-ink">
          <div className="relative bg-[#2F3095] p-3.5 text-white">
            <DomePattern variant="tile" />
            <div className="relative flex items-center justify-between">
              <Logo variant="light" size={14} />
              <span className="rounded border border-white/75 px-1.5 py-1 text-[10.5px] font-bold">STANDARD</span>
            </div>
            <p className="relative mt-3 font-display text-[17px] font-bold text-white">{exampleTitle}</p>
            <p className="relative mt-1 text-[12.5px] font-semibold text-white/85">{exampleWhen}</p>
          </div>
          <div className="flex items-center gap-3 border-t-2 border-dashed border-line p-3">
            <QRCodeSVG value="exemple" size={64} />
            <div>
              <p className="text-[13px] font-semibold">Votre nom</p>
              <p className="font-mono text-[11px] text-ink-3">EX-AN-0001</p>
              <p className="text-[11px] text-ink-4">(exemple)</p>
            </div>
          </div>
        </div>
        <div className="hidden w-[168px] rounded-[14px] bg-white p-3.5 text-center text-ink md:block">
          <QRCodeSVG value="https://temba.onelink.me/Xbe8" size={140} className="mx-auto" aria-label="QR de téléchargement" />
          <p className="mt-2 text-[12.5px] font-semibold">Scannez pour télécharger</p>
          <p className="text-[11.5px] text-ink-3">iPhone et Android</p>
        </div>
      </div>
    </div>
  );
}
