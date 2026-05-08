import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Mail, MapPin, Phone, MessageSquare, ArrowUpRight } from 'lucide-react';
import NewsletterForm from './NewsletterForm';
import Logo from './brand/Logo';

export default function Footer() {
  const year = new Date().getFullYear();

  const linkCls =
    'text-[13px] text-paper/65 hover:text-paper transition-colors duration-200 inline-flex items-center gap-1.5';
  const socialCls =
    'w-9 h-9 grid place-items-center rounded-lg bg-paper/[0.06] text-paper/70 hover:text-paper hover:bg-brand transition-all duration-200';

  const cities = [
    'Ouagadougou',
    'Bobo-Dioulasso',
    'Abidjan',
    'Dakar',
    'Lomé',
    'Cotonou',
    'Niamey',
    'Bamako',
  ];

  return (
    <footer className="relative bg-ink text-paper overflow-hidden">
      {/* Soft brand glow — single, off-center */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full blur-3xl opacity-50"
        style={{ background: 'radial-gradient(circle, rgba(77,79,230,0.32) 0%, transparent 70%)' }}
      />

      {/* — — — TOP: brand row — — — */}
      <div className="relative max-w-7xl mx-auto px-4 lg:px-6 pt-10 pb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-xl">
            <Logo variant="light" size={30} className="mb-3" />
            <p className="text-[14px] text-paper/65 leading-relaxed">
              Une billetterie née à{' '}
              <span className="relative inline-block">
                <span className="relative z-10 font-semibold text-paper">Ouagadougou</span>
                <span aria-hidden className="absolute left-0 right-0 bottom-0 h-1.5 bg-brand/45 -z-0 rounded-sm" />
              </span>
              , pensée pour l'
              <span className="relative inline-block">
                <span className="relative z-10 font-semibold text-paper">Afrique de l'Ouest</span>
                <span aria-hidden className="absolute left-0 right-0 bottom-0 h-1.5 bg-accent/45 -z-0 rounded-sm" />
              </span>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://facebook.com/profile.php?id=61586573277748"
              target="_blank"
              rel="noopener noreferrer"
              className={socialCls}
              aria-label="Facebook"
            >
              <Facebook className="h-[16px] w-[16px]" />
            </a>
            <a
              href="https://www.instagram.com/temba_officiel/"
              target="_blank"
              rel="noopener noreferrer"
              className={socialCls}
              aria-label="Instagram"
            >
              <Instagram className="h-[16px] w-[16px]" />
            </a>
            <a
              href="https://tiktok.com/@temba_official7"
              target="_blank"
              rel="noopener noreferrer"
              className={socialCls}
              aria-label="TikTok"
            >
              <svg className="h-[16px] w-[16px]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* — — — Perforation divider — — — */}
      <div className="relative max-w-7xl mx-auto px-4 lg:px-6">
        <div aria-hidden className="flex items-center gap-1.5 overflow-hidden">
          {Array.from({ length: 80 }).map((_, i) => (
            <span key={i} className="w-1 h-1 rounded-full bg-paper/15 flex-shrink-0" />
          ))}
        </div>
      </div>

      {/* — — — MIDDLE: 4 columns — — — */}
      <div className="relative max-w-7xl mx-auto px-4 lg:px-6 py-8 lg:py-10">
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-x-6 gap-y-8">
          <div className="lg:col-span-3">
            <p className="eyebrow !text-paper/45 mb-3.5">Explorer</p>
            <ul className="space-y-2">
              <li><Link to="/events" className={linkCls}>Événements</Link></li>
              <li><Link to="/categories" className={linkCls}>Catégories</Link></li>
              <li><Link to="/blog" className={linkCls}>Blog</Link></li>
              <li><Link to="/about" className={linkCls}>À propos</Link></li>
              <li>
                <a
                  href="https://admin.tembas.com/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkCls}
                >
                  Devenir organisateur
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <p className="eyebrow !text-paper/45 mb-3.5">Aide</p>
            <ul className="space-y-2">
              <li>
                <Link to="/support" className={linkCls}>
                  <MessageSquare className="h-3.5 w-3.5" />
                  Centre d'aide
                </Link>
              </li>
              <li><Link to="/contact" className={linkCls}>Contact</Link></li>
              <li><Link to="/terms" className={linkCls}>Conditions</Link></li>
              <li><Link to="/privacy" className={linkCls}>Confidentialité</Link></li>
              <li><Link to="/cookies" className={linkCls}>Cookies</Link></li>
            </ul>
          </div>

          <div className="col-span-2 lg:col-span-3">
            <p className="eyebrow !text-paper/45 mb-3.5">Bureau</p>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2 text-[13px] text-paper/65 leading-relaxed">
                <MapPin className="h-3.5 w-3.5 text-accent flex-shrink-0 mt-0.5" />
                <span>Zone 1, Section KC, Parcelle 09-10<br />Ouagadougou, Burkina Faso</span>
              </li>
              <li className="flex items-center gap-2 text-[13px] text-paper/65">
                <Phone className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                <a
                  href="tel:+22674750815"
                  className="hover:text-paper transition-colors tabular-nums"
                  style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                >
                  +226 74 75 08 15
                </a>
              </li>
              <li className="flex items-center gap-2 text-[13px] text-paper/65">
                <Mail className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                <a href="mailto:info@tembas.com" className="hover:text-paper transition-colors">
                  info@tembas.com
                </a>
              </li>
            </ul>
          </div>

          <div className="col-span-2 lg:col-span-4">
            <p className="eyebrow !text-paper/45 mb-3.5">Newsletter</p>
            <p className="text-[13px] text-paper/65 mb-3 leading-relaxed">
              Les meilleurs événements, une fois par semaine — promis, sans spam.
            </p>
            <NewsletterForm />
          </div>
        </div>
      </div>

      {/* — — — Bottom strip: cities + legal — — — */}
      <div className="relative border-t border-paper/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-5">
          {/* Cities */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
            <p className="eyebrow !text-paper/45 flex-shrink-0">Présent à</p>
            <p className="text-[12px] text-paper/55 leading-relaxed">
              {cities.map((city, i) => (
                <span key={city}>
                  <span className={i === 0 ? 'text-paper/90 font-semibold' : ''}>{city}</span>
                  {i < cities.length - 1 && (
                    <span aria-hidden className="mx-1.5 text-paper/25">·</span>
                  )}
                </span>
              ))}
            </p>
          </div>

          {/* Legal */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 pt-4 border-t border-paper/[0.06]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-3 text-[11px] text-paper/40">
              <p>© {year} Temba · EZSTAY LLC</p>
              <span aria-hidden className="hidden sm:inline opacity-40">·</span>
              <p>Conçu en Afrique de l'Ouest</p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              <Link to="/terms" className="text-[11px] text-paper/40 hover:text-paper transition-colors">Conditions</Link>
              <Link to="/privacy" className="text-[11px] text-paper/40 hover:text-paper transition-colors">Confidentialité</Link>
              <Link to="/cookies" className="text-[11px] text-paper/40 hover:text-paper transition-colors">Cookies</Link>
              <Link to="/account-deletion" className="text-[11px] text-paper/40 hover:text-paper transition-colors">Supprimer le compte</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
