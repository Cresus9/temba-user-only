import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
import PageSEO from '../components/SEO/PageSEO';
import AccountShell from '../components/account/AccountShell';
export default function Profile() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();

  const displayName = profile?.name ||
                     (profile?.phone ? formatPhoneForDisplay(profile.phone) : null) ||
                     'Utilisateur';

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const active = location.pathname.startsWith('/profile/my-tickets') ? 'billets'
    : location.pathname.startsWith('/profile/bookings') ? 'reservations'
    : location.pathname.startsWith('/profile/transfers') ? 'recus'
    : location.pathname.startsWith('/profile/sent') ? 'envoyes'
    : location.pathname.startsWith('/profile/notifications') ? 'notifications'
    : location.pathname.startsWith('/profile/payments') ? 'paiements'
    : location.pathname.startsWith('/profile/referral') ? 'parrainage'
    : location.pathname.startsWith('/profile/settings') ? 'parametres'
    : 'profil';

  return (
    <div className="bg-white">
      <PageSEO title="Mon compte" description="Gérez votre compte Temba." robots="noindex, nofollow" />
      <AccountShell name={displayName} phone={profile?.phone ? formatPhoneForDisplay(profile.phone) : null} active={active} onLogout={handleLogout}>
            <div className="min-h-[480px]">
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
      </AccountShell>
    </div>
  );
}