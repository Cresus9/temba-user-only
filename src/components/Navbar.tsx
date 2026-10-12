import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, Menu, X, MessageSquare, Ticket } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/TranslationContext';
import toast from 'react-hot-toast';
import NotificationBell from './NotificationBell';
import GlobalCartIndicator from './GlobalCartIndicator';
import GlobalFloatingCart from './GlobalFloatingCart';
import Logo from './brand/Logo';
import CountryPicker from './nav/CountryPicker';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isGlobalCartOpen, setIsGlobalCartOpen] = useState(false);
  const { user, profile, isAuthenticated, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      
      // Clear all carts on logout for privacy
      localStorage.removeItem('temba_cart_selections');
      window.dispatchEvent(new Event('cartUpdated'));
      
      setDropdownOpen(false);
      setIsOpen(false);
      navigate('/login');
      toast.success('Déconnexion réussie');
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
      toast.error('Échec de la déconnexion');
    }
  };

  const sectionActive = (path: string) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const sectionClass = (active: boolean) =>
    `relative inline-flex h-full items-center text-[13px] font-medium tracking-[0.01em] transition-colors ${
      active ? 'text-brand' : 'text-ink hover:text-brand'
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-ink/15 bg-paper">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid h-[72px] grid-cols-[minmax(0,1fr)_auto] items-center md:grid-cols-[auto_minmax(0,1fr)_auto]">
          <Link to="/" aria-label="Temba — accueil" className="justify-self-start">
            <Logo size={34} />
          </Link>

          <div className="hidden h-full items-center justify-center gap-6 md:flex lg:gap-8">
            <Link to="/" className={sectionClass(sectionActive('/'))}>
              Accueil
              {sectionActive('/') ? <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-brand" /> : null}
            </Link>
            <Link to="/events" className={sectionClass(sectionActive('/events'))}>
              Événements
              {sectionActive('/events') ? <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-brand" /> : null}
            </Link>
            <Link to="/attractions" className={sectionClass(sectionActive('/attractions'))}>
              Attractions
              {sectionActive('/attractions') ? <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-brand" /> : null}
            </Link>
            <a
              href="https://admin.tembas.com/login"
              target="_blank"
              rel="noopener noreferrer"
              className={`${sectionClass(false)} hidden lg:inline-flex`}
            >
              Devenir organisateur
            </a>
          </div>

          <div className="justify-self-end">
          <div className="hidden md:flex items-center gap-5">
            <CountryPicker variant="nav" />

            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                {/* TEMPORARILY HIDDEN: Cart feature - Payment system stabilization */}
                {/* <GlobalCartIndicator onClick={() => setIsGlobalCartOpen(true)} /> */}
                <NotificationBell />
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 text-[13px] font-medium text-ink hover:text-brand focus:outline-none transition-colors"
                  >
                    <span className="grid place-items-center w-8 h-8 rounded-full bg-brand-50 border border-brand/20 group-hover:border-brand transition-colors">
                      <User className="h-4 w-4 text-brand" />
                    </span>
                    <span className="max-w-[140px] truncate">{profile?.name || 'Mon compte'}</span>
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-paper rounded-xl2 shadow-pop border border-line py-1.5 z-50 overflow-hidden">
                      <Link
                        to="/dashboard"
                        className="block px-4 py-2.5 text-[14px] text-ink hover:bg-cream transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Tableau de bord
                      </Link>
                      <Link
                        to="/profile/my-tickets"
                        className="block px-4 py-2.5 text-[14px] text-ink hover:bg-cream transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <div className="flex items-center gap-2">
                          <Ticket className="h-4 w-4 text-ink-mute" />
                          Mes billets
                        </div>
                      </Link>
                      <Link
                        to="/support"
                        className="block px-4 py-2.5 text-[14px] text-ink hover:bg-cream transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-ink-mute" />
                          Support
                        </div>
                      </Link>
                      <div className="my-1 h-px bg-line" />
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2.5 text-[14px] text-red-600 hover:bg-cream transition-colors"
                      >
                        Déconnexion
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-5">
                <Link to="/find-tickets" className="text-[13px] font-medium text-ink hover:text-brand">
                  Mes billets
                </Link>
                <Link to="/login" className="text-[13px] font-medium text-ink hover:text-brand">
                  Se connecter
                </Link>
                <Link to="/signup" className="btn btn-primary btn-sm">
                  S'inscrire
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="grid h-10 w-10 place-items-center text-ink"
              aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
          </div>
        </div>

        {isOpen && (
          <div className="border-t border-ink/15 md:hidden">
            <Link to="/" className={`block border-b border-ink/10 py-3.5 text-[15px] ${sectionActive('/') ? 'text-brand' : 'text-ink'}`} onClick={() => setIsOpen(false)}>
              Accueil
            </Link>
            <Link to="/events" className={`block border-b border-ink/10 py-3.5 text-[15px] ${sectionActive('/events') ? 'text-brand' : 'text-ink'}`} onClick={() => setIsOpen(false)}>
              Événements
            </Link>
            <Link to="/attractions" className={`block border-b border-ink/10 py-3.5 text-[15px] ${sectionActive('/attractions') ? 'text-brand' : 'text-ink'}`} onClick={() => setIsOpen(false)}>
              Attractions
            </Link>
            <a
              href="https://admin.tembas.com/login"
              target="_blank"
              rel="noopener noreferrer"
              className="block border-b border-ink/10 py-3.5 text-[15px] text-ink"
              onClick={() => setIsOpen(false)}
            >
              Devenir organisateur
            </a>

            {/* Country picker — mobile pills */}
            <div className="py-2">
              <CountryPicker variant="mobile" onSelect={() => setIsOpen(false)} />
            </div>

            {isAuthenticated ? (
              <>
                <div className="my-2 h-px bg-line" />
                <Link to="/dashboard" className="block px-2 py-3 text-[15px] text-ink hover:bg-cream rounded-lg" onClick={() => setIsOpen(false)}>
                  Tableau de bord
                </Link>
                <Link to="/profile/my-tickets" className="block px-2 py-3 text-[15px] text-ink hover:bg-cream rounded-lg" onClick={() => setIsOpen(false)}>
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-ink-mute" />
                    Mes billets
                  </div>
                </Link>
                <Link to="/support" className="block px-2 py-3 text-[15px] text-ink hover:bg-cream rounded-lg" onClick={() => setIsOpen(false)}>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-ink-mute" />
                    Support
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-2 py-3 text-[15px] text-red-600 hover:bg-cream rounded-lg"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <div className="pt-3 mt-2 border-t border-line space-y-2">
                <Link
                  to="/find-tickets"
                  className="block px-2 py-3 text-[15px] text-ink hover:bg-cream rounded-lg"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-ink-mute" />
                    Mes billets
                  </div>
                </Link>
                <Link
                  to="/login"
                  className="btn btn-secondary w-full"
                  onClick={() => setIsOpen(false)}
                >
                  Se connecter
                </Link>
                <Link
                  to="/signup"
                  className="btn btn-primary w-full"
                  onClick={() => setIsOpen(false)}
                >
                  S'inscrire
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* TEMPORARILY HIDDEN: Cart feature - Payment system stabilization */}
      {/* Global Floating Cart */}
      {/* <GlobalFloatingCart
        isOpen={isGlobalCartOpen}
        onClose={() => setIsGlobalCartOpen(false)}
      /> */}
    </nav>
  );
}