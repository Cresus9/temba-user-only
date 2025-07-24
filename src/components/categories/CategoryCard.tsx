import React, { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Music, Film, Trophy, PartyPopper, ArrowRight } from 'lucide-react';

interface CategoryCardProps {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  image?: string;
  subcategories?: string[];
  eventCount?: number;
  showSubcategories?: boolean;
}

const CategoryCard = memo(({
  id,
  name,
  description,
  icon,
  color,
  image,
  subcategories = [],
  eventCount = 0,
  showSubcategories = false
}: CategoryCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const getIcon = () => {
    switch (icon) {
      case 'music':
        return <Music className="h-5 w-5" aria-hidden="true" />;
      case 'clapperboard':
        return <Film className="h-5 w-5" aria-hidden="true" />;
      case 'trophy':
        return <Trophy className="h-5 w-5" aria-hidden="true" />;
      case 'party-popper':
        return <PartyPopper className="h-5 w-5" aria-hidden="true" />;
      default:
        return <Music className="h-5 w-5" aria-hidden="true" />;
    }
  };

  const defaultImage = `https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=300&fit=crop&crop=center`;

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <Link 
      to={`/categories/${id}`} 
      className="block h-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-xl transition-all duration-200"
      aria-label={`Voir les événements de la catégorie ${name}`}
    >
      <article className="relative flex flex-col h-full bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-200 group">
        {/* Image */}
        <div className="aspect-[4/3] w-full overflow-hidden flex-shrink-0 relative">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}
          <img
            src={image || defaultImage}
            alt={`Image représentant la catégorie ${name}`}
            className={`h-full w-full object-cover transition-all duration-300 group-hover:scale-110 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
            onLoad={handleImageLoad}
            onError={handleImageError}
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
        </div>
        
        {/* Content */}
        <div className="flex flex-col flex-1 p-4 pt-3 min-h-0">
          <header className="flex items-center gap-2 mb-2">
            <div 
              className="rounded-full p-1.5 flex-shrink-0" 
              style={{ backgroundColor: `${color}22` }}
              aria-hidden="true"
            >
              {getIcon()}
            </div>
            <h3 className="text-lg font-bold text-gray-900 truncate">{name}</h3>
          </header>
          
          <div className="mb-2">
            <span className="text-xs font-medium text-indigo-700">
              {eventCount !== undefined ? (
                `${eventCount} Événement${eventCount !== 1 ? 's' : ''} Disponible${eventCount !== 1 ? 's' : ''}`
              ) : (
                'Chargement...'
              )}
            </span>
          </div>
          
          <p className="mb-2 text-gray-700 text-sm line-clamp-2 flex-1">{description}</p>
          
          {/* Subcategories */}
          {showSubcategories && subcategories.length > 0 && (
            <div className="mb-2" role="list" aria-label="Sous-catégories">
              <div className="flex flex-wrap gap-1">
                {subcategories.slice(0, 3).map((subcategory) => (
                  <span
                    key={subcategory}
                    className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                    role="listitem"
                  >
                    {subcategory}
                  </span>
                ))}
                {subcategories.length > 3 && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                    +{subcategories.length - 3} plus
                  </span>
                )}
              </div>
            </div>
          )}
          
          <footer className="mt-auto flex items-center gap-1 text-xs font-medium text-indigo-700 group-hover:text-indigo-900 transition-colors pt-2">
            <span>Voir les événements</span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </footer>
        </div>
      </article>
    </Link>
  );
});

CategoryCard.displayName = 'CategoryCard';

export default CategoryCard;