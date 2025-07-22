import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { User, Ticket, Bell, CreditCard, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/TranslationContext';
import ProfileInfo from '../components/profile/ProfileInfo';
import BookingHistory from '../components/profile/BookingHistory';
import Notifications from '../components/profile/Notifications';
import PaymentMethods from '../components/profile/PaymentMethods';
import AccountSettings from '../components/profile/AccountSettings';
import TransferRequests from '../components/tickets/TransferRequests';

export default function Profile() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigation = [
    { name: t('profile.menu.profile_info', { default: 'Profile Information' }), path: '/profile', icon: User },
    { name: t('profile.menu.booking_history', { default: 'Booking History' }), path: '/profile/bookings', icon: Ticket },
    { name: t('profile.menu.transfer_requests', { default: 'Transfer Requests' }), path: '/profile/transfers', icon: Ticket },
    { name: t('profile.menu.notifications', { default: 'Notifications' }), path: '/profile/notifications', icon: Bell },
    { name: t('profile.menu.payment_methods', { default: 'Payment Methods' }), path: '/profile/payments', icon: CreditCard },
    { name: t('profile.menu.account_settings', { default: 'Account Settings' }), path: '/profile/settings', icon: Settings },
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
              <span className="text-2xl font-bold text-[var(--primary-600)]">
                {user?.email?.[0].toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--gray-900)]">{user?.email}</h2>
              <p className="text-sm text-[var(--gray-600)]">
                {t('profile.menu.member_since', { 
                  year: new Date(user?.created_at || '').getFullYear(),
                  default: `Member since ${new Date(user?.created_at || '').getFullYear()}`
                })}
              </p>
            </div>
          </div>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-[var(--primary-50)] text-[var(--primary-600)]'
                      : 'text-gray-700 hover:bg-[var(--gray-50)]'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[var(--error-600)] hover:bg-[var(--error-50)]"
            >
              <LogOut className="h-5 w-5" />
              {t('profile.menu.sign_out', { default: 'Sign Out' })}
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-[600px] bg-white rounded-xl shadow-sm p-6">
          <Routes>
            <Route path="/" element={<ProfileInfo />} />
            <Route path="/bookings" element={<BookingHistory />} />
            <Route path="/transfers" element={<TransferRequests />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/payments" element={<PaymentMethods />} />
            <Route path="/settings" element={<AccountSettings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
