import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Menu, X, MessageSquare, Ticket } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/TranslationContext';
import toast from 'react-hot-toast';
import NotificationBell from './NotificationBell';
import GlobalCartIndicator from './GlobalCartIndicator';
import GlobalFloatingCart from './GlobalFloatingCart';
import Logo from './brand/Logo';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isGlobalCartOpen, setIsGlobalCartOpen] = useState(false);
  const { user, profile, isAuthenticated, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  const navLinkBase =
    'text-[14px] font-medium text-ink-mute hover:text-brand transition-colors duration-200';

  return (
    <nav className="bg-paper/90 backdrop-blur-md border-b border-line sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" aria-label="Temba — accueil" className="flex items-center group">
            <Logo size={28} />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className={navLinkBase}>Accueil</Link>
            <Link to="/events" className={navLinkBase}>Événements</Link>
            <a
              href="https://admin.tembas.com/login"
              target="_blank"
              rel="noopener noreferrer"
              className={navLinkBase}
            >
              Devenir organisateur
            </a>

            {isAuthenticated ? (
              <div className="flex items-center gap-4 pl-4 border-l border-line">
                {/* TEMPORARILY HIDDEN: Cart feature - Payment system stabilization */}
                {/* <GlobalCartIndicator onClick={() => setIsGlobalCartOpen(true)} /> */}
                <NotificationBell />
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 text-[14px] font-medium text-ink-mute hover:text-brand focus:outline-none transition-colors"
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
              <div className="flex items-center gap-3 pl-4 border-l border-line">
                <Link to="/login" className={navLinkBase}>
                  Se connecter
                </Link>
                <Link to="/signup" className="btn btn-primary btn-sm">
                  S'inscrire
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu */}
          <div className="md:hidden flex items-center gap-2">
            {/* TEMPORARILY HIDDEN: Cart feature - Payment system stabilization */}
            {/* <GlobalCartIndicator onClick={() => setIsGlobalCartOpen(true)} /> */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-lg p-2 hover:bg-cream focus:outline-none transition-colors"
              aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {isOpen ? (
                <X className="h-5 w-5 text-ink" />
              ) : (
                <Menu className="h-5 w-5 text-ink" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-3 space-y-1 border-t border-line">
            <Link to="/" className="block px-2 py-3 text-[15px] text-ink hover:bg-cream rounded-lg" onClick={() => setIsOpen(false)}>
              Accueil
            </Link>
            <Link to="/events" className="block px-2 py-3 text-[15px] text-ink hover:bg-cream rounded-lg" onClick={() => setIsOpen(false)}>
              Événements
            </Link>
            <a
              href="https://admin.tembas.com/login"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-2 py-3 text-[15px] text-ink hover:bg-cream rounded-lg"
              onClick={() => setIsOpen(false)}
            >
              Devenir organisateur
            </a>

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