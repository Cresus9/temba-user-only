import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Plus,
  Clock,
  Loader,
  Phone,
  Mail,
  HelpCircle,
  QrCode,
  Smartphone,
  ArrowRightLeft,
} from 'lucide-react';
import { supabase } from '../lib/supabase-client';
import NewTicketModal from '../components/support/NewTicketModal';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import PageSEO from '../components/SEO/PageSEO';

interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  last_reply_at: string | null;
  category_name: string;
  message_count: number;
}

const display = '"Plus Jakarta Sans", Inter, sans-serif';

const FAQS = [
  {
    q: 'Comment payer avec Orange Money ?',
    a: 'Au paiement, choisissez Orange Money (proposé en premier), entrez votre numéro et validez le message USSD. Le QR s’affiche dès que le paiement est confirmé.',
  },
  {
    q: 'Faut-il un compte pour acheter ?',
    a: 'Non. Vous pouvez payer en invité (Sans compte). Créez un compte plus tard pour retrouver vos billets plus facilement.',
  },
  {
    q: 'Où est mon billet QR ?',
    a: 'Après paiement, le QR est sur la page de confirmation et dans Mes billets si vous êtes connecté. Invité : le lien reçu par SMS/e-mail. Présentez-le à l’entrée, même sans réseau.',
  },
  {
    q: 'Puis-je transférer un billet ?',
    a: 'Oui, depuis Mes billets, vers un numéro Temba. Le QR original est désactivé dès que le transfert est accepté.',
  },
];

function statusLabel(status: string) {
  switch (status) {
    case 'OPEN':
      return 'Ouvert';
    case 'IN_PROGRESS':
      return 'En cours';
    case 'RESOLVED':
      return 'Résolu';
    case 'CLOSED':
      return 'Fermé';
    default:
      return status;
  }
}

