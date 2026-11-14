import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  GearSix,
  Gift,
  House,
  MagnifyingGlass,
  PaperPlaneTilt,
  Receipt,
  SignOut,
  SquaresFour,
  Ticket,
  Trash,
  TrayArrowDown,
  UserCircle,
  Wallet,
} from '@phosphor-icons/react';

export interface AccountNavCounts {
  tickets?: number;
  orders?: number;
  received?: number;
  sent?: number;
}

const NAV = [
  { title: null, items: [
    { id: 'dashboard', label: 'Tableau de bord', to: '/dashboard', icon: SquaresFour },
    { id: 'profil', label: 'Informations du profil', to: '/profile', icon: UserCircle },
  ]},
  { title: 'Billets', items: [
    { id: 'billets', label: 'Mes billets', to: '/profile/my-tickets', icon: Ticket, count: 'tickets' as const },
    { id: 'reservations', label: 'Historique des réservations', to: '/profile/bookings', icon: Receipt, count: 'orders' as const },
  ]},
  { title: 'Transferts', items: [
    { id: 'recus', label: 'Billets reçus', to: '/profile/transfers', icon: TrayArrowDown, count: 'received' as const },
    { id: 'envoyes', label: 'Billets envoyés', to: '/profile/sent', icon: PaperPlaneTilt, count: 'sent' as const },
  ]},
  { title: 'Compte', items: [
    { id: 'notifications', label: 'Notifications', to: '/profile/notifications', icon: Bell },
    { id: 'paiements', label: 'Méthodes de paiement', to: '/profile/payments', icon: Wallet },
    { id: 'parrainage', label: 'Référer et gagner', to: '/profile/referral', icon: Gift },
    { id: 'parametres', label: 'Paramètres', to: '/profile/settings', icon: GearSix },
  ]},
];

export default function AccountShell({
  name,
  phone,
  active,
  counts,
  onLogout,
  children,
}: {
  name: string;
  phone?: string | null;
  active: string;
  counts?: AccountNavCounts;
  onLogout?: () => void;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const initial = (name || 'T').trim().charAt(0).toUpperCase();

  const links = NAV.flatMap((group) => group.items);

  return (
    <div className="bg-white">
      <div className="mx-auto flex max-w-[1200px] gap-10 px-4 py-8 lg:px-8 lg:py-10">
        <aside className="sticky top-24 hidden w-[260px] shrink-0 lg:block">
          <div className="mb-4 flex items-center gap-3 px-2">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-brand font-display text-[16px] font-bold text-white">{initial}</span>
            <div className="min-w-0">
              <p className="truncate font-display text-[15px] font-bold">{name}</p>
              {phone ? <p className="truncate font-mono text-[12.5px] text-ink-3">{phone}</p> : null}
            </div>
          </div>
          {NAV.map((group) => (
            <div key={group.title ?? 'root'}>
              {group.title ? <p className="px-3 pb-1 pt-4 text-[12.5px] text-ink-4">{group.title}</p> : null}
              {group.items.map((item) => {
                const on = item.id === active;
                const n = item.count ? counts?.[item.count] : undefined;
                return (
                  <Link key={item.id} to={item.to} className={`flex h-10 items-center gap-3 rounded-lg px-3 text-[14.5px] ${on ? 'bg-brand-50 font-semibold text-brand' : 'text-ink-2 hover:bg-surf'}`}>
                    <item.icon size={19} weight={on ? 'fill' : 'regular'} />
                    <span className="truncate">{item.label}</span>
                    {n != null ? <span className={`ml-auto rounded-full px-2 text-[12px] font-semibold ${on ? 'bg-white text-brand' : 'bg-surf text-ink-3'}`}>{n}</span> : null}
                  </Link>
                );
              })}
            </div>
          ))}
          <div className="my-3 h-px bg-line" />
          <Link to="/account-deletion" className={`flex h-10 items-center gap-3 rounded-lg px-3 text-[14.5px] ${active === 'supprimer' ? 'bg-[#FCEBEA] font-semibold text-[#C42B25]' : 'text-ink-3 hover:bg-surf'}`}>
            <Trash size={19} /> Supprimer mon compte
          </Link>
          <button type="button" onClick={onLogout || (() => navigate('/login'))} className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[14.5px] text-ink-2 hover:bg-surf">
            <SignOut size={19} /> Déconnexion
          </button>
        </aside>

        <div className="min-w-0 flex-1 pb-24 lg:pb-0">
          <div className="mb-5 flex gap-2 overflow-x-auto lg:hidden">
            {links.map((item) => (
              <Link key={item.id} to={item.to} className={`h-9 shrink-0 rounded-full px-3 text-[13px] font-semibold leading-9 ${item.id === active ? 'bg-ink text-white' : 'bg-surf text-ink-2'}`}>
                {item.label}
              </Link>
            ))}
          </div>
          {children}
        </div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[72px] grid-cols-4 border-t border-line bg-white pb-2 lg:hidden" aria-label="Navigation">
        {[
          { to: '/', label: 'Accueil', icon: House, on: false },
          { to: '/events', label: 'Explorer', icon: MagnifyingGlass, on: false },
          { to: '/profile/my-tickets', label: 'Billets', icon: Ticket, on: active === 'billets' },
          { to: '/dashboard', label: 'Compte', icon: UserCircle, on: active !== 'billets' },
        ].map((item) => (
          <Link key={item.label} to={item.to} className={`flex flex-col items-center justify-center gap-0.5 text-[11.5px] ${item.on ? 'font-semibold text-brand' : 'text-ink-3'}`}>
            <item.icon size={22} weight={item.on ? 'fill' : 'regular'} />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
