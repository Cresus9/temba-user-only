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
      className="block h-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-lg transition-all duration-200"
      aria-label={`Voir les événements de la catégorie ${name}`}
    >
      <article className="relative flex flex-col h-full bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-all duration-200 group">
        {/* Image */}
        <div className="aspect-[3/2] w-full overflow-hidden flex-shrink-0 relative">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}
          <img
            src={image || defaultImage}
            alt={`Image représentant la catégorie ${name}`}
            className={`h-full w-full object-cover transition-all duration-300 group-hover:scale-105 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
            onLoad={handleImageLoad}
            onError={handleImageError}
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
          
          {/* Icon overlay */}
          <div className="absolute top-3 left-3">
            <div 
              className="rounded-lg p-2 backdrop-blur-sm" 
              style={{ backgroundColor: `${color}dd` }}
              aria-hidden="true"
            >
              <div className="text-white">
                {getIcon()}
              </div>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex flex-col flex-1 p-3 min-h-0">
          <header className="mb-2">
            <h3 className="text-sm font-bold text-gray-900 line-clamp-1 mb-1">{name}</h3>
            <span className="text-xs font-medium text-indigo-600">
              {eventCount !== undefined ? (
                `${eventCount} événement${eventCount !== 1 ? 's' : ''}`
              ) : (
                'Chargement...'
              )}
            </span>
          </header>
          
          <p className="mb-2 text-gray-600 text-xs line-clamp-2 flex-1">{description}</p>
          
          {/* Subcategories */}
          {showSubcategories && subcategories.length > 0 && (
            <div className="mb-2" role="list" aria-label="Sous-catégories">
              <div className="flex flex-wrap gap-1">
                {subcategories.slice(0, 2).map((subcategory) => (
                  <span
                    key={subcategory}
                    className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                    role="listitem"
                  >
                    {subcategory}
                  </span>
                ))}
                {subcategories.length > 2 && (
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    +{subcategories.length - 2}
                  </span>
                )}
              </div>
            </div>
          )}
          
          <footer className="mt-auto flex items-center gap-1 text-xs font-medium text-indigo-600 group-hover:text-indigo-700 transition-colors">
            <span>Voir les événements</span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </footer>
        </div>
      </article>
    </Link>
  );
});

CategoryCard.displayName = 'CategoryCard';

export default CategoryCard;