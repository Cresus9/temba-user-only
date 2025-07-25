import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../context/TranslationContext';
import HomeSearch from '../components/search/HomeSearch';
import EventCardList from '../components/EventCardList';
import Banner from '../components/home/Banner';
import Features from '../components/home/Features';
import CategoryList from '../components/categories/CategoryList';
import AppDownload from '../components/home/AppDownload';

export default function Home() {
  const { t } = useTranslation();

  return (
    <div>
      {/* Banner Section */}
      <Banner />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 py-20">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Découvrez et Réservez des{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200">
                Événements Incroyables
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 mb-12 max-w-3xl mx-auto leading-relaxed">
              Trouvez les meilleurs concerts, festivals et événements culturels en Afrique de l'Ouest
            </p>
          </div>
          
          <HomeSearch />
        </div>
      </section>

      {/* Featured Events Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Événements à la Une
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
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
          <CategoryList showSubcategories={true} />
        </div>
      </section>

      {/* App Download Section */}
      <AppDownload />

      {/* Features Section */}
      <Features />
    </div>
  );
}