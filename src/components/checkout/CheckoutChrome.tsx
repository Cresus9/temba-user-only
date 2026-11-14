import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Lock } from '@phosphor-icons/react';
import Logo from '../brand/Logo';

const STEPS = ['Billets', 'Coordonnées', 'Paiement', 'Billets reçus'];

export default function CheckoutChrome({
  current = 2,
  title = 'Paiement',
  backTo,
}: {
  current?: number;
  title?: string;
  backTo?: string;
}) {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto hidden h-[72px] max-w-[1200px] items-center gap-6 px-6 md:flex xl:px-10">
        <Link to="/" aria-label="Temba"><Logo size={26} /></Link>
        <ol className="flex flex-1 items-center justify-center gap-3 text-[14px]">
          {STEPS.map((label, index) => {
            const done = index < current;
            const on = index === current;
            return (
              <li key={label} className="flex items-center gap-3">
                <span className={`grid h-6 w-6 place-items-center rounded-full text-[12px] font-bold ${done || on ? 'bg-brand text-white' : 'border border-line text-ink-3'}`}>
                  {done ? <Check size={13} weight="bold" /> : index + 1}
                </span>
                <span className={on ? 'font-semibold text-ink' : 'text-ink-3'}>{label}</span>
                {index < STEPS.length - 1 && <span className="h-px w-8 bg-line" />}
              </li>
            );
          })}
        </ol>
        <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#0B7A52]">
          <Lock size={16} weight="bold" /> Paiement sécurisé
        </span>
      </div>
      <div className="px-3 py-2 md:hidden">
        <div className="flex items-center justify-between">
          {backTo ? (
            <Link to={backTo} aria-label="Retour" className="grid h-11 w-11 place-items-center"><ArrowLeft size={22} /></Link>
          ) : <span className="w-11" />}
          <p className="font-display text-[16px] font-bold">{title}</p>
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#0B7A52]"><Lock size={14} /> Sécurisé</span>
        </div>
        <p className="mt-1 text-center text-[12px] text-ink-3">Étape {Math.min(current + 1, 4)} sur 4</p>
        <div className="mt-2 grid grid-cols-4 gap-1 px-2">
          {STEPS.map((label, index) => (
            <span key={label} className={`h-1 rounded-full ${index <= current ? 'bg-brand' : 'bg-line'}`} />
          ))}
        </div>
      </div>
    </header>
  );
}