export default function Support() {
  const { user, isAuthenticated } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);

  const [ticketNonce, setTicketNonce] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setTickets([]);
      return;
    }
    const fetchTickets = async () => {
      try {
        setLoadingTickets(true);
        const { data, error } = await supabase
          .from('support_ticket_details')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setTickets(data || []);
      } catch (error) {
        console.error('Error fetching tickets:', error);
        toast.error('Impossible de charger vos tickets');
      } finally {
        setLoadingTickets(false);
      }
    };
    fetchTickets();
  }, [isAuthenticated, user, ticketNonce]);

  const faqSchema = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    }),
    []
  );

  return (
    <div className="min-h-screen bg-cream bg-grain">
      <PageSEO
        title="Aide et support"
        description="Paiement Orange Money, QR à l’entrée, transfert de billets. Contact Temba : support@tembas.com · +226 74 75 08 15. Pas besoin de compte pour lire l’aide."
        canonicalUrl="https://tembas.com/support"
        structuredData={faqSchema}
        keywords={['support Temba', 'Orange Money billets', 'QR Temba', 'aide billetterie Burkina']}
      />

      <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        <p className="eyebrow mb-2">Centre d’aide</p>
        <h1 className="text-[28px] font-extrabold text-ink leading-tight mb-3" style={{ fontFamily: display }}>
          Besoin d’aide ?
        </h1>
        <p className="text-[15px] text-ink-mute leading-relaxed mb-8">
          Questions fréquentes, WhatsApp et e-mail. Pas besoin de vous connecter pour nous joindre.
        </p>

        <div className="grid sm:grid-cols-2 gap-3 mb-10">
          <a
            href="https://wa.me/22674750815"
            className="flex items-start gap-3 p-4 bg-paper border border-line rounded-2xl hover:border-brand/40 transition-colors"
          >
            <Phone className="w-5 h-5 text-brand mt-0.5 shrink-0" />
            <div>
              <p className="text-[13px] font-bold text-ink">WhatsApp / téléphone</p>
              <p className="text-[13px] text-ink-mute tabular-nums">+226 74 75 08 15</p>
            </div>
          </a>
          <a
            href="mailto:support@tembas.com"
            className="flex items-start gap-3 p-4 bg-paper border border-line rounded-2xl hover:border-brand/40 transition-colors"
          >
            <Mail className="w-5 h-5 text-brand mt-0.5 shrink-0" />
            <div>
              <p className="text-[13px] font-bold text-ink">E-mail</p>
              <p className="text-[13px] text-ink-mute">support@tembas.com</p>
            </div>
          </a>
        </div>

        <h2 className="text-[18px] font-extrabold text-ink mb-4" style={{ fontFamily: display }}>
          Questions fréquentes
        </h2>
        <div className="space-y-3 mb-12">
          {FAQS.map((item) => (
            <details key={item.q} className="group bg-paper border border-line rounded-2xl px-4 py-3">
              <summary className="cursor-pointer list-none flex items-start gap-2 font-semibold text-[14px] text-ink">
                <HelpCircle className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                {item.q}
              </summary>
              <p className="text-[13px] text-ink-mute leading-relaxed mt-2 pl-6">{item.a}</p>
            </details>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 text-[12px] text-ink-mute mb-12">
          <span className="inline-flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> Orange Money / Moov</span>
          <span className="inline-flex items-center gap-1.5"><QrCode className="w-3.5 h-3.5" /> QR à l’entrée</span>
          <span className="inline-flex items-center gap-1.5"><ArrowRightLeft className="w-3.5 h-3.5" /> Transfert de billet</span>
        </div>

        <div className="border-t border-line pt-8">
          <div className="flex justify-between items-center mb-4 gap-3">
            <div>
              <h2 className="text-[18px] font-extrabold text-ink" style={{ fontFamily: display }}>
                Vos tickets
              </h2>
              <p className="text-[13px] text-ink-mute">Suivi des demandes déjà ouvertes.</p>
            </div>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => setShowNewTicket(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand text-paper rounded-xl text-[13px] font-bold hover:bg-brand/90"
              >
                <Plus className="h-4 w-4" />
                Nouveau ticket
              </button>
            ) : (
              <Link
                to="/login"
                state={{ redirectTo: '/support' }}
                className="flex items-center gap-2 px-4 py-2 border border-line rounded-xl text-[13px] font-bold text-ink hover:border-brand/40"
              >
                Se connecter
              </Link>
            )}
          </div>

          {!isAuthenticated && (
            <p className="text-[13px] text-ink-mute bg-paper border border-line rounded-2xl p-4">
              Connectez-vous seulement pour ouvrir un ticket interne. Pour une urgence le jour J, passez par WhatsApp.
            </p>
          )}

          {isAuthenticated && loadingTickets && (
            <div className="flex justify-center py-10">
              <Loader className="h-8 w-8 animate-spin text-brand" />
            </div>
          )}

          {isAuthenticated && !loadingTickets && tickets.length > 0 && (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/support/${ticket.id}`}
                  className="block bg-paper border border-line rounded-2xl p-4 hover:border-brand/40"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="h-4 w-4 text-ink-mute" />
                    <h3 className="font-medium text-ink">{ticket.subject}</h3>
                    <span className="text-[11px] font-bold uppercase text-brand">{statusLabel(ticket.status)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[12px] text-ink-mute">
                    <span>{ticket.category_name}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(ticket.created_at).toLocaleDateString('fr-FR')}
                    </span>
                    <span>{ticket.message_count} message{ticket.message_count > 1 ? 's' : ''}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {isAuthenticated && !loadingTickets && tickets.length === 0 && (
            <p className="text-[13px] text-ink-mute">Aucun ticket pour le moment.</p>
          )}
        </div>
      </div>

      {showNewTicket && (
        <NewTicketModal
          onClose={() => setShowNewTicket(false)}
          onSuccess={() => {
            setShowNewTicket(false);
            setTicketNonce((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}
