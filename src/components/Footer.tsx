import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, Mail, MapPin, Phone, MessageSquare, Heart } from 'lucide-react';
import NewsletterForm from './NewsletterForm';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12 lg:py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Company Info */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <img src="/logo.svg" alt="Temba Logo" className="h-10 w-auto" />
            </div>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Votre plateforme de confiance pour découvrir et réserver des événements incroyables à travers l'Afrique.
            </p>
            <div className="flex space-x-4">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-300 hover:text-white hover:bg-indigo-600 transition-all duration-200"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-300 hover:text-white hover:bg-indigo-600 transition-all duration-200"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-300 hover:text-white hover:bg-indigo-600 transition-all duration-200"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a 
                href="https://youtube.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-300 hover:text-white hover:bg-indigo-600 transition-all duration-200"
              >
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-6">Navigation</h3>
            <ul className="space-y-4">
              <li>
                <Link to="/events" className="text-gray-300 hover:text-white transition-colors duration-200">Événements</Link>
              </li>
              <li>
                <Link to="/categories" className="text-gray-300 hover:text-white transition-colors duration-200">Catégories</Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-300 hover:text-white transition-colors duration-200">À propos</Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-300 hover:text-white transition-colors duration-200">Contact</Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-6">Support</h3>
            <ul className="space-y-4">
              <li>
                <Link to="/support" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-200">
                  <MessageSquare className="h-4 w-4" />
                  Support
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-gray-300 hover:text-white transition-colors duration-200">Conditions d'utilisation</Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-300 hover:text-white transition-colors duration-200">Politique de confidentialité</Link>
              </li>
              <li>
                <Link to="/cookies" className="text-gray-300 hover:text-white transition-colors duration-200">Politique de cookies</Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="sm:col-span-2 lg:col-span-1">
            <h3 className="text-white font-semibold text-lg mb-6">Newsletter</h3>
            <p className="text-gray-300 mb-4">
              Restez informé des derniers événements et offres exclusives.
            </p>
            <NewsletterForm />
          </div>
        </div>

        {/* Contact Info - All Screens */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3 text-gray-300">
              <MapPin className="h-5 w-5 text-indigo-400 flex-shrink-0" />
              <span className="text-sm">Secteur 23, Zone 1, Section KC, Parcelle 09-10, Ouagadougou</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <Phone className="h-5 w-5 text-indigo-400 flex-shrink-0" />
              <span className="text-sm">+226 74 75 08 15</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <Mail className="h-5 w-5 text-indigo-400 flex-shrink-0" />
              <span className="text-sm">info@tembas.com</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-gray-400">
              <p>© {new Date().getFullYear()} Temba. Tous droits réservés.</p>
              <span className="hidden sm:inline">•</span>
              <p className="flex items-center gap-1">
                Fait avec <Heart className="h-4 w-4 text-red-500" /> en Afrique
              </p>
            </div>
            <div className="flex flex-wrap gap-6 justify-center lg:justify-end">
              <Link to="/terms" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">Conditions</Link>
              <Link to="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">Confidentialité</Link>
              <Link to="/cookies" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">Cookies</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}