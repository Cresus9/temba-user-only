import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Menu, X, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/TranslationContext';
import toast from 'react-hot-toast';
import NotificationBell from './NotificationBell';
import GlobalCartIndicator from './GlobalCartIndicator';
import GlobalFloatingCart from './GlobalFloatingCart';

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

  return (
    <nav className="bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src="/logo.svg" alt="Temba Logo" className="h-8 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/events" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
              Événements
            </Link>
            <Link to="/categories" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
              Catégories
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <GlobalCartIndicator onClick={() => setIsGlobalCartOpen(true)} />
                <NotificationBell />
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center space-x-1 text-gray-600 hover:text-indigo-600 focus:outline-none transition-colors"
                  >
                    <User className="h-5 w-5" />
                    <span>{profile?.name || 'Mon compte'}</span>
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                      <Link
                        to="/dashboard"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Tableau de bord
                      </Link>
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Profil
                      </Link>
                      <Link
                        to="/support"
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Support
                        </div>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-50 transition-colors"
                      >
                        Déconnexion
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-indigo-600 transition-colors font-medium"
                >
                  Se connecter
                </Link>
                <Link
                  to="/signup"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  S'inscrire
                </Link>
              </div>
            )}
          </div>

          {/* Mobile cart and menu buttons */}
          <div className="md:hidden flex items-center space-x-2">
            <GlobalCartIndicator onClick={() => setIsGlobalCartOpen(true)} />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-lg p-2 hover:bg-gray-100 focus:outline-none transition-colors"
            >
              {isOpen ? (
                <X className="h-6 w-6 text-gray-600" />
              ) : (
                <Menu className="h-6 w-6 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 space-y-4">
            <Link
              to="/events"
              className="block text-gray-600 hover:text-indigo-600 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Événements
            </Link>
            <Link
              to="/categories"
              className="block text-gray-600 hover:text-indigo-600 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Catégories
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="block text-gray-600 hover:text-indigo-600 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Tableau de bord
                </Link>
                <Link
                  to="/profile"
                  className="block text-gray-600 hover:text-indigo-600 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Profil
                </Link>
                <Link
                  to="/support"
                  className="block text-gray-600 hover:text-indigo-600 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Support
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left text-red-600 hover:text-red-700 transition-colors"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <Link
                  to="/login"
                  className="block text-gray-600 hover:text-indigo-600 transition-colors font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  Se connecter
                </Link>
                <Link
                  to="/signup"
                  className="block bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-center"
                  onClick={() => setIsOpen(false)}
                >
                  S'inscrire
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Global Floating Cart */}
      <GlobalFloatingCart
        isOpen={isGlobalCartOpen}
        onClose={() => setIsGlobalCartOpen(false)}
      />
    </nav>
  );
}