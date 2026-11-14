import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AccountShell from '../../components/account/AccountShell';
import FullscreenBackdrop from '../../components/account/FullscreenBackdrop';
import PosterTile from '../../components/account/PosterTile';
import TicketPass from '../../components/design/TicketPass';
import PageSEO from '../../components/SEO/PageSEO';
import DashboardView, { type DashOrder, type DashPass, type DashReceived, type DashShowcase } from '../dashboard/DashboardView';

const PHOTO = '/photos/awa-sissao-lg.jpg';
const NAME = 'Aristide';
const PHONE = '+226 70 00 00 00';

const passes: DashPass[] = [
  { id: 'ex-mk-0001', title: 'Awa Sissao en concert', date: '2026-12-18', time: '19:00', location: 'Place de la Nation', city: 'Ouagadougou', image: PHOTO, category: 'VIP', qr: 'exemple-vip', holder: NAME, example: true },
  { id: 'ex-mk-0002', title: 'Awa Sissao en concert', date: '2026-12-18', time: '19:00', location: 'Place de la Nation', city: 'Ouagadougou', image: PHOTO, category: 'Standard', qr: 'exemple-std', holder: NAME, example: true },
];

const orders: DashOrder[] = [
  { id: '3c0add0e', eventName: 'Awa Sissao en concert', total: 15000, status: 'COMPLETED', date: '2026-12-18', location: 'Place de la Nation', currency: 'XOF', image: PHOTO },
  { id: 'c6d32661', eventName: 'Soirée sans affiche', total: 5000, status: 'CANCELLED', date: '2026-11-02', location: 'Bobo-Dioulasso', currency: 'XOF', image: '' },
  { id: 'ex-000001', eventName: 'Entrée gratuite', total: 0, status: 'FREE', date: '2026-10-12', location: 'Ouagadougou', currency: 'XOF', image: PHOTO },
];

const showcase: DashShowcase[] = [
  { id: '1', title: 'Awa Sissao en concert', date: '2026-12-18', city: 'Ouagadougou', image_url: PHOTO, price: 5000, currency: 'XOF', slug: 'awa' },
  { id: '2', title: 'Week-end au parc', date: '2026-12-20', city: 'Bobo-Dioulasso', image_url: '', price: 2000, currency: 'XOF', slug: 'parc' },
  { id: '3', title: 'Soirée live', date: '2026-12-26', city: 'Ouagadougou', image_url: PHOTO, price: 3000, currency: 'XOF', slug: 'live' },
];

const received: DashReceived[] = [
  { id: 'r1', title: 'Awa Sissao en concert', from: 'Thierry', when: '12 nov. 2025', status: 'Non utilisé', image: PHOTO },
  { id: 'r2', title: 'Affiche manquante', from: 'Awa', when: '2 oct. 2025', status: 'Utilisé', image: '' },
];

function Frame({ active, title, children }: { active: string; title: string; children: ReactNode }) {
  return (
    <AccountShell name={NAME} phone={PHONE} active={active} counts={{ tickets: 2, orders: 3, received: 2, sent: 1 }}>
      <h1 className="font-display text-[32px] font-bold tracking-tight">{title}</h1>
      <div className="mt-6">{children}</div>
    </AccountShell>
  );
}

