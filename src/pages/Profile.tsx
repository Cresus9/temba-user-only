import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { User, Ticket, Bell, CreditCard, Settings, LogOut, ClipboardList, Inbox, Send, Gift } from 'lucide-react';
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
import ReferralProgram from './profile/ReferralProgram';
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
        { name: t('profile.menu.booking_history', { default: 'Historique des Réservations' }), path: '/profile/bookings', icon: ClipboardList },
      ],
    },
    {
      title: t('profile.menu.section_transfers', { default: 'Transferts' }),
      items: [
        { name: t('profile.menu.transferred_tickets', { default: 'Billets Reçus' }), path: '/profile/transfers', icon: Inbox },
        { name: t('profile.menu.sent_tickets', { default: 'Billets Envoyés' }), path: '/profile/sent', icon: Send },
      ],
    },
    {
      title: t('profile.menu.section_account', { default: 'Compte' }),
      items: [
        { name: t('profile.menu.notifications', { default: 'Notifications' }), path: '/profile/notifications', icon: Bell },
        { name: t('profile.menu.payment_methods', { default: 'Méthodes de Paiement' }), path: '/profile/payments', icon: CreditCard },
        { name: t('profile.menu.referral', { default: 'Référer & Gagner' }), path: '/profile/referral', icon: Gift },
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

  const memberYear = new Date(user?.created_at || '').getFullYear();

  return (
    <div className="bg-paper">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 md:py-8">
        <div className="flex flex-col md:flex-row gap-5 md:gap-7">
          {/* Sidebar */}
          <aside className="w-full md:w-72 md:flex-shrink-0">
            <div className="bg-paper rounded-xl2 border border-line shadow-card overflow-hidden md:sticky md:top-20">
              {/* Identity card */}
              <div className="relative p-5 bg-cream border-b border-line overflow-hidden">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full bg-brand-50 blur-2xl opacity-80"
                />
                <div className="relative flex items-center gap-3.5">
                  <div className="grid place-items-center w-12 h-12 rounded-full bg-brand text-paper flex-shrink-0 ring-4 ring-paper">
                    <span
                      className="text-[18px] font-bold tracking-tight"
                      style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
                    >
                      {avatarInitial}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[15px] font-bold text-ink truncate leading-tight">
                      {displayName}
                    </h2>
                    {displayIdentifier !== displayName && (
                      <p
                        className="text-[11px] text-ink-mute truncate mt-0.5 tabular-nums"
                        style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                      >
                        {displayIdentifier}
                      </p>
                    )}
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-mute mt-1">
                      {t('profile.menu.member_since', {
                        year: memberYear,
                        default: `Membre depuis ${memberYear}`,
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="p-2.5 space-y-3">
                {navigationSections.map((section, index) => (
                  <div key={section.title ?? `section-${index}`}>
                    {section.title && (
                      <p className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-mute/70">
                        {section.title}
                      </p>
                    )}
                    <div className="space-y-0.5">
                      {section.items.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                          <Link
                            key={item.name}
                            to={item.path}
                            className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                              isActive
                                ? 'bg-brand-50 text-brand'
                                : 'text-ink/80 hover:bg-cream hover:text-ink'
                            }`}
                          >
                            {isActive && (
                              <span
                                aria-hidden
                                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand rounded-r"
                              />
                            )}
                            <item.icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-brand' : ''}`} />
                            <span className="truncate">{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="pt-2 mt-2 border-t border-line">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('profile.menu.sign_out', { default: 'Déconnexion' })}
                  </button>
                </div>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="bg-paper rounded-xl2 border border-line shadow-card p-5 md:p-6 min-h-[600px]">
              <Routes>
                <Route path="/" element={<ProfileInfo />} />
                <Route path="/my-tickets" element={<MyTickets />} />
                <Route path="/bookings" element={<BookingHistory />} />
                <Route path="/transfers" element={<TransferredTicketsList />} />
                <Route path="/sent" element={<SentTicketsList />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/payments" element={<PaymentMethods />} />
                <Route path="/referral" element={<ReferralProgram />} />
                <Route path="/settings" element={<AccountSettings />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}