import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  CaretDown,
  List,
  MagnifyingGlass,
  Ticket,
  X,
} from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import NotificationBell from './NotificationBell';
import Logo from './brand/Logo';

const NAV = [
  { label: 'Événements', to: '/events' },
  { label: 'Artistes', to: '/artists' },
  { label: 'Lieux', to: '/venues' },
  { label: 'Organisateurs', to: '/organizers' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { profile, isAuthenticated, logout } = useAuth();
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

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
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
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('query', query.trim());
    navigate(`/events${params.toString() ? `?${params}` : ''}`);
    setIsOpen(false);
  };

  const ticketsTo = isAuthenticated ? '/profile/my-tickets' : '/find-tickets';
  const immersive = location.pathname === '/' || location.pathname === '/organizers';
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const onDark = immersive && !scrolled;
  const logoVariant = onDark ? 'onBlue' : 'auto';

  return (
    <header className={`sticky top-0 z-50 border-b ${onDark ? 'border-transparent bg-transparent text-white' : 'border-line bg-white text-ink'}`}>
      <div className="mx-auto hidden h-[72px] max-w-[1200px] items-center gap-8 px-6 lg:flex xl:px-10">
        <Link to="/" aria-label="Temba — accueil" className="shrink-0">
          <Logo variant={logoVariant} size={26} />
        </Link>
        <nav className={`flex h-full items-center gap-6 text-[15px] font-medium ${onDark ? 'text-white/80' : 'text-ink-2'}`}>
          {NAV.map((item) => {
            const on = sectionActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`inline-flex h-full items-center ${on ? (onDark ? 'font-semibold text-white shadow-[inset_0_-2px_0_#fff]' : 'font-semibold text-ink shadow-[inset_0_-2px_0_#03061E]') : onDark ? 'hover:text-white' : 'hover:text-ink'}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form onSubmit={onSearch} className={`ml-auto flex h-10 w-[280px] items-center gap-2 rounded-lg px-3 text-[14px] ${onDark ? 'bg-white/12 text-white/70' : 'bg-surf text-ink-4'}`}>
          <MagnifyingGlass size={18} className="shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un événement"
            aria-label="Rechercher un événement"
            className={`w-full bg-transparent focus:outline-none ${onDark ? 'text-white placeholder:text-white/60' : 'text-ink placeholder:text-ink-4'}`}
          />
        </form>
        <Link to={ticketsTo} className="inline-flex items-center gap-1.5 whitespace-nowrap text-[15px] font-medium">
          <Ticket size={18} />
          Mes billets
        </Link>
        {isAuthenticated ? (
          <div className="flex items-center gap-3" ref={dropdownRef}>
            <NotificationBell />
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg px-1 text-[14px] font-semibold text-ink"
            >
              <span className="max-w-[120px] truncate">{profile?.name || 'Mon compte'}</span>
              <CaretDown size={14} />
            </button>
            {dropdownOpen && (
              <div className="absolute right-6 top-[64px] z-50 w-56 overflow-hidden rounded-xl border border-line bg-white py-1.5 shadow-[0_12px_32px_rgba(3,6,30,0.12)] xl:right-10">
                <Link to="/dashboard" className="block px-4 py-2.5 text-[14px] hover:bg-surf" onClick={() => setDropdownOpen(false)}>Tableau de bord</Link>
                <Link to="/profile/my-tickets" className="block px-4 py-2.5 text-[14px] hover:bg-surf" onClick={() => setDropdownOpen(false)}>Mes billets</Link>
                <Link to="/support" className="block px-4 py-2.5 text-[14px] hover:bg-surf" onClick={() => setDropdownOpen(false)}>Aide</Link>
                <button type="button" onClick={handleLogout} className="block w-full px-4 py-2.5 text-left text-[14px] text-[#C42B25] hover:bg-surf">
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" className={`inline-flex h-10 items-center rounded-lg px-3.5 text-[14px] font-semibold ${onDark ? 'bg-white text-ink' : 'bg-ink text-white'}`}>
            Se connecter
          </Link>
        )}
      </div>

      <div className="flex h-14 items-center justify-between px-5 lg:hidden">
        <Link to="/" aria-label="Temba — accueil">
          <Logo variant={logoVariant} size={22} />
        </Link>
        <div className="flex">
          <Link to="/events" className="grid h-11 w-11 place-items-center rounded-lg" aria-label="Rechercher">
            <MagnifyingGlass size={24} />
          </Link>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-lg"
            aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setIsOpen((v) => !v)}
          >
            {isOpen ? <X size={24} /> : <List size={24} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-line bg-white px-5 py-2 lg:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex h-[52px] items-center border-b border-line text-[15px] font-medium"
            >
              {item.label}
            </Link>
          ))}
          <Link to="/attractions" className="flex h-[52px] items-center border-b border-line text-[15px] font-medium">Attractions</Link>
          <Link to={ticketsTo} className="flex h-[52px] items-center border-b border-line text-[15px] font-medium">Mes billets</Link>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="flex h-[52px] items-center text-[15px] font-medium">Tableau de bord</Link>
              <button type="button" onClick={handleLogout} className="flex h-[52px] items-center text-[15px] font-medium text-[#C42B25]">
                Déconnexion
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary my-3 w-full">Se connecter</Link>
          )}
        </div>
      )}
    </header>
  );
}
