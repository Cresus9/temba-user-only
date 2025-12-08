import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Ticket, Phone, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { detectInputType, getPhoneInfo, isValidPhone, normalizePhone } from '../utils/phoneValidation';
import CountryCodeSelector from '../components/CountryCodeSelector';
import toast from 'react-hot-toast';

type LoginMethod = 'email' | 'phone';

export default function Login() {
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone'); // Default to phone
  const [countryCode, setCountryCode] = useState('+226'); // Default to Burkina Faso
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

  // Detect if input is email or phone (for validation)
  const inputType = detectInputType(emailOrPhone);
  const isPhone = loginMethod === 'phone' || inputType === 'phone';
  const isEmail = loginMethod === 'email' || inputType === 'email';

  // Set email from state if provided, or load remembered credentials
  React.useEffect(() => {
    if (prefilledEmail) {
      setEmailOrPhone(prefilledEmail);
      // If email is prefilled, switch to email method
      if (prefilledEmail.includes('@')) {
        setLoginMethod('email');
      }
    } else {
      // Check for remembered credentials
      const rememberedEmail = localStorage.getItem('rememberedEmail');
      const rememberedPhone = localStorage.getItem('rememberedPhone');
      
      if (rememberedEmail) {
        setEmailOrPhone(rememberedEmail);
        setLoginMethod('email');
        setRememberMe(true);
      } else if (rememberedPhone) {
        // Extract country code and local number from remembered phone
        const phoneInfo = getPhoneInfo(rememberedPhone);
        if (phoneInfo.countryCode && phoneInfo.localNumber) {
          setCountryCode(`+${phoneInfo.countryCode}`);
          setEmailOrPhone(phoneInfo.localNumber);
          setLoginMethod('phone');
          setRememberMe(true);
        }
      }
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

    // Validate based on selected method
    if (loginMethod === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailOrPhone)) {
        setError('Veuillez entrer une adresse email valide');
        return;
      }
    } else if (loginMethod === 'phone') {
      // Combine country code with local number
      const fullPhone = `${countryCode}${emailOrPhone.replace(/\s/g, '')}`;
      if (!isValidPhone(fullPhone)) {
        setError('Format de numéro invalide. Vérifiez le numéro saisi');
        return;
      }
    }

    setIsLoading(true);

    try {
      // For phone login, combine country code with local number
      const loginValue = loginMethod === 'phone' 
        ? `${countryCode}${emailOrPhone.replace(/\s/g, '')}`
        : emailOrPhone;
      
      await login(loginValue, password);
      
      if (rememberMe) {
        if (loginMethod === 'email') {
          localStorage.setItem('rememberedEmail', emailOrPhone);
        } else {
          // Store phone with country code
          const fullPhone = `${countryCode}${emailOrPhone.replace(/\s/g, '')}`;
          localStorage.setItem('rememberedPhone', fullPhone);
        }
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPhone');
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
            {/* Method Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Méthode de connexion
              </label>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('phone');
                    setEmailOrPhone('');
                    setCountryCode('+226');
                    setError('');
                  }}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    loginMethod === 'phone'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Phone className="h-5 w-5" />
                  <span className="font-medium">Téléphone</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('email');
                    setEmailOrPhone('');
                    setError('');
                  }}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    loginMethod === 'email'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Mail className="h-5 w-5" />
                  <span className="font-medium">Email</span>
                </button>
              </div>

              {/* Email or Phone Input */}
              <div>
                <label htmlFor="emailOrPhone" className="block text-sm font-medium text-gray-700 mb-2">
                  {loginMethod === 'email' ? 'Adresse email' : 'Numéro de téléphone'}
                </label>
                {loginMethod === 'phone' ? (
                  <div className="flex">
                    <CountryCodeSelector
                      value={countryCode}
                      onChange={(code) => {
                        setCountryCode(code);
                        setError('');
                      }}
                    />
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        id="emailOrPhone"
                        type="tel"
                        value={emailOrPhone}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^\d\s]/g, '');
                          setEmailOrPhone(value);
                          setError('');
                        }}
                        className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="70 12 34 56"
                        autoComplete="tel"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      id="emailOrPhone"
                      type="email"
                      value={emailOrPhone}
                      onChange={(e) => {
                        setEmailOrPhone(e.target.value);
                        setError('');
                      }}
                      className="block w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="nom@exemple.com"
                      autoComplete="email"
                      required
                      disabled={isLoading}
                    />
                  </div>
                )}
                {emailOrPhone && (
                  <div className="mt-2">
                    {loginMethod === 'phone' ? (
                      (() => {
                        const fullPhone = `${countryCode}${emailOrPhone.replace(/\s/g, '')}`;
                        const isValid = isValidPhone(fullPhone);
                        const info = isValid ? getPhoneInfo(fullPhone) : null;
                        return isValid && info ? (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <span>✓</span>
                            <span>Numéro valide {info.countryName && `(${info.countryName})`}</span>
                          </p>
                        ) : emailOrPhone.length > 0 ? (
                          <p className="text-xs text-red-600 flex items-center gap-1">
                            <span>⚠️</span>
                            <span>Numéro invalide. Vérifiez le numéro saisi</span>
                          </p>
                        ) : null;
                      })()
                    ) : loginMethod === 'email' ? (
                      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrPhone) ? (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <span>✓</span>
                          <span>Email valide</span>
                        </p>
                      ) : (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <span>⚠️</span>
                          <span>Format d'email invalide</span>
                        </p>
                      )
                    ) : null}
                  </div>
                )}
              </div>
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
                  <Loader className="h-5 w-5 animate-spin" />
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