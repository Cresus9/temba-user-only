import React, { useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function GuestTicketVerification() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!token) return;
    if (isAuthenticated) {
      navigate('/profile/my-tickets', { replace: true });
      return;
    }
    navigate(`/guest/tickets/${token}`, { replace: true });
  }, [token, isAuthenticated, navigate]);

  if (!token) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-semibold text-ink mb-2">Lien invalide</h2>
        <p className="text-[14px] text-ink-mute mb-6">Aucun jeton de vérification fourni.</p>
        <Link to="/find-tickets" className="font-semibold text-brand">
          Retrouver mes billets
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <Loader className="h-8 w-8 animate-spin text-brand" />
    </div>
  );
}
