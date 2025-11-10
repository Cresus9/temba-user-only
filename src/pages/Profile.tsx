import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { User, Ticket, Bell, CreditCard, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/TranslationContext';
import ProfileInfo from '../components/profile/ProfileInfo';
import BookingHistory from '../components/profile/BookingHistory';
import Notifications from '../components/profile/Notifications';
import PaymentMethods from '../components/profile/PaymentMethods';
import AccountSettings from '../components/profile/AccountSettings';
import TransferredTicketsList from '../components/tickets/TransferredTicketsList';
import SentTicketsList from '../components/tickets/SentTicketsList';
import MyTickets from '../components/profile/MyTickets';
import { formatPhoneForDisplay } from '../utils/phoneValidation';

export default function Profile() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Get display name: prefer profile name, fallback to phone or email
  const displayName = profile?.name || 
                     (profile?.phone ? formatPhoneForDisplay(profile.phone) : null) ||
                     profile?.email?.split('@')[0] ||
                     user?.email?.split('@')[0] ||
                     'Utilisateur';
  
  // Get display identifier: prefer phone if available, otherwise email
  const displayIdentifier = profile?.phone ? formatPhoneForDisplay(profile.phone) : (profile?.email || user?.email || '');
  
  // Get avatar initial: from name first letter, or phone/email first character
  const avatarInitial = profile?.name?.[0]?.toUpperCase() || 
                        profile?.phone?.[1]?.toUpperCase() || // + sign, so use second char
                        displayIdentifier[0]?.toUpperCase() || 
                        'U';

  const navigationSections = [
    {
      title: null,
      items: [
        { name: t('profile.menu.profile_info', { default: 'Informations du Profil' }), path: '/profile', icon: User },
      ],
    },
    {
      title: t('profile.menu.section_tickets', { default: 'Billets' }),
      items: [
        { name: 'Mes Billets', path: '/profile/my-tickets', icon: Ticket },
        { name: t('profile.menu.booking_history', { default: 'Historique des Réservations' }), path: '/profile/bookings', icon: Ticket },
      ],
    },
    {
      title: t('profile.menu.section_transfers', { default: 'Transferts' }),
      items: [
        { name: t('profile.menu.transferred_tickets', { default: 'Billets Reçus' }), path: '/profile/transfers', icon: Ticket },
        { name: t('profile.menu.sent_tickets', { default: 'Billets Envoyés' }), path: '/profile/sent', icon: Ticket },
      ],
    },
    {
      title: t('profile.menu.section_account', { default: 'Compte' }),
      items: [
        { name: t('profile.menu.notifications', { default: 'Notifications' }), path: '/profile/notifications', icon: Bell },
        { name: t('profile.menu.payment_methods', { default: 'Méthodes de Paiement' }), path: '/profile/payments', icon: CreditCard },
        { name: t('profile.menu.account_settings', { default: 'Paramètres du Compte' }), path: '/profile/settings', icon: Settings },
      ],
    },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-indigo-600">
                {avatarInitial}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{displayName}</h2>
              <p className="text-sm text-gray-600">
                {displayIdentifier !== displayName && (
                  <span className="block mb-1">{displayIdentifier}</span>
                )}
                {t('profile.menu.member_since', { 
                  year: new Date(user?.created_at || '').getFullYear(),
                  default: `Membre depuis ${new Date(user?.created_at || '').getFullYear()}`
                })}
              </p>
            </div>
          </div>

          <nav className="space-y-6">
            {navigationSections.map((section, index) => (
              <div key={section.title ?? `section-${index}`}>
                {section.title && (
                  <p className="px-4 mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {section.title}
                  </p>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.name}
                        to={item.path}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-600'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-5 w-5" />
              {t('profile.menu.sign_out', { default: 'Déconnexion' })}
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-[600px] bg-white rounded-xl shadow-sm p-6">
          <Routes>
            <Route path="/" element={<ProfileInfo />} />
            <Route path="/my-tickets" element={<MyTickets />} />
            <Route path="/bookings" element={<BookingHistory />} />
            <Route path="/transfers" element={<TransferredTicketsList />} />
            <Route path="/sent" element={<SentTicketsList />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/payments" element={<PaymentMethods />} />
            <Route path="/settings" element={<AccountSettings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}