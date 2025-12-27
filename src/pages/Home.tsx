import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../context/TranslationContext';
import { useEvents } from '../context/EventContext';
import HomeSearch from '../components/search/HomeSearch';
import EventCardList from '../components/EventCardList';
import Banner from '../components/home/Banner';
import Features from '../components/home/Features';
import CategoryList from '../components/categories/CategoryList';
import AppDownload from '../components/home/AppDownload';
import HowItWorks from '../components/home/HowItWorks';
import { imagePreloader } from '../utils/imagePreloader';
import PageSEO from '../components/SEO/PageSEO';
import CategoryEventsDisplay from '../components/events/CategoryEventsDisplay';
import UpcomingEvents from '../components/events/UpcomingEvents';

export default function Home() {
  const { t } = useTranslation();
  const { featuredEvents } = useEvents();

  // Preload featured event images for instant loading
  useEffect(() => {
    if (featuredEvents && featuredEvents.length > 0) {
      // Preload first 6 featured event images
      const imagesToPreload = featuredEvents
        .slice(0, 6)
        .filter(event => event.image_url)
        .map(event => ({ image_url: event.image_url, title: event.title }));

      if (imagesToPreload.length > 0) {
        console.log('🚀 Preloading', imagesToPreload.length, 'featured event images...');
        imagePreloader.preloadEventImages(imagesToPreload);
      }
    }
  }, [featuredEvents]);

  const structuredData = useMemo(
    () => [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Temba',
        url: 'https://tembas.com/',
        logo: 'https://tembas.com/temba-app.png',
        sameAs: [
          'https://www.facebook.com/temba',
          'https://www.instagram.com/temba',
          'https://www.linkedin.com/company/temba',
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Temba',
        url: 'https://tembas.com/',
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://tembas.com/events?query={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      },
    ],
    []
  );

  return (
    <div>
      <PageSEO
        title="Billetterie d’événements au Burkina Faso"
        description="Achetez vos billets en ligne pour des concerts, festivals et événements culturels au Burkina Faso. Paiement sécurisé en FCFA, transferts instantanés et support local."
        canonicalUrl="https://tembas.com/"
        ogImage="https://tembas.com/temba-app.png"
        keywords={[
          'billets Burkina Faso',
          'billetterie en ligne',
          'événements à Ouagadougou',
          'concerts Burkina Faso',
          'festivals Afrique de l’Ouest',
        ]}
        structuredData={structuredData}
      />
      {/* Banner Section */}
      <Banner />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 py-12 md:py-16">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
              Découvrez et Réservez des{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200">
                Événements Incroyables
              </span>
            </h1>
            <p className="text-base md:text-lg text-gray-200 mb-8 max-w-2xl mx-auto leading-relaxed">
              Trouvez les meilleurs concerts, festivals et événements culturels en Afrique de l'Ouest
            </p>
          </div>
          
          <HomeSearch />
        </div>
      </section>

      {/* Featured Events Section - Keep as is */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              Événements à la Une
            </h2>
            <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Découvrez les événements les plus populaires et ne manquez pas les expériences incontournables
            </p>
          </div>
          <div className="flex justify-between items-center mb-8">
            <Link 
              to="/events" 
              className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
            >
              Voir tous les événements →
            </Link>
          </div>
          <EventCardList featured={true} limit={9} showNavigation={true} />
        </div>
      </section>

      {/* New Mobile-Style Design - Category-Based Sections */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          {/* Upcoming Events List - Mobile Style */}
          <UpcomingEvents limit={6} />
          
          {/* Category-Based Sections - Mobile Style */}
          <div className="mt-12">
            <CategoryEventsDisplay
              searchQuery=""
              locationFilter=""
              dateFilter=""
            />
          </div>
        </div>
      </section>

      {/* Popular Categories Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Catégories Populaires
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Explorez les événements par catégorie et trouvez ceux qui correspondent à vos intérêts
            </p>
          </div>
          <CategoryList />
        </div>
      </section>

      {/* How It Works Section */}
      <HowItWorks />

      {/* Features Section */}
      <Features />

      {/* App Download Section */}
      <AppDownload />
    </div>
  );
}