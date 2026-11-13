import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowRight, ArrowsLeftRight, CalendarPlus, Clock, MagnifyingGlass, NavigationArrow, QrCode, WhatsappLogo } from '@phosphor-icons/react';
import AccountShell from '../../components/account/AccountShell';
import PosterTile from '../../components/account/PosterTile';
import { calendarDayInZone, formatCalendarDate, formatCurrency } from '../../utils/formatters';
import { mapsSearchUrl, shortPlace } from '../../utils/eventGeo';
import { eventPublicPath } from '../../utils/eventPath';

export interface DashPass {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  city: string;
  image: string;
  category: string;
  qr: string;
  holder: string;
  example?: boolean;
}

export interface DashOrder {
  id: string;
  eventName: string;
  total: number;
  status: string;
  date: string;
  location: string;
  currency: string;
  image?: string;
}

export interface DashNext {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  city: string;
  image_url: string;
  slug: string;
  ticketCount: number;
  categories: string[];
}

export interface DashShowcase {
  id: string;
  title: string;
  date: string;
  city?: string;
  image_url?: string;
  price?: number;
  currency?: string;
  slug?: string | null;
}

export interface DashReceived {
  id: string;
  title: string;
  from: string;
  when: string;
  status: string;
  image?: string;
}

function dayParts(iso: string) {
  const datePart = String(iso || '').split('T')[0];
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return { day: '—', month: '', weekday: '' };
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return {
    day: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', timeZone: 'Africa/Ouagadougou' }).format(dt),
    month: new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric', timeZone: 'Africa/Ouagadougou' }).format(dt),
    weekday: new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'Africa/Ouagadougou' }).format(dt),
  };
}

function daysUntil(iso: string) {
  const today = calendarDayInZone();
  const target = String(iso || '').split('T')[0];
  const a = Date.parse(`${today}T12:00:00Z`);
  const b = Date.parse(`${target}T12:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}

function countdownLabel(days: number | null) {
  if (days == null) return '';
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return 'Demain';
  return `Dans ${days} jours`;
}

function calendarHref(title: string, date: string, place: string) {
  const start = String(date || '').split('T')[0].replace(/-/g, '');
  if (start.length !== 8) return '/events';
  const y = Number(start.slice(0, 4));
  const m = Number(start.slice(4, 6));
  const d = Number(start.slice(6, 8));
  const endDate = new Date(Date.UTC(y, m - 1, d + 1));
  const end = endDate.toISOString().slice(0, 10).replace(/-/g, '');
  const params = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${start}/${end}`, location: place });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function orderStatus(status: string) {
  if (status === 'COMPLETED') return { label: 'Payée', className: 'bg-[#E6F4EE] text-[#0B7A52]' };
  if (status === 'AWAITING_PAYMENT') return { label: 'En attente', className: 'bg-[#FFF5E0] text-[#8A5A00]' };
  if (status === 'CANCELLED') return { label: 'Annulée', className: 'bg-[#FCEBEA] text-[#C42B25]' };
  if (status === 'FREE' || status === 'CONFIRMED') return { label: 'Confirmée', className: 'bg-[#E6F4EE] text-[#0B7A52]' };
  return { label: status || 'Commande', className: 'bg-surf text-ink-2' };
}

function MiniPass({ pass }: { pass: DashPass }) {
  const vip = /vip/i.test(pass.category);
  const when = formatCalendarDate(pass.date, { day: 'numeric', month: 'short' });
  const hour = pass.time ? pass.time.slice(0, 5) : '';
  return (
    <article className="w-[210px] shrink-0 overflow-hidden rounded-[14px] border border-line bg-white">
      <div className="relative h-[132px] bg-brand p-3 text-white">
        <div className="flex items-center justify-between">
          <span className="font-display text-[13px] font-bold">Temba</span>
          <span className={vip ? 'font-display text-[16px] font-extrabold text-[#F6B84A]' : 'rounded border border-white/75 px-1.5 py-1 text-[10px] font-bold tracking-wide'}>
            {vip ? pass.category : pass.category.toUpperCase()}
          </span>
        </div>
        <p className="mt-3 line-clamp-2 font-display text-[15px] font-bold leading-tight">{pass.title}</p>
        <p className="mt-2 text-[12.5px] font-semibold text-white/85">{when}{hour ? ` · ${hour}` : ''}</p>
      </div>
      <div className="flex items-center gap-3 p-3">
        <div className="bg-white p-0.5">
          <QRCodeSVG value={pass.qr || pass.id} size={56} level="M" includeMargin={false} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold">{pass.holder}</p>
          <p className="mt-0.5 font-mono text-[11px] text-ink-3">{pass.id.slice(0, 8).toUpperCase()}</p>
          {pass.example ? <p className="text-[11px] text-ink-4">(exemple)</p> : null}
        </div>
      </div>
    </article>
  );
}

