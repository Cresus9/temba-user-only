import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Loader, CheckCircle, AlertCircle, Ticket, Phone } from 'lucide-react';
import { authService } from '../services/authService';
import { detectInputType } from '../utils/phoneValidation';
import CountryCodeSelector from '../components/CountryCodeSelector';
import toast from 'react-hot-toast';

type ResetStep = 'input' | 'verify-otp' | 'reset-password' | 'success';

export default function ForgotPassword() {
  const [step, setStep] = useState<ResetStep>('input');
  const [resetMethod, setResetMethod] = useState<'email' | 'phone'>('phone'); // Default to phone
  const [countryCode, setCountryCode] = useState('+226'); // Default to Burkina Faso
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  // Detect input type
  const inputType = detectInputType(emailOrPhone);
  const isPhone = resetMethod === 'phone' || inputType === 'phone';
  const isEmail = resetMethod === 'email' || inputType === 'email';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!emailOrPhone.trim()) {
      setError(resetMethod === 'email' 
        ? 'Veuillez entrer votre adresse email' 
        : 'Veuillez entrer votre numéro de téléphone');
      return;
    }

    if (resetMethod === 'email') {
      // Email reset flow
      setIsLoading(true);
      try {
        await authService.resetPassword(emailOrPhone);
        setStep('success');
        toast.success('Instructions de réinitialisation envoyées à votre email');
      } catch (error: any) {
        console.error('Erreur de réinitialisation du mot de passe:', error);
        setError(error.message || 'Échec de l\'envoi des instructions');
        toast.error(error.message || 'Échec de l\'envoi des instructions');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Phone reset flow - send OTP
      const fullPhone = `${countryCode}${emailOrPhone.replace(/\s/g, '')}`;
      setIsSendingOTP(true);
      try {
        await authService.sendOTP(fullPhone);
        setStep('verify-otp');
        toast.success('Code de vérification envoyé par SMS !');
      } catch (error: any) {
        setError(error.message || 'Échec de l\'envoi du code');
        toast.error(error.message || 'Échec de l\'envoi du code');
      } finally {
        setIsSendingOTP(false);
      }
    }
  };

  const handleVerifyOTP = async () => {
    setError('');
    
    if (!otpCode || otpCode.length !== 6) {
      setError('Le code de vérification doit contenir 6 chiffres');
      return;
    }

    setIsLoading(true);
    try {
      const fullPhone = `${countryCode}${emailOrPhone.replace(/\s/g, '')}`;
      const isValid = await authService.verifyOTP(fullPhone, otpCode);
      
      if (!isValid) {
        setError('Code invalide. Veuillez réessayer.');
        toast.error('Code invalide');
        setIsLoading(false);
        return;
      }

      // OTP verified, proceed to password reset
      setStep('reset-password');
      toast.success('Code vérifié ! Vous pouvez maintenant réinitialiser votre mot de passe');
    } catch (error: any) {
      setError(error.message || 'Échec de la vérification du code');
      toast.error(error.message || 'Échec de la vérification du code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);
    try {
      const fullPhone = `${countryCode}${emailOrPhone.replace(/\s/g, '')}`;
      // Pass the OTP code that was already verified to ensure the reset function can proceed
      await authService.resetPasswordWithPhone(fullPhone, newPassword, otpCode);
      setStep('success');
      toast.success('Mot de passe réinitialisé avec succès !');
    } catch (error: any) {
      setError(error.message || 'Échec de la réinitialisation du mot de passe');
      toast.error(error.message || 'Échec de la réinitialisation du mot de passe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setIsSendingOTP(true);
    try {
      const fullPhone = `${countryCode}${emailOrPhone.replace(/\s/g, '')}`;
      await authService.sendOTP(fullPhone);
      toast.success('Code renvoyé avec succès !');
    } catch (error: any) {
      setError(error.message || 'Échec de l\'envoi du code');
      toast.error(error.message || 'Échec de l\'envoi du code');
    } finally {
      setIsSendingOTP(false);
    }
  };

  // Success screen
  if (step === 'success') {
    return (
      <div className="min-h-[80vh] flex">
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {resetMethod === 'email' ? 'Vérifiez votre email' : 'Mot de passe réinitialisé'}
            </h3>
            <p className="text-gray-600 mb-6">
              {resetMethod === 'email' 
                ? `Nous avons envoyé les instructions de réinitialisation à ${emailOrPhone}`
                : 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.'}
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à la connexion
            </Link>
          </div>
        </div>
        <div className="hidden lg:block lg:w-1/2 relative">
          <img
            src="https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3"
            alt="Success background"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-green-600/90 to-green-800/90" />
        </div>
      </div>
    );
  }

  // OTP Verification screen
  if (step === 'verify-otp') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-gray-900 mb-2">
              <Ticket className="h-8 w-8 text-indigo-600" />
              Temba
            </Link>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Vérifiez votre téléphone</h2>
            <p className="text-gray-600">
              Entrez le code à 6 chiffres envoyé à {countryCode} {emailOrPhone}
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
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtpCode(value);
                  setError('');
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
              onClick={handleVerifyOTP}
              disabled={isLoading || otpCode.length !== 6}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium mb-4"
            >
              {isLoading ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Vérification en cours...</span>
                </>
              ) : (
                'Vérifier le code'
              )}
            </button>

            <div className="space-y-3 text-center">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={isSendingOTP}
                className="block w-full text-sm text-indigo-600 hover:text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingOTP ? 'Envoi en cours...' : 'Renvoyer le code'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('input');
                  setOtpCode('');
                  setError('');
                }}
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

  // Password Reset screen (after OTP verification)
  if (step === 'reset-password') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-gray-900 mb-2">
              <Ticket className="h-8 w-8 text-indigo-600" />
              Temba
            </Link>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Nouveau mot de passe</h2>
            <p className="text-gray-600">Entrez votre nouveau mot de passe</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm p-8">
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError('');
                  }}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="••••••••"
                  required
                  minLength={8}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="••••••••"
                  required
                  minLength={8}
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isLoading ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    <span>Réinitialisation en cours...</span>
                  </>
                ) : (
                  'Réinitialiser le mot de passe'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Initial input screen
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
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Réinitialiser le mot de passe</h2>
            <p className="text-gray-600">Entrez votre email ou numéro de téléphone</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm p-8">
            {/* Method Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Méthode de réinitialisation
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setResetMethod('phone');
                    setEmailOrPhone('');
                    setCountryCode('+226');
                    setError('');
                  }}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    resetMethod === 'phone'
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
                    setResetMethod('email');
                    setEmailOrPhone('');
                    setError('');
                  }}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    resetMethod === 'email'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Mail className="h-5 w-5" />
                  <span className="font-medium">Email</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {resetMethod === 'phone' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro de téléphone
                  </label>
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
                        disabled={isLoading || isSendingOTP}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={emailOrPhone}
                      onChange={(e) => {
                        setEmailOrPhone(e.target.value);
                        setError('');
                      }}
                      className="block w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="nom@exemple.com"
                      required
                      disabled={isLoading || isSendingOTP}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || isSendingOTP}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading || isSendingOTP ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    <span>{isSendingOTP ? 'Envoi du code...' : 'Envoi en cours...'}</span>
                  </>
                ) : (
                  resetMethod === 'phone' ? 'Envoyer le code de vérification' : 'Envoyer les instructions'
                )}
              </button>

              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour à la connexion
              </Link>
            </form>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3"
          alt="Forgot password background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/90 to-indigo-800/90" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-md text-white">
            <h2 className="text-3xl font-bold mb-6">Mot de passe oublié ?</h2>
            <p className="text-lg text-indigo-100">
              Ne vous inquiétez pas ! Cela arrive aux meilleurs d'entre nous. Entrez votre adresse email et nous vous enverrons les instructions pour réinitialiser votre mot de passe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}