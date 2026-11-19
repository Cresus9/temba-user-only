import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Loader, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventContext';
import { userService } from '../services/userService';
import { transferredTicketsService, type TransferredTicket } from '../services/transferredTicketsService';
import { calendarDayInZone, formatCalendarDate, isPlaceholderEmail } from '../utils/formatters';
import { formatPhoneForDisplay } from '../utils/phoneValidation';
import toast from 'react-hot-toast';
import type { DashboardStats } from '../services/userService';
import EnhancedFestivalTicket from '../components/tickets/EnhancedFestivalTicket';
import PageSEO from '../components/SEO/PageSEO';
import AccountShell from '../components/account/AccountShell';
import FullscreenBackdrop from '../components/account/FullscreenBackdrop';
import DashboardView from './dashboard/DashboardView';

export default function Dashboard() {
  const { profile, logout } = useAuth();
  const { events } = useEvents();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);
  const [transferredTickets, setTransferredTickets] = useState<TransferredTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TransferredTicket | null>(null);

  const load = async () => {
    const [data, transferredTicketsData] = await Promise.all([
      userService.getDashboardData(),
      transferredTicketsService.getTransferredTickets(),
    ]);
    setDashboardData(data);
    setTransferredTickets(transferredTicketsData);
  };

  useEffect(() => {
    if (!profile) return;
    let alive = true;
    setLoading(true);
    load()
      .catch((error) => {
        console.error('Erreur lors du chargement des données du tableau de bord:', error);
        if (alive) toast.error('Échec du chargement des données du tableau de bord');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [profile]);

  const displayName =
    profile?.name ||
    (profile?.phone ? formatPhoneForDisplay(profile.phone) : null) ||
    (!isPlaceholderEmail(profile?.email) ? profile?.email?.split('@')[0] : null) ||
    'Invité';
  const phone = profile?.phone ? formatPhoneForDisplay(profile.phone) : null;

  const shell = (children: ReactNode) => (
    <>
      <PageSEO title="Tableau de bord" description="Votre tableau de bord Temba." robots="noindex, nofollow" />
      <AccountShell name={displayName} phone={phone} active="dashboard" onLogout={() => logout().then(() => navigate('/login'))}>
        {children}
      </AccountShell>
    </>
  );

  if (loading) {
    return shell(
      <div className="grid min-h-[50vh] place-items-center">
        <div className="flex flex-col items-center gap-3">
          <Loader className="h-5 w-5 animate-spin text-brand" />
          <p className="text-[14px] text-ink-2">Chargement de votre tableau de bord…</p>
        </div>
      </div>,
    );
  }

  if (!dashboardData) {
    return shell(
      <div className="max-w-md py-16">
        <AlertCircle className="mb-3 h-7 w-7 text-red-600" />
        <h2 className="font-display text-[28px] font-bold">Tableau de bord indisponible</h2>
        <p className="mt-2 text-[15px] text-ink-2">Nous n’avons pas pu charger vos données. Vérifiez votre connexion puis réessayez.</p>
        <button type="button" onClick={() => window.location.reload()} className="btn btn-primary mt-5 h-11 px-5">Réessayer</button>
      </div>,
    );
  }

  const today = calendarDayInZone();
  const imageByTitle = new Map(events.map((event) => [event.title, event.image_url]));
  const showcase = events
    .filter((event) => !event.is_permanent && String(event.date || '').split('T')[0] >= today && event.status === 'PUBLISHED')
    .slice(0, 3)
    .map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      city: event.city,
      image_url: event.image_url,
      price: event.price,
      currency: event.currency,
      slug: event.slug,
    }));

  return (
    <>
      <PageSEO title="Tableau de bord" description="Votre tableau de bord Temba." robots="noindex, nofollow" />
      <DashboardView
        name={displayName}
        phone={phone}
        upcomingCount={dashboardData.stats.upcomingEvents}
        pastCount={dashboardData.stats.pastTickets}
        orderCount={dashboardData.stats.orderCount}
        nextEvent={dashboardData.stats.nextEvent}
        passes={(dashboardData.stats.passes || []).map((pass) => ({ ...pass, holder: displayName }))}
        orders={dashboardData.recentOrders.map((order) => ({
          ...order,
          image: imageByTitle.get(order.eventName) || '',
        }))}
        showcase={showcase}
        received={transferredTickets.map((ticket) => ({
          id: ticket.id,
          title: ticket.ticket.event.title,
          from: ticket.sender?.name || 'un proche',
          when: formatCalendarDate(ticket.created_at, { day: 'numeric', month: 'short', year: 'numeric' }),
          status: ticket.status === 'USED' ? 'Utilisé' : 'Non utilisé',
          image: ticket.ticket.event.image_url,
        }))}
        credits={dashboardData.stats.credits}
        needsEmail={isPlaceholderEmail(profile?.email) || !profile?.email}
        onReceived={(id) => setSelectedTicket(transferredTickets.find((ticket) => ticket.id === id) || null)}
        onLogout={() => logout().then(() => navigate('/login'))}
      />

      {selectedTicket && (
        <FullscreenBackdrop onClose={() => setSelectedTicket(null)}>
          <div className="my-auto w-full max-w-5xl overflow-y-auto rounded-2xl bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <p className="text-[14px] font-semibold">Billet reçu</p>
              <button type="button" onClick={() => setSelectedTicket(null)} aria-label="Fermer" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-surf">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              <EnhancedFestivalTicket
                ticketHolder={profile?.name || displayName}
                ticketType={selectedTicket.ticket.ticket_type.name}
                ticketId={selectedTicket.ticket.id}
                eventTitle={selectedTicket.ticket.event.title}
                eventDate={selectedTicket.ticket.event.date}
                eventTime={selectedTicket.ticket.event.time}
                eventLocation={selectedTicket.ticket.event.location}
                qrCode={selectedTicket.ticket.qr_code}
                eventImage={selectedTicket.ticket.event.image_url}
                price={selectedTicket.ticket.ticket_type.price}
                currency="XOF"
                orderNumber={selectedTicket.id}
                purchaseDate={selectedTicket.created_at}
                eventCategory="Concert"
                specialInstructions="Arrivez 30 minutes avant le début. Présentez ce billet à l'entrée."
                ticketStatus={selectedTicket.ticket.status}
                scannedAt={selectedTicket.ticket.scanned_at}
                scannedBy={selectedTicket.ticket.scanned_by_name}
                scanLocation={selectedTicket.ticket.scan_location}
                onTransferComplete={() => {
                  setSelectedTicket(null);
                  load().catch(() => undefined);
                }}
              />
            </div>
          </div>
        </FullscreenBackdrop>
      )}
    </>
  );
}
