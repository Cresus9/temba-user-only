import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ScrollToTop from '../components/ScrollToTop';

// Pages
import Home from '../pages/Home';
import Events from '../pages/Events';
import EventDetails from '../pages/EventDetails';
import Categories from '../pages/Categories';
import CategoryEvents from '../pages/CategoryEvents';
import Login from '../pages/Login';
import SignUp from '../pages/SignUp';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import Profile from '../pages/Profile';
import Dashboard from '../pages/Dashboard';
import Checkout from '../pages/Checkout';
import BookingConfirmation from '../pages/BookingConfirmation';
import Support from '../pages/Support';
import TicketDetails from '../pages/TicketDetails';
import Terms from '../pages/Terms';
import Privacy from '../pages/Privacy';
import Contact from '../pages/Contact';
import Cookies from '../pages/Cookies';
import About from '../pages/About';

// Guest Pages
import GuestTicketVerification from '../components/tickets/GuestTicketVerification';
import GuestOrderVerification from '../components/checkout/GuestOrderVerification';

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
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetails />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/categories/:categoryId" element={<CategoryEvents />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/cookies" element={<Cookies />} />
        <Route path="/about" element={<About />} />

        {/* Guest Routes */}
        <Route path="/verify/:token" element={<GuestTicketVerification />} />
        <Route path="/verify-order/:token" element={<GuestOrderVerification />} />
        <Route path="/guest/tickets/:token" element={<BookingConfirmation />} />

        {/* Protected User Routes */}
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
        <Route path="/booking/confirmation/:bookingId" element={<BookingConfirmation />} />
        <Route path="/support" element={
          <RequireAuth>
            <Support />
          </RequireAuth>
        } />
        <Route path="/support/:id" element={
          <RequireAuth>
            <TicketDetails />
          </RequireAuth>
        } />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}