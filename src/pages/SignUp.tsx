import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, Loader, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { isValidPhone, normalizePhone, getPhoneInfo, detectInputType } from '../utils/phoneValidation';
import toast from 'react-hot-toast';

type SignupStep = 'form' | 'verify';

export default function SignUp() {
  const [step, setStep] = useState<SignupStep>('form');
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

  // Detect input type
  const inputType = detectInputType(formData.emailOrPhone);
  const isPhone = inputType === 'phone';
  const isEmail = inputType === 'email';
  const phoneInfo = isPhone && isValidPhone(formData.emailOrPhone) ? getPhoneInfo(formData.emailOrPhone) : null;

  // Handle sending verification code (for phone signup)
  const handleSendVerificationCode = async () => {
    setError('');
    
    // Validate all fields first
    if (!formData.name.trim()) {
      setError('Veuillez entrer votre nom complet');
      return;
    }

    if (!formData.emailOrPhone.trim()) {
      setError('Veuillez entrer votre email ou numéro de téléphone');
      return;
    }

    if (inputType === 'unknown') {
      setError('Veuillez entrer une adresse email valide ou un numéro de téléphone');
      return;
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

    // If email, proceed directly to signup
    if (isEmail) {
      await handleEmailSignup();
      return;
    }

    // If phone, send OTP
    if (isPhone) {
      if (!isValidPhone(formData.emailOrPhone)) {
        setError('Format de numéro invalide. Utilisez le format international: +[code pays][numéro]');
        return;
      }

      setIsSendingOTP(true);
      try {
        await authService.sendOTP(formData.emailOrPhone);
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
      // Step 1: Verify OTP
      const isValid = await authService.verifyOTP(formData.emailOrPhone, otpCode);
      if (!isValid) {
        setError('Code invalide. Veuillez réessayer.');
        toast.error('Code invalide');
        setIsLoading(false);
        return;
      }

      // Step 2: Create account
      await authService.registerWithPhone({
        name: formData.name,
        phone: formData.emailOrPhone,
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
      await authService.sendOTP(formData.emailOrPhone);
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
              Entrez le code à 6 chiffres envoyé à {phoneInfo?.normalized || formData.emailOrPhone}
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
            if (isEmail) {
              handleEmailSignup();
            } else {
              handleSendVerificationCode();
            }
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
                  placeholder="Thierry Yabre"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Email or Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email ou numéro de téléphone
              </label>
              <div className="relative">
                {isPhone ? (
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                ) : (
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                )}
                <input
                  type="text"
                  value={formData.emailOrPhone}
                  onChange={(e) => {
                    setFormData({ ...formData, emailOrPhone: e.target.value });
                    setError(''); // Clear error when user types
                  }}
                  className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={isPhone ? "+XXX XXXX XXXX" : "nom@exemple.com"}
                  autoComplete={isEmail ? "email" : "tel"}
                  required
                  disabled={isLoading}
                />
              </div>
              {formData.emailOrPhone && (
                <div className="mt-2">
                  {isPhone && isValidPhone(formData.emailOrPhone) && phoneInfo ? (
                    <p className="text-xs text-gray-600">
                      📱 Numéro de téléphone détecté - Vérification par SMS requise
                      {phoneInfo.countryName && (
                        <span className="ml-1">({phoneInfo.countryName})</span>
                      )}
                    </p>
                  ) : isPhone ? (
                    <p className="text-xs text-red-600">
                      Format invalide. Utilisez le format international: +[code pays][numéro]
                    </p>
                  ) : isEmail ? (
                    <p className="text-xs text-gray-600">📧 Email détecté</p>
                  ) : inputType === 'unknown' ? (
                    <p className="text-xs text-red-600">⚠️ Format invalide</p>
                  ) : null}
                </div>
              )}
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
                isPhone ? 'Envoyer le code de vérification' : 'Créer le compte'
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
