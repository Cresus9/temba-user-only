import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Ticket, 
  Calendar,
  CreditCard,
  ChevronRight,
  Loader,
  Clock,
  MapPin,
  AlertCircle,
  MessageSquare,
  Gift,
  User,
  Eye,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/userService';
import { transferredTicketsService, type TransferredTicket } from '../services/transferredTicketsService';
import { formatCalendarDate, formatCurrency, isPlaceholderEmail } from '../utils/formatters';
import { shortPlace } from '../utils/eventGeo';
import { formatPhoneForDisplay } from '../utils/phoneValidation';
import toast from 'react-hot-toast';
import type { DashboardStats } from '../services/userService';
import EnhancedFestivalTicket from '../components/tickets/EnhancedFestivalTicket';
import PageSEO from '../components/SEO/PageSEO';

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);
  const [transferredTickets, setTransferredTickets] = useState<TransferredTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TransferredTicket | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [data, transferredTicketsData] = await Promise.all([
          userService.getDashboardData(),
          transferredTicketsService.getTransferredTickets()
        ]);
        console.log('Dashboard data loaded:', { data, transferredTicketsData });
        setDashboardData(data);
        setTransferredTickets(transferredTicketsData);
      } catch (error) {
        console.error('Erreur lors du chargement des données du tableau de bord:', error);
        toast.error('Échec du chargement des données du tableau de bord');
      } finally {
        setLoading(false);
      }
    };

    if (profile) {
      fetchDashboardData();
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center px-4 py-12">
      <PageSEO title="Tableau de bord" description="Votre tableau de bord Temba." robots="noindex, nofollow" />
        <div className="flex flex-col items-center gap-3">
          <div className="grid place-items-center w-12 h-12 rounded-full bg-brand-50">
            <Loader className="h-5 w-5 animate-spin text-brand" />
          </div>
          <p className="text-[13px] text-ink-mute">Chargement de votre tableau de bord…</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-[60vh] grid place-items-center px-4 py-12">
        <div className="max-w-md text-center">
          <div className="grid place-items-center w-14 h-14 rounded-full bg-red-50 mx-auto mb-4 ring-1 ring-red-200">
            <AlertCircle className="h-7 w-7 text-red-600" />
          </div>
          <p className="eyebrow !text-red-600 mb-1.5">Erreur de chargement</p>
          <h2 className="text-ink mb-2">Tableau de bord indisponible</h2>
          <p className="text-[14px] text-ink-mute mb-5 leading-relaxed">
            Nous n'avons pas pu charger vos données. Vérifiez votre connexion puis réessayez.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 h-11 px-5 bg-brand hover:bg-brand-700 text-paper rounded-lg text-[14px] font-bold transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const displayName =
    profile?.name ||
    (profile?.phone ? formatPhoneForDisplay(profile.phone) : null) ||
    (!isPlaceholderEmail(profile?.email) ? profile?.email?.split('@')[0] : null) ||
    'Invité';

  return (
    <div>
      <section className="bg-paper">
        <div className="mx-auto max-w-[1200px] px-4 py-8 lg:px-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-[32px] font-bold tracking-tight text-ink md:text-[40px]">Bonjour, {displayName}.</h1>
              <p className="mt-2 text-[15px] text-ink-2">
                {dashboardData.stats.upcomingEvents > 0
                  ? `${dashboardData.stats.upcomingEvents} billet${dashboardData.stats.upcomingEvents > 1 ? 's' : ''} à venir · `
                  : 'Aucun billet à venir · '}
                {dashboardData.stats.pastTickets} billets passés
              </p>
            </div>
            <Link to="/find-tickets" className="btn btn-secondary h-10 px-3 text-[14px]">Retrouver un billet</Link>
          </div>

          {dashboardData.stats.nextEvent ? (
            <div className="overflow-hidden rounded-2xl border border-line bg-white md:grid md:grid-cols-[220px_minmax(0,1fr)]">
              {dashboardData.stats.nextEvent.image_url ? (
                <img src={dashboardData.stats.nextEvent.image_url} alt="" className="h-52 w-full object-cover md:h-full" />
              ) : (
                <div className="grid h-52 place-items-center bg-brand text-white md:h-full">Temba</div>
              )}
              <div className="flex flex-col p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[14px] text-ink-2">Votre prochaine sortie</p>
                </div>
                <p className="mt-3 font-display text-[28px] font-bold leading-tight">{dashboardData.stats.nextEvent.title}</p>
                <p className="mt-2 text-[15px] text-ink-2">
                  {formatCalendarDate(dashboardData.stats.nextEvent.date, { weekday: 'long', day: 'numeric', month: 'long' })}
                  {dashboardData.stats.nextEvent.time ? ` · ${dashboardData.stats.nextEvent.time.slice(0, 5)}` : ''}
                  {' · '}
                  {shortPlace(dashboardData.stats.nextEvent.location, dashboardData.stats.nextEvent.city).label}
                </p>
                <div className="mt-auto flex flex-wrap gap-2 pt-6">
                  <Link to="/profile/my-tickets" className="btn btn-primary h-11 px-4">Afficher mes billets</Link>
                  <a className="btn btn-secondary h-11 px-4" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shortPlace(dashboardData.stats.nextEvent.location, dashboardData.stats.nextEvent.city).label)}`} target="_blank" rel="noopener noreferrer">Itinéraire</a>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-white p-6 md:p-8">
              <p className="font-display text-[26px] font-bold">Aucune sortie prévue.</p>
              <p className="mt-2 max-w-xl text-[15px] text-ink-2">Vos billets concernent des événements passés. Voici ce qui est à l’affiche.</p>
              <Link to="/events" className="btn btn-secondary mt-4 h-11">Tous les événements</Link>
            </div>
          )}

          {dashboardData.stats.credits != null && (
            <Link to="/profile/referral" className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-ink px-4 py-3 text-white">
              <span className="font-display text-[22px] font-bold text-[#F6B84A]">{formatCurrency(dashboardData.stats.credits.balance, dashboardData.stats.credits.currency)}</span>
              <span className="text-[14px] text-white/80">de crédits Temba · Parrainage</span>
            </Link>
          )}
        </div>
      </section>

      <section className="bg-paper">
        <div className="mx-auto max-w-[1200px] px-4 pb-10 lg:px-6 space-y-7">

          {/* Recent Orders */}
          <div className="bg-paper rounded-xl2 border border-line shadow-card overflow-hidden">
            <div className="px-5 py-3.5 bg-cream border-b border-line flex items-center justify-between">
              <p className="eyebrow !mb-0">Commandes récentes</p>
              <Link
                to="/profile/bookings"
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink hover:text-brand transition-colors"
              >
                Voir tout
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {dashboardData.recentOrders.length > 0 ? (
              <div className="divide-y divide-line">
                {dashboardData.recentOrders.map((order) => {
                  const place = shortPlace(order.location).label;
                  const when = order.date
                    ? formatCalendarDate(order.date, { day: 'numeric', month: 'short', year: 'numeric' })
                    : '';
                  const ref = String(order.id).slice(0, 8).toUpperCase();
                  const statusLabel = order.status === 'COMPLETED'
                    ? 'Payée'
                    : order.status === 'AWAITING_PAYMENT'
                    ? 'En attente'
                    : order.status === 'CANCELLED'
                    ? 'Annulée'
                    : order.status;
                  const statusClass = order.status === 'COMPLETED'
                    ? 'bg-[#E6F4EE] text-[#0B7A52]'
                    : order.status === 'AWAITING_PAYMENT'
                    ? 'bg-[#FFF5E0] text-[#8A5A00]'
                    : order.status === 'CANCELLED'
                    ? 'bg-[#FCEBEA] text-[#C42B25]'
                    : 'bg-surf text-ink-2';
                  return (
                  <div
                    key={order.id}
                    onClick={() => navigate(`/profile/bookings`)}
                    className="grid cursor-pointer grid-cols-1 items-center gap-3 px-5 py-4 hover:bg-surf md:grid-cols-[minmax(0,1.6fr)_150px_minmax(160px,1fr)_110px_120px_100px] md:gap-4"
                  >
                    <p className="truncate font-display text-[16px] font-bold text-ink">{order.eventName}</p>
                    <p className="text-[14px] text-ink-2">{when}</p>
                    <p className="flex min-w-0 items-center gap-1.5 text-[14px] text-ink-2">
                      <MapPin className="h-4 w-4 shrink-0 text-ink-3" />
                      <span className="truncate">{place}</span>
                    </p>
                    <p className="font-mono text-[13px] text-ink-3">EX-{ref}</p>
                    <p className="font-display text-[15px] font-bold tabular-nums">{formatCurrency(order.total, order.currency)}</p>
                    <span className={`inline-flex h-7 w-fit items-center rounded-md px-2 text-[12px] font-semibold ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 px-4">
                <div className="grid place-items-center w-14 h-14 rounded-full bg-cream-deep mx-auto mb-4">
                  <Ticket className="h-6 w-6 text-ink-mute" />
                </div>
                <p className="eyebrow !mb-1">Aucune commande</p>
                <h3 className="text-ink mb-1.5">Commencez votre exploration</h3>
                <p className="text-[13px] text-ink-mute mb-5 max-w-sm mx-auto leading-relaxed">
                  Parcourez les événements à l'affiche et faites votre première réservation.
                </p>
                <Link
                  to="/events"
                  className="inline-flex items-center gap-1.5 h-10 px-4 bg-brand hover:bg-brand-700 text-paper rounded-lg text-[13px] font-bold transition-colors"
                >
                  Parcourir les événements
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Transferred Tickets Section */}
          {transferredTickets.length > 0 && (
            <div className="bg-paper rounded-xl2 border border-line shadow-card overflow-hidden">
              <div className="px-5 py-3.5 bg-cream border-b border-line flex items-center justify-between">
                <p className="eyebrow !mb-0 inline-flex items-center gap-1.5">
                  <Gift className="h-3.5 w-3.5 text-accent" />
                  Billets reçus
                </p>
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-mute tabular-nums"
                  style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                >
                  {String(transferredTickets.length).padStart(2, '0')} BILLET
                  {transferredTickets.length > 1 ? 'S' : ''}
                </span>
              </div>

              <div className="divide-y divide-line">
                {transferredTickets.map((transfer) => (
                  <div
                    key={transfer.id}
                    onClick={() => setSelectedTicket(transfer)}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-cream transition-colors cursor-pointer group"
                  >
                    <div className="mb-3 md:mb-0 min-w-0 flex-1">
                      <h3 className="text-[14px] font-bold text-ink group-hover:text-brand transition-colors truncate">
                        {transfer.ticket.event.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-mute mt-1">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(transfer.ticket.event.date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        <span aria-hidden className="text-line">·</span>
                        <span className="inline-flex items-center gap-1.5 truncate">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{shortPlace(transfer.ticket.event.location).label}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <User className="h-3 w-3 text-accent" />
                        <span className="text-[11px] text-ink-mute/90">
                          {transfer.sender
                            ? <>Transféré par <span className="font-semibold text-ink">{transfer.sender.name}</span></>
                            : 'Billet transféré'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[12px] font-bold text-ink truncate max-w-[120px]">
                          {transfer.ticket.ticket_type.name}
                        </p>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-[0.08em] mt-0.5 ${
                            transfer.status === 'USED'
                              ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                              : 'bg-accent text-ink'
                          }`}
                        >
                          {transfer.status === 'USED' ? 'Utilisé' : 'Reçu'}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-ink-mute group-hover:text-brand transition-colors flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </section>

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div
          className="fixed inset-0 bg-ink/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            className="bg-paper rounded-xl2 border border-line shadow-pop max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 bg-cream border-b border-line">
              <p className="eyebrow !mb-0 inline-flex items-center gap-1.5">
                <Gift className="h-3.5 w-3.5 text-accent" />
                Billet reçu
              </p>
              <button
                onClick={() => setSelectedTicket(null)}
                className="grid place-items-center w-8 h-8 rounded-lg hover:bg-paper border border-transparent hover:border-line text-ink-mute hover:text-ink transition-colors"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 md:p-6">
              {/* Transfer Information Banner */}
              <div className="bg-cream rounded-xl2 border border-line p-4 mb-5 relative overflow-hidden">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-10 -right-10 w-24 h-24 rounded-full bg-accent/30 blur-2xl"
                />
                <div className="relative flex items-start gap-3">
                  <div className="grid place-items-center w-10 h-10 rounded-lg bg-accent text-ink flex-shrink-0">
                    <Gift className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="eyebrow !mb-0.5">Billet transféré</p>
                    {selectedTicket.sender && (
                      <p className="text-[13px] text-ink/85">
                        Reçu de <span className="font-bold text-ink">{selectedTicket.sender.name}</span>
                        <span className="text-ink-mute"> · {new Date(selectedTicket.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </p>
                    )}
                    {selectedTicket.message && (
                      <div className="mt-2.5 p-2.5 bg-paper rounded-lg border border-line">
                        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-mute mb-1">Message</p>
                        <p className="text-[13px] text-ink italic">&ldquo;{selectedTicket.message}&rdquo;</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Ticket Display */}
              <div className="relative">
                <EnhancedFestivalTicket
                    ticketHolder={profile?.name || 'Utilisateur'}
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
                    ticketStatus={selectedTicket.ticket.status} // NEW: Pass ticket status
                    scannedAt={selectedTicket.ticket.scanned_at} // NEW: Pass scan timestamp
                    scannedBy={selectedTicket.ticket.scanned_by_name} // NEW: Pass scanner name
                    scanLocation={selectedTicket.ticket.scan_location} // NEW: Pass scan location
                    onTransferComplete={() => {
                      setSelectedTicket(null);
                      // Refresh the transferred tickets list
                      const refreshData = async () => {
                        try {
                          const [data, transferredTicketsData] = await Promise.all([
                            userService.getDashboardData(),
                            transferredTicketsService.getTransferredTickets()
                          ]);
                          setDashboardData(data);
                          setTransferredTickets(transferredTicketsData);
                        } catch (error) {
                          console.error('Error refreshing data:', error);
                        }
                      };
                      refreshData();
                    }}
                  />
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 mt-5 pt-4 border-t border-line">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="inline-flex items-center justify-center h-10 px-5 text-[13px] font-medium text-ink-mute hover:text-ink border border-line rounded-lg hover:border-brand/40 hover:bg-cream transition-colors"
                >
                  Fermer
                </button>
                <button
                  onClick={() => {
                    setSelectedTicket(null);
                    navigate('/profile/bookings');
                  }}
                  className="inline-flex items-center justify-center gap-1.5 h-10 px-5 bg-brand hover:bg-brand-700 text-paper rounded-lg text-[13px] font-bold transition-colors shadow-card"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Voir tous les billets
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}