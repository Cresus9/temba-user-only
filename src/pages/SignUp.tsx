import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, Loader, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { isValidPhone, normalizePhone, getPhoneInfo, detectInputType } from '../utils/phoneValidation';
import CountryCodeSelector from '../components/CountryCodeSelector';
import toast from 'react-hot-toast';

type SignupStep = 'form' | 'verify';

type SignupMethod = 'email' | 'phone';

export default function SignUp() {
  const [step, setStep] = useState<SignupStep>('form');
  const [signupMethod, setSignupMethod] = useState<SignupMethod>('phone'); // Default to phone
  const [countryCode, setCountryCode] = useState('+226'); // Default to Burkina Faso
  const [formData, setFormData] = useState({
    name: '',
    emailOrPhone: '',
    password: '',
    confirmPassword: ''
  });
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  // Detect input type (for validation)
  const inputType = detectInputType(formData.emailOrPhone);
  const isPhone = signupMethod === 'phone' || inputType === 'phone';
  const isEmail = signupMethod === 'email' || inputType === 'email';

  // Handle sending verification code (for phone signup)
  const handleSendVerificationCode = async () => {
    setError('');
    
    // Validate all fields first
    if (!formData.name.trim()) {
      setError('Veuillez entrer votre nom complet');
      return;
    }

    if (!formData.emailOrPhone.trim()) {
      setError(signupMethod === 'email' 
        ? 'Veuillez entrer votre adresse email' 
        : 'Veuillez entrer votre numéro de téléphone');
      return;
    }

    // Validate based on selected method
    if (signupMethod === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.emailOrPhone)) {
        setError('Veuillez entrer une adresse email valide');
        return;
      }
    } else if (signupMethod === 'phone') {
      // Combine country code with local number
      const fullPhone = `${countryCode}${formData.emailOrPhone.replace(/\s/g, '')}`;
      if (!formData.emailOrPhone.trim()) {
        setError('Veuillez entrer votre numéro de téléphone');
        return;
      }
      if (!isValidPhone(fullPhone)) {
        setError('Format de numéro invalide. Vérifiez le numéro saisi');
        return;
      }
    }

    if (!formData.password) {
      setError('Veuillez entrer un mot de passe');
      return;
    }

    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    // Handle based on selected method
    if (signupMethod === 'email') {
      await handleEmailSignup();
      return;
    }

    // Phone signup - send OTP
    if (signupMethod === 'phone') {
      // Combine country code with local number
      const fullPhone = `${countryCode}${formData.emailOrPhone.replace(/\s/g, '')}`;
      setIsSendingOTP(true);
      try {
        await authService.sendOTP(fullPhone);
        setStep('verify');
        toast.success('Code de vérification envoyé par SMS !');
      } catch (error: any) {
        setError(error.message || 'Échec de l\'envoi du code');
        toast.error(error.message || 'Échec de l\'envoi du code');
      } finally {
        setIsSendingOTP(false);
      }
    }
  };

  // Handle email signup (no OTP needed)
  const handleEmailSignup = async () => {
    setIsLoading(true);
    setError('');

    try {
      await register({
        name: formData.name,
        email: formData.emailOrPhone,
        password: formData.password
      });
      
      toast.success('Compte créé avec succès !');
      navigate('/');
    } catch (error: any) {
      const message = error.message || 'Échec de la création du compte';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP verification and account creation
  const handleVerifyAndCreateAccount = async () => {
    setError('');
    
    if (!otpCode || otpCode.length !== 6) {
      setError('Le code de vérification doit contenir 6 chiffres');
      return;
    }

    setIsLoading(true);
    try {
      // Combine country code with local number
      const fullPhone = `${countryCode}${formData.emailOrPhone.replace(/\s/g, '')}`;
      
      // Step 1: Verify OTP
      const isValid = await authService.verifyOTP(fullPhone, otpCode);
      if (!isValid) {
        setError('Code invalide. Veuillez réessayer.');
        toast.error('Code invalide');
        setIsLoading(false);
        return;
      }

      // Step 2: Create account
      await authService.registerWithPhone({
        name: formData.name,
        phone: fullPhone,
        password: formData.password
      });
      
      toast.success('Compte créé avec succès !');
      navigate('/');
    } catch (error: any) {
      const message = error.message || 'Échec de la création du compte';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend code
  const handleResendCode = async () => {
    setError('');
    setIsSendingOTP(true);
    try {
      // Combine country code with local number
      const fullPhone = `${countryCode}${formData.emailOrPhone.replace(/\s/g, '')}`;
      await authService.sendOTP(fullPhone);
      toast.success('Code renvoyé avec succès !');
    } catch (error: any) {
      setError(error.message || 'Échec de l\'envoi du code');
      toast.error(error.message || 'Échec de l\'envoi du code');
    } finally {
      setIsSendingOTP(false);
    }
  };

  // Handle change phone number (go back to form)
  const handleChangePhone = () => {
    setStep('form');
    setOtpCode('');
    setError('');
  };

  // Show verification screen
  if (step === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <img src="/logo.svg" alt="Temba Logo" className="h-12 w-12 mx-auto mb-4" />
            </Link>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Vérifiez votre téléphone
            </h2>
            <p className="text-gray-600">
              Entrez le code à 6 chiffres envoyé à {(() => {
                const fullPhone = `${countryCode}${formData.emailOrPhone.replace(/\s/g, '')}`;
                const info = getPhoneInfo(fullPhone);
                return info?.normalized || fullPhone;
              })()}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm p-8">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code de vérification
              </label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => {
                  // Only allow digits, max 6
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtpCode(value);
                  setError(''); // Clear error when user types
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-2xl tracking-widest font-mono"
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                disabled={isLoading}
              />
            </div>

            <button
              type="button"
              onClick={handleVerifyAndCreateAccount}
              disabled={isLoading || otpCode.length !== 6}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Vérification en cours...</span>
                </>
              ) : (
                'Vérifier et créer le compte'
              )}
            </button>

            <div className="mt-6 space-y-3 text-center">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isSendingOTP}
                className="block w-full text-sm text-indigo-600 hover:text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingOTP ? 'Envoi en cours...' : 'Renvoyer le code'}
              </button>
              <button
                type="button"
                onClick={handleChangePhone}
                className="block w-full text-sm text-indigo-600 hover:text-indigo-700"
              >
                Changer le numéro de téléphone
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show signup form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-4">
            <img src="/logo.svg" alt="Temba Logo" className="h-10 w-auto mx-auto" />
          </Link>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Créez votre compte
          </h2>
          <p className="text-gray-600">
            Inscrivez-vous pour commencer avec Temba
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-8">
          <form onSubmit={(e) => {
            e.preventDefault();
            handleSendVerificationCode();
          }} className="space-y-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom complet
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Kabore Jean"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Signup Method Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Méthode d'inscription
              </label>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setSignupMethod('phone');
                    setFormData({ ...formData, emailOrPhone: '' });
                    setCountryCode('+226'); // Reset to Burkina Faso
                    setError('');
                  }}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    signupMethod === 'phone'
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
                    setSignupMethod('email');
                    setFormData({ ...formData, emailOrPhone: '' });
                    setCountryCode('+226'); // Reset to Burkina Faso
                    setError('');
                  }}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    signupMethod === 'email'
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {signupMethod === 'email' ? 'Adresse email' : 'Numéro de téléphone'}
                </label>
                {signupMethod === 'phone' ? (
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
                        type="tel"
                        value={formData.emailOrPhone}
                        onChange={(e) => {
                          // Only allow digits and spaces
                          const value = e.target.value.replace(/[^\d\s]/g, '');
                          setFormData({ ...formData, emailOrPhone: value });
                          setError(''); // Clear error when user types
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
                      type="email"
                      value={formData.emailOrPhone}
                      onChange={(e) => {
                        setFormData({ ...formData, emailOrPhone: e.target.value });
                        setError(''); // Clear error when user types
                      }}
                      className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="nom@exemple.com"
                      autoComplete="email"
                      required
                      disabled={isLoading}
                    />
                  </div>
                )}
                {formData.emailOrPhone && (
                  <div className="mt-2">
                    {signupMethod === 'phone' ? (
                      (() => {
                        // Combine country code with local number
                        const fullPhone = `${countryCode}${formData.emailOrPhone.replace(/\s/g, '')}`;
                        const isValid = isValidPhone(fullPhone);
                        const info = isValid ? getPhoneInfo(fullPhone) : null;
                        return isValid && info ? (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <span>✓</span>
                            <span>Numéro valide {info.countryName && `(${info.countryName})`} - Vous recevrez un code par SMS</span>
                          </p>
                        ) : formData.emailOrPhone.length > 0 ? (
                          <p className="text-xs text-red-600 flex items-center gap-1">
                            <span>⚠️</span>
                            <span>Numéro invalide. Vérifiez le numéro saisi</span>
                          </p>
                        ) : null;
                      })()
                    ) : signupMethod === 'email' ? (
                      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailOrPhone) ? (
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
                {signupMethod === 'phone' && (
                  <p className="mt-2 text-xs text-gray-500">
                    💡 Vous recevrez un code de vérification par SMS
                  </p>
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="••••••••"
                  required
                  minLength={8}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="••••••••"
                  required
                  minLength={8}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isSendingOTP}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading || isSendingOTP ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>
                    {isSendingOTP ? 'Envoi du code...' : 'Création du compte...'}
                  </span>
                </>
              ) : (
                signupMethod === 'phone' ? 'Envoyer le code de vérification' : 'Créer le compte'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Vous avez déjà un compte ?{' '}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
