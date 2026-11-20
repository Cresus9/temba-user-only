import React, { lazy, Suspense } from 'react';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ScrollToTop from '../components/ScrollToTop';

// Pages
import Home from '../pages/Home';
const Events = lazyWithRetry(() => import('../pages/Events'));
import EventDetails from '../pages/EventDetails';
const Categories = lazyWithRetry(() => import('../pages/Categories'));
const CategoryEvents = lazyWithRetry(() => import('../pages/CategoryEvents'));
const Login = lazyWithRetry(() => import('../pages/Login'));
const SignUp = lazyWithRetry(() => import('../pages/SignUp'));
const ForgotPassword = lazyWithRetry(() => import('../pages/ForgotPassword'));
const ResetPassword = lazyWithRetry(() => import('../pages/ResetPassword'));
const Profile = lazyWithRetry(() => import('../pages/Profile'));
const Dashboard = lazyWithRetry(() => import('../pages/Dashboard'));
const Checkout = lazyWithRetry(() => import('../pages/Checkout'));
const EnhancedBookingConfirmation = lazyWithRetry(() => import('../pages/EnhancedBookingConfirmation'));
const PaymentSuccess = lazyWithRetry(() => import('../pages/PaymentSuccess'));
const PaymentCancelled = lazyWithRetry(() => import('../pages/PaymentCancelled'));
const PaymentStatus = lazyWithRetry(() => import('../pages/PaymentStatus'));
const Support = lazyWithRetry(() => import('../pages/Support'));
const TicketDetails = lazyWithRetry(() => import('../pages/TicketDetails'));
const Notifications = lazyWithRetry(() => import('../pages/Notifications'));
const Terms = lazyWithRetry(() => import('../pages/Terms'));
const Privacy = lazyWithRetry(() => import('../pages/Privacy'));
const Contact = lazyWithRetry(() => import('../pages/Contact'));
const Cookies = lazyWithRetry(() => import('../pages/Cookies'));
const About = lazyWithRetry(() => import('../pages/About'));
const AccountDeletion = lazyWithRetry(() => import('../pages/AccountDeletion'));
const MobileAppPreview = lazyWithRetry(() => import('../pages/MobileAppPreview'));

const DevAccountPreview = import.meta.env.DEV
  ? lazy(() => import('../pages/dev/AccountPreview'))
  : null;
const DevTicketsPreview = import.meta.env.DEV
  ? lazy(() => import('../pages/dev/TicketsReceivedPreview'))
  : null;

// Blog Pages
const BlogHome = lazyWithRetry(() => import('../pages/blog/BlogHome'));
const BlogPost = lazyWithRetry(() => import('../pages/blog/BlogPost'));
const BlogCategory = lazyWithRetry(() => import('../pages/blog/BlogCategory'));
const BlogTag = lazyWithRetry(() => import('../pages/blog/BlogTag'));
const BlogAuthor = lazyWithRetry(() => import('../pages/blog/BlogAuthor'));
const BlogSearch = lazyWithRetry(() => import('../pages/blog/BlogSearch'));

// Public Discovery Pages
const OrganizerProfile = lazyWithRetry(() => import('../pages/public/OrganizerProfile'));
const OrganizersDirectory = lazyWithRetry(() => import('../pages/public/OrganizersDirectory'));
const ArtistProfile = lazyWithRetry(() => import('../pages/public/ArtistProfile'));
const ArtistsDirectory = lazyWithRetry(() => import('../pages/public/ArtistsDirectory'));
const VenueProfile = lazyWithRetry(() => import('../pages/public/VenueProfile'));
const VenuesDirectory = lazyWithRetry(() => import('../pages/public/VenuesDirectory'));
const TagPage = lazyWithRetry(() => import('../pages/public/TagPage'));
const AttractionsDirectory = lazyWithRetry(() => import('../pages/public/AttractionsDirectory'));
const CityLanding = lazyWithRetry(() => import('../pages/public/CityLanding'));
import { CITY_LANDINGS } from '../data/cityLandings';

// Test Components
const CategoryTest = lazyWithRetry(() => import('../components/CategoryTest'));
const NotificationTester = lazyWithRetry(() => import('../components/NotificationTester'));
const NotificationDebugger = lazyWithRetry(() => import('../components/NotificationDebugger'));

