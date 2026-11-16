import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Download, Loader, MessageCircle, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import TicketsDesk from '../components/design/TicketsDesk';
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
import { trackPurchase } from '../lib/metaPixel';

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

  useEffect(() => {
    if (!orderMeta.orderId || tickets.length === 0) return;
    trackPurchase({
      orderId: orderMeta.orderId,
      numItems: tickets.length,
    });
  }, [orderMeta.orderId, tickets.length]);

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

  return (
    <>
      <PageSEO
        title={`Vos billets – ${first.event_title || 'Temba'}`}
        description="Vos billets Temba. Présentez le QR à l'entrée."
        robots="noindex, nofollow"
      />
      <TicketsDesk
        tickets={tickets.map((ticket) => ({
          id: ticket.id,
          eventTitle: ticket.event_title || 'Événement',
          eventDate: ticket.event_date,
          eventTime: ticket.event_time,
          venue: ticket.event_location,
          holder,
          categoryName: ticket.ticket_type_name,
          price: ticket.ticket_type_price,
          qrValue: ticket.qr_code,
          ticketCode: ticket.id.slice(0, 8).toUpperCase(),
          orderCode,
          state: (ticket.status || '').toUpperCase() === 'SCANNED' ? 'scanned' : 'valid',
          image: ticket.event_image,
        }))}
        phoneHint={first.guest_phone}
        emailHint={realGuestEmail(first.guest_email)}
        onDownload={handleDownload}
        onCalendar={() => {
          const [ey, em, ed] = String(first.event_date || '').split('T')[0].split('-').map(Number);
          if (!ey || !em || !ed) return;
          const start = new Date(ey, em - 1, ed);
          const startTime = start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          const endTime = new Date(start.getTime() + 3 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(first.event_title || 'Temba')}&dates=${startTime}/${endTime}`;
          window.open(url, '_blank');
        }}
        onShare={() => {
          const url = guestWhatsAppShareUrl(token, first.event_title);
          window.open(url, '_blank', 'noopener,noreferrer');
        }}
      />
      {!isAuthenticated ? (
        <div className="mx-auto mb-10 max-w-[1200px] px-4 md:px-6">
          <div className="rounded-2xl border border-line bg-surf p-5 text-center">
            <p className="text-[14px] font-bold text-ink">Garder ces billets sur votre compte</p>
            <p className="mx-auto mt-1 max-w-md text-[13px] text-ink-2">
              Créez un compte avec le même téléphone ou e-mail pour transférer un billet et les retrouver partout.
            </p>
            <Link to="/signup" state={{ redirectTo: '/profile/my-tickets' }} className="btn btn-ink mt-4 h-11">
              Créer un compte
            </Link>
          </div>
        </div>
      ) : (
        <div className="pb-8 text-center">
          <Link to="/profile/my-tickets" className="text-[14px] font-semibold text-brand">Voir dans mon compte</Link>
        </div>
      )}
    </>
  );
}
