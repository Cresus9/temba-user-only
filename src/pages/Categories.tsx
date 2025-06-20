import React from 'react';
import { Search, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CategoryList from '../components/categories/CategoryList';
import { useTranslation } from '../context/TranslationContext';

export default function Categories() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
        {t('common.back', { default: 'Back' })}
      </button>

      <div className="mb-8 text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-900">
          {t('categories.title', { default: 'Event Categories' })}
        </h1>
        <p className="mx-auto max-w-2xl text-gray-600">
          {t('categories.description', { default: 'Discover events by category. From music concerts to sports events, find experiences that match your interests.' })}
        </p>
      </div>

      <div className="mb-12">
        <div className="mx-auto max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('categories.search.placeholder', { default: 'Search categories...' })}
              className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      <CategoryList />
    </div>
  );
}