export default function AccountPreview() {
  const [params] = useSearchParams();
  const vue = params.get('vue') || 'dashboard';
  const [modal, setModal] = useState(params.get('modal') === '1');
  const note = useMemo(() => 'Aperçu local · données d’exemple · cette page n’est pas publiée.', []);

  let body: ReactNode = null;

  if (vue === 'dashboard' || vue === 'vide' || vue === 'erreur' || vue === 'chargement') {
    if (vue === 'chargement') {
      body = (
        <AccountShell name={NAME} phone={PHONE} active="dashboard">
          <p className="text-[15px] text-ink-2">Chargement de votre tableau de bord…</p>
        </AccountShell>
      );
    } else if (vue === 'erreur') {
      body = (
        <AccountShell name={NAME} phone={PHONE} active="dashboard">
          <h1 className="font-display text-[32px] font-bold">Tableau de bord indisponible</h1>
          <p className="mt-2 text-[15px] text-ink-2">Nous n’avons pas pu charger vos données. Vérifiez votre connexion puis réessayez.</p>
          <button type="button" className="btn btn-primary mt-5 h-11 px-5">Réessayer</button>
        </AccountShell>
      );
    } else if (vue === 'vide') {
      body = (
        <DashboardView
          name={NAME}
          phone={PHONE}
          upcomingCount={0}
          pastCount={16}
          orderCount={3}
          nextEvent={null}
          passes={[]}
          orders={orders}
          showcase={showcase}
          received={received}
          credits={{ balance: 500, currency: 'XOF' }}
          needsEmail
        />
      );
    } else {
      body = (
        <DashboardView
          name={NAME}
          phone={PHONE}
          upcomingCount={2}
          pastCount={16}
          orderCount={22}
          nextEvent={{
            id: 'awa',
            title: 'Awa Sissao en concert',
            date: '2026-12-18',
            time: '19:00',
            location: 'Place de la Nation',
            city: 'Ouagadougou',
            image_url: PHOTO,
            slug: 'awa',
            ticketCount: 2,
            categories: ['VIP', 'Standard'],
          }}
          passes={passes}
          orders={orders}
          showcase={[]}
          received={received}
          credits={{ balance: 500, currency: 'XOF' }}
          needsEmail
        />
      );
    }
  } else if (vue === 'profil') {
    body = (
      <Frame active="profil" title="Informations du profil">
        <form className="grid max-w-xl gap-4">
          <label className="text-[13px] font-semibold">Nom complet
            <input className="mt-1 h-11 w-full rounded-lg border border-line px-3" defaultValue="Aristide Ouédraogo" readOnly />
          </label>
          <label className="text-[13px] font-semibold">Téléphone
            <input className="mt-1 h-11 w-full rounded-lg border border-line px-3" defaultValue={PHONE} readOnly />
          </label>
          <label className="text-[13px] font-semibold">E-mail
            <input className="mt-1 h-11 w-full rounded-lg border border-line px-3" placeholder="Ajouter un e-mail" readOnly />
          </label>
          <button type="button" className="btn btn-primary h-11 w-fit px-4">Modifier</button>
        </form>
      </Frame>
    );
  } else if (vue === 'billets' || vue === 'passes' || vue === 'billets-vide') {
    const rows = vue === 'billets-vide' ? [] : vue === 'passes'
      ? [{ title: 'Concert déjà passé', date: '12 oct. 2025', state: 'Événement terminé' }]
      : [{ title: 'Awa Sissao en concert', date: '18 déc. 2026', state: 'Valide' }];
    body = (
      <Frame active="billets" title={vue === 'passes' ? 'Billets passés' : 'Mes billets'}>
        {rows.length === 0 ? (
          <p className="text-[15px] text-ink-2">Aucun billet à venir. Les événements passés restent dans l’onglet Passés.</p>
        ) : rows.map((row) => (
          <button key={row.title} type="button" onClick={() => setModal(true)} className="flex w-full items-center gap-3 rounded-2xl border border-line p-3 text-left">
            <PosterTile src={vue === 'passes' ? '' : PHOTO} alt="" className="h-20 w-20 rounded-lg" />
            <span>
              <span className="block font-display text-[18px] font-bold">{row.title}</span>
              <span className="text-[14px] text-ink-2">{row.date} · {row.state}</span>
            </span>
          </button>
        ))}
      </Frame>
    );
  } else if (vue === 'reservations') {
    body = (
      <Frame active="reservations" title="Historique des réservations">
        {orders.map((order) => (
          <div key={order.id} className="flex items-center gap-3 border-b border-line py-3">
            <PosterTile src={order.image} alt="" className="h-12 w-12 rounded-lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{order.eventName}</p>
              <p className="text-[13px] text-ink-3">Événement le {order.date} · Commandé le 2 nov. 2026</p>
            </div>
            <span className="text-[14px] font-semibold">{order.total <= 0 ? 'Gratuit' : `${order.total.toLocaleString('fr-FR')} FCFA`}</span>
          </div>
        ))}
      </Frame>
    );
  } else if (vue === 'recus' || vue === 'envoyes') {
    body = (
      <Frame active={vue} title={vue === 'recus' ? 'Billets reçus' : 'Billets envoyés'}>
        {received.map((item) => (
          <div key={item.id} className="mb-3 flex items-center gap-3 rounded-2xl border border-line p-3">
            <PosterTile src={item.image} alt="" className="h-16 w-16 rounded-lg" />
            <div>
              <p className="font-semibold">{item.title}</p>
              <p className="text-[13px] text-ink-3">{vue === 'recus' ? `De ${item.from}` : 'À Awa'} · {item.when} · {item.status}</p>
            </div>
          </div>
        ))}
      </Frame>
    );
  } else if (vue === 'notifications') {
    body = (
      <Frame active="notifications" title="Notifications">
        <p className="text-[15px] text-ink-2">Choisissez ce que Temba vous envoie. Rien n’est activé tant que vous ne le demandez pas.</p>
        {['Billets et commandes', 'Rappels avant l’événement', 'Offres des organisateurs'].map((label) => (
          <label key={label} className="mt-3 flex items-center justify-between rounded-xl border border-line px-4 py-3 text-[15px]">
            {label}
            <input type="checkbox" defaultChecked={label.startsWith('Billets')} />
          </label>
        ))}
      </Frame>
    );
  } else if (vue === 'paiements') {
    body = (
      <Frame active="paiements" title="Méthodes de paiement">
        <p className="text-[15px] text-ink-2">Aucune carte enregistrée. Orange Money et Moov Money se saisissent au moment du paiement.</p>
      </Frame>
    );
  } else if (vue === 'parrainage') {
    body = (
      <Frame active="parrainage" title="Référer et gagner">
        <p className="text-[15px] text-ink-2">Partagez votre code. Les crédits apparaissent ici dès qu’un proche achète avec.</p>
        <p className="mt-4 font-mono text-[20px]">TEMBA-EXEMPLE <span className="text-[13px] text-ink-3">(exemple)</span></p>
        <p className="mt-2 font-display text-[28px] font-bold text-[#9A6400]">500 FCFA</p>
      </Frame>
    );
  } else if (vue === 'parametres') {
    body = (
      <Frame active="parametres" title="Paramètres">
        <p className="text-[15px] text-ink-2">Mot de passe, langue et sécurité du compte.</p>
        <p className="mt-4 rounded-xl border border-line px-4 py-3 text-[14px]">Double authentification · Bientôt disponible</p>
      </Frame>
    );
  } else if (vue === 'supprimer') {
    body = (
      <Frame active="supprimer" title="Supprimer mon compte">
        <p className="max-w-xl text-[15px] leading-relaxed text-ink-2">La suppression est définitive. Tapez SUPPRIMER dans les paramètres pour confirmer. Vous êtes déjà connecté.</p>
        <Link to="/profile/settings" className="btn btn-secondary mt-4 inline-flex h-11 items-center px-4">Aller aux paramètres</Link>
      </Frame>
    );
  } else {
    body = (
      <AccountShell name={NAME} phone={PHONE} active="dashboard">
        <p>Vue inconnue.</p>
      </AccountShell>
    );
  }

  return (
    <div className="bg-white">
      <PageSEO title="Aperçu compte" description={note} robots="noindex, nofollow" />
      <p className="bg-surf px-4 py-2 text-center text-[12px] text-ink-3">{note}</p>
      {body}
      {modal && (
        <FullscreenBackdrop onClose={() => setModal(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <TicketPass
              eventTitle="Awa Sissao en concert"
              eventDate="2026-12-18"
              eventTime="19:00"
              venue="Place de la Nation"
              city="Ouagadougou"
              holder={NAME}
              categoryName="VIP"
              price={15000}
              qrValue="exemple-billet"
              ticketCode="EX-MK-0001"
              state={vue === 'valide' ? 'scanned' : 'valid'}
              layout="web"
            />
          </div>
        </FullscreenBackdrop>
      )}
    </div>
  );
}
