import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader, CheckCircle, AlertCircle, Ticket } from 'lucide-react';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await authService.resetPassword(email);
      setIsSuccess(true);
      toast.success('Instructions de réinitialisation envoyées à votre email');
    } catch (error: any) {
      console.error('Erreur de réinitialisation du mot de passe:', error);
      toast.error(error.message || 'Échec de l\'envoi des instructions');
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
            <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-gray-900 mb-2">
              <Ticket className="h-8 w-8 text-indigo-600" />
              Temba
            </Link>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Réinitialiser le mot de passe</h2>
            <p className="text-gray-600">Entrez votre email pour recevoir les instructions</p>
          </div>

          {isSuccess ? (
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Vérifiez votre email</h3>
              <p className="text-gray-600 mb-6">
                Nous avons envoyé les instructions de réinitialisation à {email}
              </p>
              <Link
                to="/login"
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="nom@exemple.com"
                    required
                  />
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
                    <span>Envoi en cours...</span>
                  </>
                ) : (
                  'Envoyer les instructions'
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
          )}
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