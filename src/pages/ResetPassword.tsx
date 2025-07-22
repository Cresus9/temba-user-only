import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader, AlertCircle, Ticket } from 'lucide-react';
import { supabase } from '../lib/supabase-client';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a valid session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        toast.error('Lien de réinitialisation invalide ou expiré');
      }
    };

    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (error) throw error;

      toast.success('Mot de passe mis à jour avec succès');
      navigate('/login');
    } catch (error: any) {
      console.error('Erreur de réinitialisation du mot de passe:', error);
      setError(error.message || 'Échec de la réinitialisation du mot de passe');
      toast.error(error.message || 'Échec de la réinitialisation du mot de passe');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-[var(--gray-900)] mb-2">
              <Ticket className="h-8 w-8 text-[var(--primary-600)]" />
              Temba
            </Link>
            <h2 className="text-3xl font-bold text-[var(--gray-900)] mb-2">Réinitialiser le mot de passe</h2>
            <p className="text-[var(--gray-600)]">Entrez votre nouveau mot de passe ci-dessous</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--gray-400)]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-12 py-3 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--gray-400)] hover:text-[var(--gray-600)]"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmer le nouveau mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--gray-400)]" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-10 pr-12 py-3 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--gray-400)] hover:text-[var(--gray-600)]"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[var(--primary-600)] hover:bg-[var(--primary-700)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-500)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Mise à jour du mot de passe...</span>
                </>
              ) : (
                'Réinitialiser le mot de passe'
              )}
            </button>

            <p className="text-center text-sm text-[var(--gray-600)]">
              Vous vous souvenez de votre mot de passe ?{' '}
              <Link to="/login" className="font-medium text-[var(--primary-600)] hover:text-[var(--primary-500)]">
                Se connecter
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3"
          alt="Reset password background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/90 to-indigo-800/90" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-md text-white">
            <h2 className="text-3xl font-bold mb-6">Créez un nouveau mot de passe</h2>
            <p className="text-lg text-indigo-100">
              Choisissez un mot de passe fort pour protéger votre compte. Assurez-vous qu'il contient au moins 8 caractères et inclut un mélange de lettres, chiffres et caractères spéciaux.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
