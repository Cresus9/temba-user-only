import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Trash2, Shield, Clock, Mail, Phone, ExternalLink } from 'lucide-react';

export default function AccountDeletion() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Supprimer votre compte Temba
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Cette page vous explique comment supprimer définitivement votre compte et toutes vos données associées.
          </p>
        </div>

        {/* Warning Alert */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Attention : Action irréversible
              </h3>
              <p className="text-red-700">
                La suppression de votre compte est définitive. Toutes vos données personnelles, 
                billets, commandes et historique seront supprimés de manière permanente. 
                Cette action ne peut pas être annulée.
              </p>
            </div>
          </div>
        </div>

        {/* How to Delete Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Shield className="w-6 h-6 mr-3 text-blue-600" />
            Comment supprimer votre compte
          </h2>
          
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-blue-600 font-semibold text-sm">1</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Connectez-vous à votre compte</h3>
                <p className="text-gray-600 mb-3">
                  Accédez à la page de connexion de Temba
                </p>
                <Link 
                  to="/login" 
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
                >
                  Se connecter
                  <ExternalLink className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-blue-600 font-semibold text-sm">2</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Accédez aux paramètres du compte</h3>
                <p className="text-gray-600 mb-3">
                  Une fois connecté, allez dans votre profil et sélectionnez "Paramètres du compte"
                </p>
                <Link 
                  to="/profile/settings" 
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
                >
                  Paramètres du compte
                  <ExternalLink className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-blue-600 font-semibold text-sm">3</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Confirmez la suppression</h3>
                <p className="text-gray-600">
                  Faites défiler jusqu'à la section "Supprimer le compte", tapez 
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm mx-1">
                    "delete my account"
                  </span>
                  et cliquez sur "Confirmer la suppression"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Data Deletion Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Données supprimées
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                Données supprimées immédiatement
              </h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Informations personnelles (nom, email, téléphone)
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Informations du profil
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Tous vos billets d'événements
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Historique des commandes
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Méthodes de paiement sauvegardées
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Historique de connexion
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Préférences de notification
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Paramètres du compte
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-amber-800 mb-4 flex items-center">
                <div className="w-2 h-2 bg-amber-500 rounded-full mr-3"></div>
                Données conservées (obligations légales)
              </h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center">
                  <span className="text-amber-500 mr-2">⚠</span>
                  Enregistrements de transactions financières
                </li>
                <li className="flex items-center">
                  <span className="text-amber-500 mr-2">⚠</span>
                  Informations fiscales (si applicable)
                </li>
                <li className="flex items-center">
                  <span className="text-amber-500 mr-2">⚠</span>
                  Données de prévention de la fraude
                </li>
                <li className="flex items-center">
                  <span className="text-amber-500 mr-2">⚠</span>
                  Enregistrements de conformité réglementaire
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Data Retention Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Clock className="w-6 h-6 mr-3 text-blue-600" />
            Périodes de conservation des données
          </h2>
          
          <div className="space-y-4">
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold text-gray-900">Données du compte</h3>
              <p className="text-gray-600">Supprimées immédiatement après confirmation</p>
            </div>
            
            <div className="border-l-4 border-amber-500 pl-4">
              <h3 className="font-semibold text-gray-900">Enregistrements financiers</h3>
              <p className="text-gray-600">Conservés pendant 7 ans (obligation légale)</p>
            </div>
            
            <div className="border-l-4 border-amber-500 pl-4">
              <h3 className="font-semibold text-gray-900">Données de conformité</h3>
              <p className="text-gray-600">Conservées selon les exigences de la réglementation applicable</p>
            </div>
          </div>
        </div>

        {/* Contact Support Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Besoin d'aide ?
          </h2>
          
          <p className="text-gray-600 mb-6">
            Si vous rencontrez des difficultés pour supprimer votre compte ou si vous avez des questions 
            concernant la suppression de vos données, notre équipe de support est là pour vous aider.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-center p-4 bg-gray-50 rounded-lg">
              <Mail className="w-6 h-6 text-blue-600 mr-3" />
              <div>
                <h3 className="font-semibold text-gray-900">Email</h3>
                <a 
                  href="mailto:support@temba.com" 
                  className="text-blue-600 hover:text-blue-700"
                >
                  support@temba.com
                </a>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-gray-50 rounded-lg">
              <Phone className="w-6 h-6 text-blue-600 mr-3" />
              <div>
                <h3 className="font-semibold text-gray-900">Téléphone</h3>
                <a 
                  href="tel:+22674750815" 
                  className="text-blue-600 hover:text-blue-700"
                >
                  +226 74 75 08 15
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="text-center">
          <div className="flex justify-center space-x-6 text-sm text-gray-500">
            <Link to="/privacy" className="hover:text-gray-700">
              Politique de confidentialité
            </Link>
            <Link to="/terms" className="hover:text-gray-700">
              Conditions d'utilisation
            </Link>
            <Link to="/contact" className="hover:text-gray-700">
              Contact
            </Link>
          </div>
          
          <p className="text-xs text-gray-400 mt-4">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </p>
        </div>
      </div>
    </div>
  );
}
