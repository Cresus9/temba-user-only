import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, X, RotateCcw, Loader, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/TranslationContext';
import toast from 'react-hot-toast';

export default function GuestTicketVerification() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (!token) {
      setError('No verification token provided');
      setLoading(false);
      return;
    }

    verifyToken();
  }, [token, isAuthenticated]);

  const verifyToken = async () => {
    try {
      setLoading(true);
      setError(null);

      // First verify the token is valid
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          guest_orders!inner(
            email,
            token
          )
        `)
        .eq('guest_orders.token', token)
        .single();

      if (orderError || !order) {
        throw new Error('Invalid or expired verification token');
      }

      if (isAuthenticated) {
        // User is already logged in, redirect to tickets
        navigate(`/booking/confirmation/${order.id}`);
        return;
      }

      // Show login form for the guest email
      navigate('/login', { 
        state: { 
          email: order.guest_orders.email,
          redirectTo: `/booking/confirmation/${order.id}`
        }
      });

    } catch (error: any) {
      console.error('Verification error:', error);
      setError(error.message || 'Failed to verify ticket');
      toast.error(error.message || 'Failed to verify ticket');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{error}</h2>
        <p className="text-gray-600 mb-6">
          The verification link may be invalid or has expired.
        </p>
        <button
          onClick={verifyToken}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <RotateCcw className="h-5 w-5" />
          Try Again
        </button>
      </div>
    );
  }

  return null;
}