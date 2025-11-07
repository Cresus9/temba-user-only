import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Ticket, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { detectInputType, getPhoneInfo, isValidPhone } from '../utils/phoneValidation';
import toast from 'react-hot-toast';

export default function Login() {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect path and any additional state
  const state = location.state as any;
  const from = state?.redirectTo || state?.from?.pathname || '/dashboard';
  const prefilledEmail = state?.email || '';

  // Detect if input is email or phone
  const inputType = detectInputType(emailOrPhone);
  const isPhone = inputType === 'phone';
  const isEmail = inputType === 'email';

  // Set email from state if provided
  React.useEffect(() => {
    if (prefilledEmail) {
      setEmailOrPhone(prefilledEmail);
    }
  }, [prefilledEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate input
    if (!emailOrPhone.trim()) {
      setError('Veuillez entrer votre email ou numéro de téléphone');
      return;
    }

    if (!password) {
      setError('Veuillez entrer votre mot de passe');
      return;
    }

    // Validate input type
    if (inputType === 'unknown') {
      setError('Veuillez entrer une adresse email valide ou un numéro de téléphone');
      return;
    }

    setIsLoading(true);

    try {
      await login(emailOrPhone, password);
      
      if (rememberMe && isEmail) {
        localStorage.setItem('rememberedEmail', emailOrPhone);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      // Navigate to the redirect path
      navigate(from, { replace: true });
      
      toast.success('Connexion réussie !');
    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      const errorMsg = error.message || 'Email/téléphone ou mot de passe invalide';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex">
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-block mb-4">
              <img src="/logo.svg" alt="Temba Logo" className="h-10 w-auto mx-auto" />
            </Link>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Bienvenue
            </h2>
            <p className="text-gray-600">
              Connectez-vous pour accéder à votre compte
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="emailOrPhone" className="block text-sm font-medium text-gray-700 mb-2">
                Email ou numéro de téléphone
              </label>
              <div className="relative">
                {isPhone ? (
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                ) : (
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                )}
                <input
                  id="emailOrPhone"
                  type="text"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={isPhone ? "+XXX XXXX XXXX" : "nom@exemple.com"}
                  autoComplete={isEmail ? "email" : "tel"}
                  required
                />
              </div>
              {emailOrPhone && (
                <div className="mt-1">
                  {isPhone && isValidPhone(emailOrPhone) ? (
                    (() => {
                      const phoneInfo = getPhoneInfo(emailOrPhone);
                      return (
                        <p className="text-xs text-green-600">
                          📱 {phoneInfo.countryName || 'Téléphone'} ({phoneInfo.normalized})
                        </p>
                      );
                    })()
                  ) : isPhone ? (
                    <p className="text-xs text-red-600">⚠️ Format de téléphone invalide</p>
                  ) : isEmail ? (
                    <p className="text-xs text-gray-500">📧 Connexion par email</p>
                  ) : inputType === 'unknown' ? (
                    <p className="text-xs text-red-600">⚠️ Format invalide</p>
                  ) : null}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-12 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Se souvenir de moi
                </label>
              </div>
              <Link to="/forgot-password" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                Mot de passe oublié ?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Connexion en cours...</span>
                </>
              ) : (
                "Se connecter"
              )}
            </button>

            <p className="text-center text-sm text-gray-600">
              Vous n'avez pas de compte ?{' '}
              <Link to="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
                S'inscrire
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1459749411175-04bf5292ceea"
          alt="Login background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/90 to-indigo-800/90" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-md text-white">
            <h2 className="text-3xl font-bold mb-6">Vivez les Meilleurs Événements en Afrique</h2>
            <p className="text-lg text-indigo-100">
              Rejoignez des milliers de participants et découvrez des concerts, festivals et expériences culturelles incroyables.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}