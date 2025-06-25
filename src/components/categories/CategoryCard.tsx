import React, { memo } from 'react';
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
  const getIcon = () => {
    switch (icon) {
      case 'music':
        return <Music className="h-8 w-8" />;
      case 'clapperboard':
        return <Film className="h-8 w-8" />;
      case 'trophy':
        return <Trophy className="h-8 w-8" />;
      case 'party-popper':
        return <PartyPopper className="h-8 w-8" />;
      default:
        return <Music className="h-8 w-8" />;
    }
  };

  const defaultImage = `https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=300&fit=crop&crop=center`;

  return (
    <Link to={`/categories/${id}`} className="block">
      <div className="relative flex flex-col h-full bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow duration-200">
        {/* Image */}
        <div className="aspect-[4/3] w-full overflow-hidden">
          <img
            src={image || defaultImage}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
        </div>
        {/* Content */}
        <div className="flex flex-col flex-1 p-6 pt-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full p-2" style={{ backgroundColor: `${color}22` }}>
              {getIcon()}
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{name}</h3>
          </div>
          <span className="text-sm font-medium text-indigo-700 mb-2">
            {eventCount} Événement{eventCount !== 1 ? 's' : ''} Disponible{eventCount !== 1 ? 's' : ''}
          </span>
          <p className="mb-3 text-gray-700 text-base line-clamp-2">{description}</p>
          {/* Subcategories */}
          {showSubcategories && subcategories.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {subcategories.slice(0, 3).map((subcategory) => (
                <span
                  key={subcategory}
                  className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                >
                  {subcategory}
                </span>
              ))}
              {subcategories.length > 3 && (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                  +{subcategories.length - 3} more
                </span>
              )}
            </div>
          )}
          <div className="mt-auto flex items-center gap-2 text-sm font-medium text-indigo-700 hover:text-indigo-900 transition-colors">
            <span>Voir les événements</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </Link>
  );
});

CategoryCard.displayName = 'CategoryCard';

export default CategoryCard;