import { Link } from 'react-router-dom';
import {
  FacebookLogo,
  InstagramLogo,
  Plus,
  TiktokLogo,
  WhatsappLogo,
} from '@phosphor-icons/react';
import { useState } from 'react';
import Logo from './brand/Logo';
import StoreBadges from './design/StoreBadges';

const EXPLORE = [
  { label: 'Événements', href: '/events' },
  { label: 'Artistes', href: '/artists' },
  { label: 'Lieux', href: '/venues' },
  { label: 'Catégories', href: '/categories' },
  { label: 'Attractions', href: '/attractions' },
  { label: 'Blog', href: '/blog' },
];

const HELP = [
  { label: 'Centre d’aide', href: '/support' },
  { label: 'Retrouver mes billets', href: '/find-tickets' },
  { label: 'Contact', href: '/contact' },
  { label: 'WhatsApp 7j/7', href: 'https://wa.me/22674750815' },
];

const TEMBA = [
  { label: 'À propos', href: '/about' },
  { label: 'Organisateurs', href: '/organizers' },
  { label: 'Conditions', href: '/terms' },
  { label: 'Confidentialité', href: '/privacy' },
  { label: 'Cookies', href: '/cookies' },
];

function Col({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h5 className="mb-3.5 text-[13px] font-semibold text-white/55">{title}</h5>
      {links.map((link) =>
        link.href.startsWith('http') ? (
          <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="block py-1 text-[14.5px] text-white/90">
            {link.label}
          </a>
        ) : (
          <Link key={link.label} to={link.href} className="block py-1 text-[14.5px] text-white/90">
            {link.label}
          </Link>
        ),
      )}
    </div>
  );
}

function MobileGroup({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-white/15">
      <button type="button" className="flex h-[52px] w-full items-center justify-between text-[15px] font-medium" onClick={() => setOpen((v) => !v)}>
        {title}
        <Plus size={18} className={`opacity-60 transition-transform ${open ? 'rotate-45' : ''}`} />
      </button>
      {open && (
        <div className="pb-3">
          {links.map((link) =>
            link.href.startsWith('http') ? (
              <a key={link.label} href={link.href} className="block py-1.5 text-[14px] text-white/80" target="_blank" rel="noopener noreferrer">{link.label}</a>
            ) : (
              <Link key={link.label} to={link.href} className="block py-1.5 text-[14px] text-white/80">{link.label}</Link>
            ),
          )}
        </div>
      )}
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto hidden w-full px-5 pb-8 pt-16 min-[1280px]:px-16 min-[1440px]:px-20 lg:block">
        <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1.3fr] gap-10">
          <div>
            <Logo variant="light" size={26} />
            <p className="mt-4 max-w-[300px] text-[14.5px] leading-relaxed text-white/70">
              La billetterie officielle née à Ouagadougou. Billets vendus par les organisateurs, au prix officiel, payés en FCFA.
            </p>
            <div className="mt-[18px] flex items-center gap-4">
              <a href="https://www.instagram.com/temba_officiel/" aria-label="Instagram" target="_blank" rel="noopener noreferrer"><InstagramLogo size={22} /></a>
              <a href="https://facebook.com/profile.php?id=61586573277748" aria-label="Facebook" target="_blank" rel="noopener noreferrer"><FacebookLogo size={22} /></a>
              <a href="https://tiktok.com/@temba_official7" aria-label="TikTok" target="_blank" rel="noopener noreferrer"><TiktokLogo size={22} /></a>
              <a href="https://wa.me/22674750815" aria-label="WhatsApp" target="_blank" rel="noopener noreferrer"><WhatsappLogo size={22} /></a>
            </div>
          </div>
          <Col title="Explorer" links={EXPLORE} />
          <Col title="Aide" links={HELP} />
          <Col title="Temba" links={TEMBA} />
          <div>
            <h5 className="mb-3.5 text-[13px] font-semibold text-white/55">L'application</h5>
            <p className="mb-3.5 text-[14px] leading-relaxed text-white/70">Vos billets hors ligne, le transfert en deux taps.</p>
            <StoreBadges stacked />
          </div>
        </div>
        <div className="mt-12 flex items-start justify-between gap-6 border-t border-white/15 pt-6 text-[13px] text-white/55">
          <span>© {new Date().getFullYear()} Temba · EZSTAY LLC · Zone 1, Section KC, Parcelle 09-10, Ouagadougou · +226 74 75 08 15 · support@tembas.com</span>
          <span className="shrink-0">Français · FCFA</span>
        </div>
      </div>

      <div className="px-5 pb-8 pt-10 lg:hidden">
        <Logo variant="light" size={24} />
        <p className="mb-5 mt-3.5 text-[14px] leading-relaxed text-white/70">
          La billetterie officielle née à Ouagadougou. Payée en FCFA.
        </p>
        <StoreBadges />
        <div className="mt-7">
          <MobileGroup title="Explorer" links={EXPLORE} />
          <MobileGroup title="Aide" links={HELP} />
          <MobileGroup title="Temba" links={TEMBA} />
        </div>
        <div className="mt-5 flex gap-5">
          <a href="https://www.instagram.com/temba_officiel/" aria-label="Instagram"><InstagramLogo size={22} /></a>
          <a href="https://facebook.com/profile.php?id=61586573277748" aria-label="Facebook"><FacebookLogo size={22} /></a>
          <a href="https://tiktok.com/@temba_official7" aria-label="TikTok"><TiktokLogo size={22} /></a>
          <a href="https://wa.me/22674750815" aria-label="WhatsApp"><WhatsappLogo size={22} /></a>
        </div>
        <p className="mt-6 text-[12.5px] leading-relaxed text-white/50">
          © {new Date().getFullYear()} Temba · EZSTAY LLC<br />
          +226 74 75 08 15 · support@tembas.com
        </p>
      </div>
    </footer>
  );
}
