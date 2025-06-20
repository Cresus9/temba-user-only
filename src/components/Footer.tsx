import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, Mail, MapPin, Phone, Ticket, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase-client';
import NewsletterForm from './NewsletterForm';

export default function Footer() {
  const [aboutText, setAboutText] = useState('');
  
  useEffect(() => {
    const fetchAboutText = async () => {
      const { data, error } = await supabase
        .from('content_snippets')
        .select('content')
        .eq('key', 'footer_about')
        .single();

      if (!error && data) {
        setAboutText(data.content);
      }
    };

    fetchAboutText();
  }, []);

  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="container mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo.svg" alt="Temba Logo" className="h-8 w-auto" />
            </div>
            <p className="text-gray-600 mb-4">{aboutText || "Temba est la première plateforme de billetterie d'événements en Afrique de l'Ouest, offrant une solution simple et sécurisée pour acheter et gérer vos billets."}</p>
            <div className="flex space-x-4">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-indigo-600 transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-indigo-600 transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-indigo-600 transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-indigo-600 transition-colors">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
            <div>
              <h3 className="text-gray-900 font-semibold mb-4">À propos</h3>
              <ul className="space-y-3">
                <li>
                  <Link to="/events" className="text-gray-600 hover:text-indigo-600 transition-colors">Événements</Link>
                </li>
                <li>
                  <Link to="/categories" className="text-gray-600 hover:text-indigo-600 transition-colors">Catégories</Link>
                </li>
                <li>
                  <Link to="/about" className="text-gray-600 hover:text-indigo-600 transition-colors">À propos</Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-gray-900 font-semibold mb-4">Support</h3>
              <ul className="space-y-3">
                <li>
                  <Link to="/support" className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors">
                    <MessageSquare className="h-4 w-4" />
                    Support
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-gray-600 hover:text-indigo-600 transition-colors">Conditions d'utilisation</Link>
                </li>
                <li>
                  <Link to="/privacy" className="text-gray-600 hover:text-indigo-600 transition-colors">Politique de confidentialité</Link>
                </li>
                <li>
                  <Link to="/contact" className="text-gray-600 hover:text-indigo-600 transition-colors">Contact</Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-gray-900 font-semibold mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-gray-600">
                <MapPin className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                <span>123 Innovation Hub, Ouagadougou, Burkina Faso</span>
              </li>
              <li className="flex items-center gap-2 text-gray-600">
                <Phone className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                <span>+226 76 46 57 38</span>
              </li>
              <li className="flex items-center gap-2 text-gray-600">
                <Mail className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                <span>support@temba.com</span>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-gray-900 font-semibold mb-4">Newsletter</h3>
            <NewsletterForm />
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600 text-sm">
              © {new Date().getFullYear()} Temba. Tous droits réservés.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/terms" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">Conditions d'utilisation</Link>
              <Link to="/privacy" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">Politique de confidentialité</Link>
              <Link to="/cookies" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}