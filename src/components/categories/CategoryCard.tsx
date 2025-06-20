import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { Music, Film, Trophy, PartyPopper, ArrowRight } from 'lucide-react';

interface CategoryCardProps {
  id: string;
  name: string;
  description: string;
  icon: string;
  image: string;
  subcategories: string[];
  eventCount?: number;
}

const CategoryCard = memo(({
  id,
  name,
  description,
  icon,
  image,
  subcategories,
  eventCount
}: CategoryCardProps) => {
  const getIcon = () => {
    switch (icon) {
      case 'music':
        return <Music className="h-8 w-8" />;
      case 'film':
        return <Film className="h-8 w-8" />;
      case 'trophy':
        return <Trophy className="h-8 w-8" />;
      case 'party':
        return <PartyPopper className="h-8 w-8" />;
      default:
        return null;
    }
  };

  return (
    <Link
      to={`/categories/${id}`}
      className="group relative flex flex-col overflow-hidden rounded-xl bg-white shadow-sm transition-all hover:shadow-md"
    >
      {/* Image Container */}
      <div className="aspect-[4/3] w-full overflow-hidden">
        <img
          src={image}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
      </div>
      
      {/* Content Container */}
      <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-full bg-white/20 p-2 backdrop-blur-sm">
            {getIcon()}
          </div>
          <div>
            <h3 className="text-2xl font-bold">{name}</h3>
            {eventCount !== undefined && (
              <span className="text-sm text-white/90">
                {eventCount} Événements Disponibles
              </span>
            )}
          </div>
        </div>

        <p className="mb-4 text-lg text-white/90">{description}</p>

        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {subcategories.map((subcategory) => (
              <span
                key={subcategory}
                className="rounded-full bg-white/20 px-3 py-1 text-sm backdrop-blur-sm"
              >
                {subcategory}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm font-medium text-white/90 group-hover:text-white">
          <span>Voir les événements</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
});

CategoryCard.displayName = 'CategoryCard';

export default CategoryCard;