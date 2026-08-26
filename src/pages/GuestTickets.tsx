import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Download, Loader, MessageCircle, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import EnhancedFestivalTicket from '../components/tickets/EnhancedFestivalTicket';
import PageSEO from '../components/SEO/PageSEO';
import { useAuth } from '../context/AuthContext';
import {
  loadGuestTickets,
  guestWhatsAppShareUrl,
  persistGuestWallet,
  realGuestEmail,
  type GuestTicketRow,
} from '../services/guestTicketService';
import { generateTicketPNG } from '../utils/ticketService';

export default function GuestTickets() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [tickets, setTickets] = useState<GuestTicketRow[]>([]);
  const [orderMeta, setOrderMeta] = useState<{ found: boolean; orderId?: string; eventTitle?: string }>({ found: false });
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try {
        const loaded = await loadGuestTickets(token);
        setOrderMeta({ found: loaded.found, orderId: loaded.orderId, eventTitle: loaded.eventTitle });
        setTickets(loaded.tickets);
        if (loaded.orderId) {
          persistGuestWallet({
            token,
            orderId: loaded.orderId,
            email: realGuestEmail(loaded.guestEmail),
            phone: loaded.guestPhone,
          });
        }
      } catch (err: any) {
        toast.error(err.message || 'Impossible de charger les billets');
        setTickets([]);
        setOrderMeta({ found: false });
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleDownload = async () => {
    if (!tickets.length) return;
    try {
      setDownloading(true);
      const els = document.querySelectorAll('[data-ticket]');
      for (let i = 0; i < els.length; i++) {
        const png = await generateTicketPNG(els[i] as HTMLElement);
        const url = URL.createObjectURL(png);
        const link = document.createElement('a');
        link.href = url;
        link.download = `billet-temba-${(tickets[i].event_title || 'event').replace(/\s+/g, '-')}-${tickets[i].id.slice(-6)}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      toast.success('Billets téléchargés');
    } catch {
      toast.error('Échec du téléchargement');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] bg-cream bg-grain grid place-items-center px-4">
        <div className="text-center space-y-3">
          <Loader className="h-7 w-7 animate-spin text-brand mx-auto" />
          <p className="text-[14px] text-ink-mute">Chargement de vos billets…</p>
        </div>
      </div>
    );
  }

  if (!token || (!tickets.length && !orderMeta.found)) {
    return (
      <div className="min-h-[80vh] bg-cream bg-grain grid place-items-center px-4 py-12">
        <PageSEO title="Billets invité" robots="noindex, nofollow" />
        <div className="max-w-md text-center">
          <p className="eyebrow !text-ink-mute mb-2">Lien invalide</p>
          <h2 className="text-ink mb-3">Aucun billet trouvé</h2>
          <p className="text-[14px] text-ink-mute mb-6">
            Ce lien a peut-être expiré. Retrouvez vos billets avec votre téléphone ou votre e-mail.
          </p>
          <Link to="/find-tickets" className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand text-paper rounded-lg text-[14px] font-bold">
            Retrouver mes billets
          </Link>
        </div>
      </div>
    );
  }

  if (!tickets.length) {
    return (
      <div className="min-h-[80vh] bg-cream bg-grain grid place-items-center px-4 py-12">
        <PageSEO title="Billets invité" robots="noindex, nofollow" />
        <div className="max-w-md text-center">
          <p className="eyebrow !text-ink-mute mb-2">Commande trouvée</p>
          <h2 className="text-ink mb-3">{orderMeta.eventTitle || 'Billets en préparation'}</h2>
          <p className="text-[14px] text-ink-mute mb-6">
            Le paiement est bien lié à cette commande, mais les QR n’ont pas encore été créés. Réessayez dans un instant, ou contactez le support.
          </p>
          <Link to="/find-tickets" className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand text-paper rounded-lg text-[14px] font-bold">
            Réessayer
          </Link>
        </div>
      </div>
    );
  }

  const first = tickets[0];
  const holder = first.guest_name || realGuestEmail(first.guest_email)?.split('@')[0] || first.guest_phone || 'Invité';
  const orderCode = (first.order_id || '').slice(0, 8).toUpperCase();
  const waUrl = guestWhatsAppShareUrl(token, first.event_title);

  return (
    <div>
      <PageSEO
        title={`Billets – ${first.event_title || 'Temba'}`}
        description="Vos billets Temba. Présentez le QR à l'entrée."
        robots="noindex, nofollow"
      />

      <section className="relative bg-cream bg-grain border-b border-line overflow-hidden">
        <div className="relative max-w-3xl mx-auto px-4 lg:px-6 pt-7 pb-8 md:pt-9 md:pb-10 text-center">
          <button
            onClick={() => navigate('/events')}
            className="absolute top-5 left-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-mute hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Événements
          </button>

          <div className="grid place-items-center w-14 h-14 rounded-full bg-green-50 mx-auto mb-4 ring-1 ring-green-200">
            <Check className="h-7 w-7 text-green-600" />
          </div>
          <p className="eyebrow mb-2">
            <span className="tabular-nums" style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
              ORD · {orderCode || '—'}
            </span>
          </p>
          <h1 className="!text-[clamp(24px,3.4vw,36px)] !leading-[1.06] text-ink mb-2 tracking-tight">
            Vos billets sont prêts
          </h1>
          <p className="text-[14px] text-ink-mute max-w-md mx-auto">
            Enregistrez-les sur cet appareil. À l'entrée, présentez le QR code.
          </p>
        </div>
      </section>

      <section className="bg-paper">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-8 md:py-10">
          <div className="space-y-6 mb-7">
            {tickets.map(ticket => (
              <div key={ticket.id} data-ticket>
                <EnhancedFestivalTicket
                  ticketHolder={holder}
                  ticketType={ticket.ticket_type_name || 'Billet'}
                  ticketId={ticket.id}
                  eventTitle={ticket.event_title || 'Événement'}
                  eventDate={ticket.event_date || ''}
                  eventTime={ticket.event_time || ''}
                  eventLocation={ticket.event_location || ''}
                  qrCode={ticket.qr_code}
                  eventImage={ticket.event_image}
                  price={ticket.ticket_type_price}
                  currency="XOF"
                  specialInstructions="Arrivez 30 minutes avant. Présentez ce QR à l'entrée."
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 mb-8">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-brand hover:bg-brand-700 text-paper rounded-lg text-[14px] font-bold disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {downloading ? 'Téléchargement…' : 'Télécharger'}
            </button>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 h-11 px-5 border border-line bg-paper hover:bg-cream text-ink rounded-lg text-[14px] font-bold"
            >
              <MessageCircle className="h-4 w-4 text-emerald-600" />
              Envoyer sur WhatsApp
            </a>
          </div>

          {!isAuthenticated ? (
            <div className="rounded-xl2 border border-line bg-cream p-5 text-center">
              <p className="text-[14px] font-bold text-ink mb-1">Garder ces billets sur votre compte</p>
              <p className="text-[13px] text-ink-mute mb-4">
                Créez un compte avec le même téléphone ou e-mail pour transférer un billet et les retrouver partout.
              </p>
              <Link
                to="/signup"
                state={{ redirectTo: '/profile/my-tickets' }}
                className="inline-flex items-center gap-2 h-11 px-5 bg-ink text-paper rounded-lg text-[14px] font-bold"
              >
                <UserPlus className="h-4 w-4" />
                Créer un compte
              </Link>
              <p className="mt-3 text-[13px] text-ink-mute">
                Déjà un compte ?{' '}
                <Link to="/login" state={{ redirectTo: '/profile/my-tickets' }} className="font-semibold text-brand">
                  Se connecter
                </Link>
              </p>
            </div>
          ) : (
            <div className="text-center">
              <Link to="/profile/my-tickets" className="text-[14px] font-semibold text-brand">
                Voir dans mon compte →
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
