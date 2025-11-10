import React, { useEffect, useState, useMemo } from 'react';
import { Search, Filter } from 'lucide-react';
import CategoryList from '../components/categories/CategoryList';
import { useCategoryStore } from '../stores/categoryStore';
import { EventCategory } from '../types/event';
import PageSEO from '../components/SEO/PageSEO';

export default function Categories() {
  const { categories, loading, error, fetchCategories } = useCategoryStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [filteredCategories, setFilteredCategories] = useState<EventCategory[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    let filtered = categories;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(category =>
        category.name.toLowerCase().includes(query) ||
        category.description?.toLowerCase().includes(query) ||
        category.subcategories?.some(sub => sub.toLowerCase().includes(query))
      );
    }

    // Filter by subcategory
    if (selectedSubcategory) {
      filtered = filtered.filter(category =>
        category.subcategories?.includes(selectedSubcategory)
      );
    }

    setFilteredCategories(filtered);
  }, [categories, searchQuery, selectedSubcategory]);

  const allSubcategories = categories
    .flatMap(category => category.subcategories || [])
    .filter((subcategory, index, array) => array.indexOf(subcategory) === index)
    .sort();

  const handleCategorySelect = (categoryId: string) => {
    // Navigate to category page
    window.location.href = `/categories/${categoryId}`;
  };

  const collectionSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Catégories d’événements',
    url: 'https://tembas.com/categories',
    description:
      'Parcourez les catégories d’événements sur Temba pour trouver concerts, festivals, spectacles et activités au Burkina Faso.',
    hasPart: categories.map((category) => ({
      '@type': 'CollectionPage',
      name: category.name,
      url: `https://tembas.com/categories/${category.id}`,
      description: category.description || undefined,
    })),
  }), [categories]);

  const breadcrumbSchema = useMemo(() => ({
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
        name: 'Catégories',
        item: 'https://tembas.com/categories',
      },
    ],
  }), []);

  const structuredData = useMemo(() => {
    const data = [];
    if (breadcrumbSchema) data.push(breadcrumbSchema);
    if (collectionSchema) data.push(collectionSchema);
    return data.length ? data : undefined;
  }, [breadcrumbSchema, collectionSchema]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Chargement des catégories...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-600 mb-4 text-sm">{error}</p>
          <button 
            onClick={fetchCategories}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageSEO
        title="Catégories d’événements"
        description="Retrouvez toutes les catégories d’événements disponibles sur Temba : concerts, festivals, clubs, conférences et plus encore au Burkina Faso."
        canonicalUrl="https://tembas.com/categories"
        ogImage="https://tembas.com/temba-app.png"
        keywords={[
          'catégories événements Burkina Faso',
          'sorties Ouagadougou',
          'concerts par catégorie',
          'festivals Burkina',
          'agenda culturel FCFA',
        ]}
        structuredData={structuredData}
      />
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-800 via-indigo-800 to-indigo-900 py-12 md:py-16">
        <div className="absolute inset-0 bg-black/15"></div>
        <div className="relative container mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
              Découvrez les Événements par{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-200">
                Catégorie
              </span>
            </h1>
            <p className="text-base md:text-lg text-slate-200 mb-8 max-w-3xl mx-auto leading-relaxed">
              Explorez notre sélection d'événements organisés par thème. De la musique aux sports, trouvez l'expérience parfaite pour vous.
            </p>
          </div>
          
          {/* Search and Filters in Hero */}
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher une catégorie..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm bg-white rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
                />
              </div>
              
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/70" />
                <select
                  value={selectedSubcategory || ''}
                  onChange={(e) => setSelectedSubcategory(e.target.value || null)}
                  className="w-full md:w-auto px-10 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-colors text-sm font-medium border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  <option value="" className="text-gray-900">Toutes les Sous-catégories</option>
                  {allSubcategories.map(subcategory => (
                    <option key={subcategory} value={subcategory} className="text-gray-900">
                      {subcategory}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <div className="container mx-auto px-4 py-8">
        {/* Active filters */}
        {(searchQuery || selectedSubcategory) && (
          <div className="flex items-center gap-2 flex-wrap mb-6">
            <span className="text-xs text-gray-600">Filtres actifs:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs">
                Recherche: "{searchQuery}"
                <button
                  onClick={() => setSearchQuery('')}
                  className="ml-1 text-indigo-600 hover:text-indigo-800"
                >
                  ×
                </button>
              </span>
            )}
            {selectedSubcategory && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs">
                Sous-catégorie: {selectedSubcategory}
                <button
                  onClick={() => setSelectedSubcategory(null)}
                  className="ml-1 text-indigo-600 hover:text-indigo-800"
                >
                  ×
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedSubcategory(null);
              }}
              className="text-xs text-indigo-600 hover:text-indigo-700"
            >
              Effacer tout
            </button>
          </div>
        )}

        {/* Results count */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            {filteredCategories.length} catégorie{filteredCategories.length !== 1 ? 's' : ''} trouvée{filteredCategories.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Categories Grid */}
        {filteredCategories.length > 0 ? (
          <CategoryList 
            showSubcategories={true}
            onCategorySelect={handleCategorySelect}
          />
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-2">
              Aucune catégorie trouvée
            </h3>
            <p className="text-sm text-gray-600">
              Essayez d'ajuster vos termes de recherche ou vos filtres
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
