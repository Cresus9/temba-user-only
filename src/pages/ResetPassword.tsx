import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Ticket, Loader } from 'lucide-react';
import { authService } from '../services/authService';
import { supabase } from '../lib/supabase-client';
import { validatePassword } from '../config/auth';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isValidToken, setIsValidToken] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    // Debug: Log current URL and parameters
    console.log('Current URL:', window.location.href);
    console.log('Hash:', window.location.hash);
    
    // Check URL parameters for specific errors
    const urlParams = new URLSearchParams(window.location.hash.substring(1));
    const error = urlParams.get('error');
    const errorCode = urlParams.get('error_code');
    const errorDescription = urlParams.get('error_description');

    console.log('URL Error:', error);
    console.log('Error Code:', errorCode);
    console.log('Error Description:', errorDescription);

    if (error === 'access_denied' && errorCode === 'otp_expired') {
      setError('Le lien de réinitialisation a expiré. Veuillez demander un nouveau lien.');
      return;
    }

    // Check if we have a valid session (user clicked the reset link)
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('Session check result:', { session: !!session, error });
        
        if (error) {
          console.error('Session error:', error);
          setError('Lien de réinitialisation invalide ou expiré');
          return;
        }

        if (!session) {
          console.log('No session found');
          setError('Lien de réinitialisation invalide ou expiré');
          return;
        }

        console.log('Valid session found, user:', session.user.email);
        setIsValidToken(true);
      } catch (error) {
        console.error('Error checking session:', error);
        setError('Lien de réinitialisation invalide ou expiré');
      }
    };

    checkSession();
  }, []);

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
      await authService.updatePassword(password);
      setIsSuccess(true);
      toast.success('Mot de passe mis à jour avec succès !');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error: any) {
      console.error('Erreur de mise à jour du mot de passe:', error);
      setError(error.message || 'Échec de la mise à jour du mot de passe');
      toast.error(error.message || 'Échec de la mise à jour du mot de passe');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidToken && !error) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-8">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Vérification du lien...</p>
        </div>
      </div>
    );
  }

  if (error && !isValidToken) {
    return (
      <div className="min-h-[80vh] flex">
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md text-center">
            <div className="mb-8">
              <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-gray-900 mb-2">
                <Ticket className="h-8 w-8 text-indigo-600" />
                Temba
              </Link>
            </div>
            
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {error.includes('expiré') ? 'Lien expiré' : 'Lien invalide'}
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            {error.includes('expiré') && (
              <p className="text-sm text-gray-500 mb-6">
                Les liens de réinitialisation expirent après 1 heure pour des raisons de sécurité.
              </p>
            )}
            
            <div className="space-y-4">
              <Link
                to="/forgot-password"
                className="block w-full py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Demander un nouveau lien
              </Link>
              <Link
                to="/login"
                className="block w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Retour à la connexion
              </Link>
            </div>
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-gray-900 mb-2">
              <Ticket className="h-8 w-8 text-indigo-600" />
              Temba
            </Link>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Nouveau mot de passe</h2>
            <p className="text-gray-600">Choisissez un nouveau mot de passe sécurisé</p>
          </div>

          {isSuccess ? (
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Mot de passe mis à jour !</h3>
              <p className="text-gray-600 mb-6">
                Votre mot de passe a été mis à jour avec succès. Vous allez être redirigé vers la page de connexion.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader className="h-4 w-4 animate-spin" />
                <span>Redirection en cours...</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Le mot de passe doit contenir au moins 8 caractères</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    <span>Mise à jour...</span>
                  </>
                ) : (
                  'Mettre à jour le mot de passe'
                )}
              </button>

              <Link
                to="/login"
                className="block text-center text-sm text-gray-600 hover:text-gray-900"
              >
                Retour à la connexion
              </Link>
            </form>
          )}
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
            <h2 className="text-3xl font-bold mb-6">Sécurisez votre compte</h2>
            <p className="text-lg text-indigo-100">
              Choisissez un mot de passe fort pour protéger votre compte. Utilisez une combinaison de lettres, chiffres et caractères spéciaux.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}