export default function DashboardView({
  name,
  phone,
  upcomingCount,
  pastCount,
  orderCount,
  nextEvent,
  passes,
  orders,
  showcase,
  received,
  credits,
  needsEmail,
  onReceived,
  onLogout,
}: {
  name: string;
  phone?: string | null;
  upcomingCount: number;
  pastCount: number;
  orderCount: number;
  nextEvent: DashNext | null;
  passes: DashPass[];
  orders: DashOrder[];
  showcase: DashShowcase[];
  received: DashReceived[];
  credits: { balance: number; currency: string } | null;
  needsEmail?: boolean;
  onReceived?: (id: string) => void;
  onLogout?: () => void;
}) {
  const place = nextEvent ? shortPlace(nextEvent.location, nextEvent.city).label : '';
  const parts = nextEvent ? dayParts(nextEvent.date) : null;
  const days = nextEvent ? daysUntil(nextEvent.date) : null;
  const cats = nextEvent?.categories?.filter(Boolean) ?? [];

  return (
    <AccountShell
      name={name}
      phone={phone}
      active="dashboard"
      counts={{ tickets: upcomingCount, orders: orderCount, received: received.length }}
      onLogout={onLogout}
    >
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[32px] font-bold leading-none tracking-tight md:text-[40px]">Bonjour, {name}.</h1>
          <p className="mt-2 text-[15px] text-ink-2">
            {upcomingCount > 0 ? `${upcomingCount} billet${upcomingCount > 1 ? 's' : ''} à venir` : 'Aucun billet à venir'}
            {' · '}
            {pastCount} billet{pastCount > 1 ? 's' : ''} passé{pastCount > 1 ? 's' : ''}
            {orderCount > 0 ? ` · ${orderCount} commande${orderCount > 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <Link to="/find-tickets" className="btn btn-secondary h-10 px-3 text-[14px]">
          <MagnifyingGlass size={16} /> Retrouver un billet
        </Link>
      </div>

      {nextEvent && parts ? (
        <article className="overflow-hidden rounded-2xl border border-line bg-white md:grid md:grid-cols-[280px_minmax(0,1fr)]">
          <div className="relative h-[200px] md:h-[350px]">
            <PosterTile src={nextEvent.image_url} alt="" className="h-full w-full" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(3,6,30,0.72)] to-transparent p-4 text-white md:hidden">
              <p className="text-[13px]">{countdownLabel(days)}</p>
              <p className="mt-0.5 font-display text-[22px] font-bold leading-tight">{nextEvent.title}</p>
            </div>
          </div>
          <div className="flex flex-col p-4 md:p-8">
            <div className="hidden items-center justify-between gap-3 md:flex">
              <p className="text-[14px] text-ink-2">Votre prochaine sortie</p>
              <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-1 text-[12.5px] font-semibold text-brand">
                <Clock size={14} weight="bold" /> {countdownLabel(days)}
              </span>
            </div>
            <div className="mt-4 flex items-end gap-5">
              <div className="text-center">
                <p className="font-display text-[56px] font-bold leading-none tracking-tight">{parts.day}</p>
                <p className="mt-1 text-[15px] font-semibold text-brand">{parts.month}</p>
              </div>
              <div className="min-w-0 pb-1">
                <h2 className="hidden font-display text-[26px] font-bold leading-tight md:block">{nextEvent.title}</h2>
                <p className="mt-1.5 text-[15px] text-ink-2">
                  {parts.weekday}{nextEvent.time ? ` · portes ${nextEvent.time.slice(0, 5)}` : ''} · {place}
                </p>
              </div>
            </div>
            <div className="my-5 h-px bg-line" />
            <p className="text-[14.5px] text-ink-2">
              <b className="text-ink">{nextEvent.ticketCount} billet{nextEvent.ticketCount > 1 ? 's' : ''}</b>
              {cats.length ? ` · ${cats.join(', ')}` : ''}
            </p>
            <div className="mt-auto flex flex-wrap gap-2 pt-5">
              <Link to="/profile/my-tickets" className="btn btn-primary h-11 px-4"><QrCode size={18} /> Afficher mes billets</Link>
              <a className="btn btn-secondary h-11 px-4" href={mapsSearchUrl(place)} target="_blank" rel="noopener noreferrer"><NavigationArrow size={18} /> Itinéraire</a>
              <a className="btn btn-secondary h-11 px-4" href={calendarHref(nextEvent.title, nextEvent.date, place)} target="_blank" rel="noopener noreferrer"><CalendarPlus size={18} /> Calendrier</a>
            </div>
          </div>
        </article>
      ) : (
        <article className="rounded-2xl border border-line bg-white p-5 md:p-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="font-display text-[26px] font-bold tracking-tight md:text-[28px]">Aucune sortie prévue.</h2>
              <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-2">
                {pastCount > 0
                  ? `Vos ${pastCount} billets concernent des événements passés. Voici ce qui arrive bientôt.`
                  : 'Rien à l’affiche dans votre compte pour le moment. Voici ce qui arrive bientôt.'}
              </p>
            </div>
            <Link to="/events" className="btn btn-secondary h-11">Tous les événements <ArrowRight size={16} /></Link>
          </div>
          {showcase.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
              {showcase.slice(0, 3).map((event) => (
                <Link key={event.id} to={eventPublicPath(event)} className="min-w-0">
                  <PosterTile src={event.image_url} alt="" className="aspect-[4/5] w-full rounded-[10px]" />
                  <p className="mt-2 text-[12.5px] font-semibold text-brand">{formatCalendarDate(event.date, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                  <p className="mt-0.5 line-clamp-2 font-display text-[15px] font-bold">{event.title}</p>
                  <p className="mt-0.5 text-[13px] text-ink-3">{event.city || 'À l’affiche'}{event.price != null ? ` · ${event.price <= 0 ? 'Gratuit' : formatCurrency(event.price, event.currency || 'XOF')}` : ''}</p>
                </Link>
              ))}
            </div>
          )}
        </article>
      )}

      {passes.length > 0 && (
        <>
          <div className="mb-3 mt-9 flex items-baseline justify-between">
            <h2 className="font-display text-[20px] font-bold">Vos billets à venir</h2>
            <Link to="/profile/my-tickets" className="text-[14px] font-semibold text-brand">Mes billets</Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-1">
            {passes.map((pass) => <MiniPass key={pass.id} pass={pass} />)}
            {passes.length > 2 && (
              <div className="grid w-[180px] shrink-0 place-items-center rounded-[14px] border border-dashed border-[#C9CAD6] px-4 text-center text-[14px] text-ink-3">
                <ArrowsLeftRight size={22} />
                <span className="mt-2">Faites défiler pour les suivants</span>
              </div>
            )}
          </div>
        </>
      )}

      <div className="mt-9 grid items-start gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,1fr)]">
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-display text-[20px] font-bold">Commandes récentes</h2>
            <Link to="/profile/bookings" className="text-[14px] font-semibold text-brand">
              {orderCount > orders.length ? `Les ${orderCount} commandes` : 'Voir tout'}
            </Link>
          </div>
          <div className="rounded-2xl border border-line bg-white px-4">
            {orders.length === 0 ? (
              <p className="py-8 text-[14.5px] text-ink-2">Aucune commande pour le moment.</p>
            ) : orders.map((order) => {
              const status = orderStatus(order.status);
              const amount = order.total <= 0 ? 'Gratuit' : formatCurrency(order.total, order.currency || 'XOF');
              return (
                <Link key={order.id} to="/profile/bookings" className="flex items-center gap-3 border-b border-line py-3 last:border-0">
                  <PosterTile src={order.image} alt="" className="h-12 w-12 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-semibold">{order.eventName}</p>
                    <p className="mt-0.5 text-[13px] text-ink-3">
                      {order.date ? formatCalendarDate(order.date, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date à confirmer'}
                      {' · '}
                      <span className="font-mono text-[12px]">{String(order.id).slice(0, 8).toUpperCase()}</span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[14.5px] font-semibold tabular-nums">{amount}</p>
                    <span className={`mt-1 inline-flex h-6 items-center rounded-md px-2 text-[12px] font-semibold ${status.className}`}>{status.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="space-y-5">
          {credits != null && (
            <Link to="/profile/referral" className="block overflow-hidden rounded-[14px] bg-ink p-5 text-white">
              <p className="text-[14px] text-white/70">Crédits Temba</p>
              <p className="mt-1 font-display text-[32px] font-bold">
                <span className="text-[#F6B84A]">{formatCurrency(credits.balance, credits.currency).replace(' FCFA', '')}</span> FCFA
              </p>
              <p className="mt-1.5 text-[13.5px] leading-snug text-white/75">Gagnés en parrainant. Utilisables lors d’un prochain achat.</p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold">Voir mon code de parrainage</span>
            </Link>
          )}

          {received.length > 0 && (
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="font-display text-[16px] font-bold">Billets reçus</h2>
                <Link to="/profile/transfers" className="text-[13.5px] font-semibold text-brand">Les {received.length}</Link>
              </div>
              <div className="rounded-2xl border border-line bg-white px-4">
                {received.slice(0, 3).map((item) => (
                  <button key={item.id} type="button" onClick={() => onReceived?.(item.id)} className="flex w-full items-center gap-3 border-b border-line py-3 text-left last:border-0">
                    <PosterTile src={item.image} alt="" className="h-10 w-10 shrink-0 rounded-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold">{item.title}</span>
                      <span className="mt-0.5 block text-[12.5px] text-ink-3">De {item.from} · {item.when}</span>
                    </span>
                    <span className="text-[12.5px] text-ink-3">{item.status}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-2 font-display text-[16px] font-bold">Raccourcis</h2>
            <div className="rounded-2xl border border-line bg-white px-4">
              <Link to="/find-tickets" className="flex items-center gap-3 border-b border-line py-3 text-[14.5px]">
                <MagnifyingGlass size={20} className="text-ink-2" /> Retrouver un billet acheté sans compte
              </Link>
              {needsEmail && (
                <Link to="/profile" className="flex items-center gap-3 border-b border-line py-3 text-[14.5px]">
                  Ajouter un e-mail
                </Link>
              )}
              <a href="https://wa.me/22674750815" className="flex items-center gap-3 py-3 text-[14.5px]">
                <WhatsappLogo size={20} className="text-ink-2" /> Aide sur WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </AccountShell>
  );
}
