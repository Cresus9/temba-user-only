import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../context/TranslationContext';
import HomeSearch from '../components/search/HomeSearch';
import EventCardList from '../components/EventCardList';
import Banner from '../components/home/Banner';
import Features from '../components/home/Features';
import CategoryList from '../components/categories/CategoryList';

export default function Home() {
  const { t } = useTranslation();

  return (
    <div>
      {/* Banner Section */}
      <Banner />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-indigo-900 to-indigo-800 py-16">
        <div className="relative h-full flex flex-col items-center justify-center text-center px-4 max-w-5xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Découvrez et Réservez des Événements Incroyables
          </h1>
          <p className="text-xl text-gray-200 mb-8 max-w-2xl">
            Trouvez les meilleurs concerts, festivals et événements culturels en Afrique de l'Ouest
          </p>
          
          <HomeSearch />
        </div>
      </section>

      {/* Featured Events Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-[var(--gray-900)] mb-4">
              Événements à la Une
            </h2>
            <p className="text-lg text-[var(--gray-600)] max-w-2xl mx-auto">
              Découvrez les événements les plus populaires et ne manquez pas les expériences incontournables
            </p>
          </div>
          <div className="flex justify-between items-center mb-8">
            <Link to="/events" className="text-[var(--primary-600)] hover:text-[var(--primary-700)]">
              Voir tous les événements
            </Link>
          </div>
          <EventCardList featured={true} limit={6} />
        </div>
      </section>

      {/* Popular Categories Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[var(--gray-900)] mb-4">
              Catégories Populaires
            </h2>
            <p className="text-lg text-[var(--gray-600)] max-w-2xl mx-auto">
              Explorez les événements par catégorie et trouvez ceux qui correspondent à vos intérêts
            </p>
          </div>
          <CategoryList showSubcategories={true} />
        </div>
      </section>

      {/* Features Section */}
      <Features />
    </div>
  );
}
