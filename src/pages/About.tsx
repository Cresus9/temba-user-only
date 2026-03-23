import React from 'react';
import { Building, Users, Target, Shield, Smartphone, Globe, MapPin, Mail, Phone, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:py-24 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold sm:text-5xl">
              À Propos de TEMBA
            </h1>
            <p className="mt-4 text-xl text-indigo-100">
              La plateforme officielle de billetterie d'événements au Burkina Faso
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <a 
                href="https://tembas.com" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-sm font-medium hover:bg-white/30 transition"
              >
                <Globe className="h-4 w-4" />
                tembas.com
              </a>
              <a 
                href="https://play.google.com/store/apps/details?id=app.rork.temba" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-sm font-medium hover:bg-white/30 transition"
              >
                <Smartphone className="h-4 w-4" />
                Google Play
              </a>
              <a 
                href="https://apps.apple.com/us/app/temba/id6748848506" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-sm font-medium hover:bg-white/30 transition"
              >
                <Smartphone className="h-4 w-4" />
                App Store
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        {/* Company Info */}
        <div className="bg-gray-50 rounded-2xl p-8 mb-12">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Informations Légales</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Raison sociale</dt>
                  <dd className="text-lg font-semibold text-gray-900">EZSTAY LLC</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Nom commercial</dt>
                  <dd className="text-lg font-semibold text-gray-900">TEMBA</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Site web officiel</dt>
                  <dd className="text-lg font-semibold text-indigo-600">
                    <a href="https://tembas.com">https://tembas.com</a>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Type d'activité</dt>
                  <dd className="text-lg font-semibold text-gray-900">Billetterie d'événements (vente primaire)</dd>
                </div>
              </dl>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact</h2>
              <dl className="space-y-3">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-indigo-500" />
                  <span className="text-gray-700">Secteur 23, Zone 1, Section KC, Parcelle 09-10, Ouagadougou, Burkina Faso</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-indigo-500" />
                  <a href="tel:+22674750815" className="text-gray-700 hover:text-indigo-600">+226 74 75 08 15</a>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-indigo-500" />
                  <a href="mailto:info@tembas.com" className="text-gray-700 hover:text-indigo-600">info@tembas.com</a>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Mission Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-indigo-100 text-indigo-600 mx-auto">
              <Building className="h-7 w-7" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-gray-900">Notre Entreprise</h3>
            <p className="mt-2 text-gray-500">
              TEMBA, une marque de EZSTAY LLC, est la plateforme de billetterie de référence au Burkina Faso, offrant un accès sécurisé aux meilleurs événements.
            </p>
          </div>
          <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-indigo-100 text-indigo-600 mx-auto">
              <Target className="h-7 w-7" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-gray-900">Notre Mission</h3>
            <p className="mt-2 text-gray-500">
              Connecter les amateurs d'événements avec des expériences inoubliables, tout en soutenant les organisateurs locaux et la culture africaine.
            </p>
          </div>
          <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-indigo-100 text-indigo-600 mx-auto">
              <Users className="h-7 w-7" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-gray-900">Notre Équipe</h3>
            <p className="mt-2 text-gray-500">
              Une équipe passionnée basée en Afrique, combinant expertise technologique et connaissance approfondie de l'industrie événementielle locale.
            </p>
          </div>
        </div>

        {/* Ticket Policy Section */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Notre Engagement</h2>
            <p className="mt-2 text-gray-500">Billetterie officielle et sécurisée</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-100 text-green-600 mx-auto">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">Vente Primaire</h3>
              <p className="mt-2 text-sm text-gray-500">
                Billets officiels vendus directement par les organisateurs
              </p>
            </div>
            <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 mx-auto">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">Prix Officiels</h3>
              <p className="mt-2 text-sm text-gray-500">
                Aucune majoration, prix fixés par les organisateurs
              </p>
            </div>
            <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-purple-100 text-purple-600 mx-auto">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">Transfert Gratuit</h3>
              <p className="mt-2 text-sm text-gray-500">
                Partagez vos billets gratuitement avec vos proches
              </p>
            </div>
            <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 text-gray-600 mx-auto">
                <XCircle className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">Pas de Revente</h3>
              <p className="mt-2 text-sm text-gray-500">
                La revente de billets est strictement interdite
              </p>
            </div>
          </div>
          <div className="mt-6 text-center">
            <Link to="/terms" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
              Voir nos Conditions d'Utilisation →
            </Link>
          </div>
        </div>

        {/* App Download Section */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Téléchargez l'Application TEMBA</h2>
            <p className="text-indigo-100 mb-6 max-w-2xl mx-auto">
              Disponible sur Google Play et App Store. Accédez à vos billets hors ligne, recevez des notifications et découvrez les événements près de chez vous.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="https://play.google.com/store/apps/details?id=app.rork.temba"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-6 py-3 bg-black rounded-xl hover:bg-gray-900 transition"
              >
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/>
                </svg>
                <div className="text-left">
                  <div className="text-xs text-gray-400">Disponible sur</div>
                  <div className="text-sm font-semibold">Google Play</div>
                </div>
              </a>
              <a
                href="https://apps.apple.com/us/app/temba/id6748848506"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-6 py-3 bg-black rounded-xl hover:bg-gray-900 transition"
              >
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div className="text-left">
                  <div className="text-xs text-gray-400">Télécharger sur</div>
                  <div className="text-sm font-semibold">App Store</div>
                </div>
              </a>
            </div>
            <p className="mt-6 text-sm text-indigo-200">
              Site web officiel : <a href="https://tembas.com" className="underline">tembas.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