// Guest Pages
const GuestTicketVerification = lazyWithRetry(() => import('../components/tickets/GuestTicketVerification'));
const GuestOrderVerification = lazyWithRetry(() => import('../components/checkout/GuestOrderVerification'));
const GuestTickets = lazyWithRetry(() => import('../pages/GuestTickets'));
const FindGuestTickets = lazyWithRetry(() => import('../pages/FindGuestTickets'));
const WhatsAppShare = lazyWithRetry(() => import('../pages/WhatsAppShare'));
const ReferralLanding = lazyWithRetry(() => import('../pages/ReferralLanding'));
const ReferralProgram = lazyWithRetry(() => import('../pages/profile/ReferralProgram'));
import NotFound from '../pages/NotFound';

/** Shown while a route chunk loads: same spinner as auth pages, holds the page height. */
function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" aria-busy="true">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

export default function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/events" element={<Events />} />
        <Route path="/e/:eventId" element={<EventDetails />} />
        <Route path="/event/:eventId" element={<EventDetails />} />
        <Route path="/events/:id" element={<EventDetails />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/categories/:categoryId" element={<CategoryEvents />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/register" element={<Navigate to="/signup" replace />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/cookies" element={<Cookies />} />
        <Route path="/about" element={<About />} />
        <Route path="/preview/app-mobile" element={<MobileAppPreview />} />
        <Route path="/account-deletion" element={<AccountDeletion />} />
        <Route path="/ref/:code" element={<ReferralLanding />} />
        <Route path="/referrals" element={
          <RequireAuth>
            <ReferralProgram />
          </RequireAuth>
        } />

        {/* Blog Routes */}
        <Route path="/blog" element={<BlogHome />} />
        <Route path="/blog/post/:slug" element={<BlogPost />} />
        <Route path="/blog/category/:slug" element={<BlogCategory />} />
        <Route path="/blog/tag/:slug" element={<BlogTag />} />
        <Route path="/blog/author/:authorId" element={<BlogAuthor />} />
        <Route path="/blog/search" element={<BlogSearch />} />

        {/* Public Discovery Routes */}
        <Route path="/organizers" element={<OrganizersDirectory />} />
        <Route path="/organizers/:slug" element={<OrganizerProfile />} />
        <Route path="/artists" element={<ArtistsDirectory />} />
        <Route path="/artists/:slug" element={<ArtistProfile />} />
        <Route path="/venues" element={<VenuesDirectory />} />
        <Route path="/venues/:slug" element={<VenueProfile />} />
        <Route path="/tags/:slug" element={<TagPage />} />
        <Route path="/attractions" element={<AttractionsDirectory />} />
        {CITY_LANDINGS.map((city) => (
          <Route key={city.slug} path={`/${city.slug}`} element={<CityLanding />} />
        ))}

        {/* Test Routes */}
        <Route path="/test/categories" element={<CategoryTest />} />
        <Route path="/test/notifications" element={<NotificationTester />} />
        <Route path="/debug/notifications" element={<NotificationDebugger />} />

        {/* Guest Routes */}
        <Route path="/find-tickets" element={<FindGuestTickets />} />
        <Route path="/verify/:token" element={<GuestTicketVerification />} />
        <Route path="/verify-order/:token" element={<GuestOrderVerification />} />
        <Route path="/guest/tickets/:token" element={<GuestTickets />} />
        <Route path="/w/:slug" element={<WhatsAppShare />} />

        {/* Payment Routes */}
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/cancelled" element={<PaymentCancelled />} />
        <Route path="/payment/:paymentId" element={<PaymentStatus />} />

        {/* Protected User Routes */}
        {DevAccountPreview ? (
          <Route
            path="/dev/compte"
            element={
              <Suspense fallback={null}>
                <DevAccountPreview />
              </Suspense>
            }
          />
        ) : null}
        <Route path="/dashboard" element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        } />
        <Route path="/profile/*" element={
          <RequireAuth>
            <Profile />
          </RequireAuth>
        } />
        <Route path="/checkout" element={<Checkout />} />
        {DevTicketsPreview ? (
          <Route
            path="/dev/billets-recus"
            element={
              <Suspense fallback={null}>
                <DevTicketsPreview />
              </Suspense>
            }
          />
        ) : null}
        <Route path="/booking/confirmation/:bookingId" element={<EnhancedBookingConfirmation />} />
        <Route path="/support" element={<Support />} />
        <Route path="/support/:id" element={
          <RequireAuth>
            <TicketDetails />
          </RequireAuth>
        } />
        <Route path="/notifications" element={
          <RequireAuth>
            <Notifications />
          </RequireAuth>
        } />

        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </>
  );
}