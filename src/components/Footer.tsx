import { useNavigate } from 'react-router-dom';
import KilnWordmarkFooter from './ui/kiln-wordmark-footer';

const SURFACE = '#3D3FE2';
const DEEP = '#2A2CC4';
const INK = '#F3EEE6';

export default function Footer() {
  const navigate = useNavigate();

  return (
    <KilnWordmarkFooter
      brand="Temba"
      wordmark="temba"
      motto={['Découvrez.', 'Réservez. Profitez.']}
      address={[
        'Zone 1, Section KC',
        '↳ Parcelle 09-10',
        'Ouagadougou — Burkina Faso',
        '+226 74 75 08 15',
        'info@tembas.com',
      ]}
      navigationTitle="Navigation"
      navigation={[
        [
          { label: 'Événements', href: '/events' },
          { label: 'Attractions', href: '/attractions' },
          { label: 'Artistes', href: '/artists' },
        ],
        [
          { label: 'Catégories', href: '/categories' },
          { label: 'Blog', href: '/blog' },
          { label: 'À propos', href: '/about' },
        ],
        [
          { label: 'Aide', href: '/support' },
          { label: 'Billets', href: '/find-tickets' },
          { label: 'Contact', href: '/contact' },
        ],
        [
          { label: 'Organiser', href: 'https://admin.tembas.com/login' },
        ],
      ]}
      followTitle="Suivre"
      socials={[
        [
          { label: 'Facebook', href: 'https://facebook.com/profile.php?id=61586573277748' },
          { label: 'Instagram', href: 'https://www.instagram.com/temba_officiel/' },
        ],
        [
          { label: 'TikTok', href: 'https://tiktok.com/@temba_official7' },
        ],
      ]}
      year={new Date().getFullYear()}
      registry="EZSTAY LLC — Billetterie en FCFA"
      legal={[
        { label: 'Conditions', href: '/terms' },
        { label: 'Confidentialité', href: '/privacy' },
        { label: 'Cookies', href: '/cookies' },
        { label: 'Compte', href: '/account-deletion' },
      ]}
      surface={SURFACE}
      deep={DEEP}
      ink={INK}
      paper={DEEP}
      fontSans='"Plus Jakarta Sans", Inter, system-ui, sans-serif'
      weight={0.85}
      defaultTile={3}
      onLinkClick={(_label, href) => {
        if (!href || /^https?:\/\//i.test(href)) return;
        navigate(href);
      }}
    />
  );
}
