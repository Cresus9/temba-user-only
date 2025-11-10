import React, { useState, useMemo } from 'react';
import { Mail, Phone, MapPin, Clock, Send, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase-client';
import toast from 'react-hot-toast';
import PageSEO from '../components/SEO/PageSEO';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data, error } = await supabase.rpc(
        'create_anonymous_support_ticket',
        {
          p_name: formData.name,
          p_email: formData.email,
          p_subject: formData.subject,
          p_message: formData.message
        }
      );

      if (error) throw error;

      toast.success('Message envoyé avec succès ! Notre équipe vous contactera bientôt.');
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      console.error('Erreur lors de la soumission du formulaire:', error);
      toast.error("Échec de l'envoi du message. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  const structuredData = useMemo(
    () => [
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Accueil',
            item: 'https://tembas.com/',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Contact',
            item: 'https://tembas.com/contact',
          },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        name: 'Contact Temba',
        url: 'https://tembas.com/contact',
        description:
          'Contactez l’équipe Temba pour toute question sur vos billets, les événements ou le support client.',
        contactPoint: [
          {
            '@type': 'ContactPoint',
            telephone: '+22674750815',
            contactType: 'customer service',
            areaServed: 'BF',
            availableLanguage: ['French'],
            email: 'info@tembas.com',
          },
        ],
        mainEntityOfPage: 'https://tembas.com/contact',
      },
    ],
    []
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <PageSEO
        title="Contact"
        description="Besoin d’aide ? Contactez l’équipe Temba par email, téléphone ou via notre formulaire pour toute question sur vos billets et événements."
        canonicalUrl="https://tembas.com/contact"
        ogImage="https://tembas.com/temba-app.png"
        keywords={[
          'contact Temba',
          'service client billetterie',
          'assistance billets Burkina',
          'support Temba',
        ]}
        structuredData={structuredData}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Contact Information */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Contactez-nous</h1>
          <p className="text-gray-600 mb-8">
            Vous avez des questions ? Nous sommes là pour vous aider. Contactez notre équipe via l'un des canaux ci-dessous.
          </p>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Mail className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Email</h3>
                <p className="text-gray-600">info@tembas.com</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Phone className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Téléphone</h3>
                <p className="text-gray-600">+226 74 75 08 15</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <MapPin className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Adresse</h3>
                <p className="text-gray-600">Secteur 23, Zone 1, Section KC, Parcelle 09-10<br />Ouagadougou, Burkina Faso</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Heures d'ouverture</h3>
                <p className="text-gray-600">Lun-Ven de 9h à 18h WAT</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Envoyez-nous un message</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Votre Nom
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Adresse Email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                Sujet
              </label>
              <input
                type="text"
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                rows={4}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  <span>Envoyer le message</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}