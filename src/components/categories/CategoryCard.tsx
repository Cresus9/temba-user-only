import React, { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Music, Film, Trophy, PartyPopper, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <motion.div
      whileHover={{ y: -5, boxShadow: '0 16px 40px -8px rgba(20,23,42,0.14)' }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 340, damping: 26 }}
      className="h-full"
    >
    <Link
      to={`/categories/${id}`}
      className="block h-full rounded-xl2"
      aria-label={`Voir les événements de la catégorie ${name}`}
    >
      <article className="relative flex flex-col h-full bg-paper rounded-xl2 border border-line hover:border-brand/40 shadow-card overflow-hidden transition-colors duration-300 group">
        {/* Image */}
        <div className="aspect-[16/10] w-full overflow-hidden flex-shrink-0 relative bg-cream-deep">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-cream-deep" />
          )}
          <img
            src={image || defaultImage}
            alt={`Image représentant la catégorie ${name}`}
            className={`h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06] ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
            onLoad={handleImageLoad}
            onError={handleImageError}
            decoding="async"
          />
          {/* Subtle dark veil for icon legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/15 to-transparent" />

          {/* Icon tile — branded */}
          <div className="absolute top-3 left-3">
            <div
              className="grid place-items-center w-9 h-9 rounded-lg text-paper backdrop-blur-sm border border-paper/15"
              style={{ backgroundColor: `${color}E6` }}
              aria-hidden="true"
            >
              {getIcon()}
            </div>
          </div>

          {/* Event count badge */}
          {eventCount !== undefined && eventCount > 0 && (
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-paper/95 text-ink text-[11px] font-semibold backdrop-blur-sm shadow-sm">
              {eventCount} événement{eventCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-3.5 min-h-0">
          <h3
            className="text-[15px] font-bold text-ink line-clamp-1 mb-1 tracking-tight"
            style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}
          >
            {name}
          </h3>

          <p className="text-[12px] text-ink-mute line-clamp-2 leading-relaxed flex-1 mb-2">
            {description}
          </p>

          {/* Subcategories */}
          {showSubcategories && subcategories.length > 0 && (
            <div className="mb-2.5" role="list" aria-label="Sous-catégories">
              <div className="flex flex-wrap gap-1">
                {subcategories.slice(0, 2).map((subcategory) => (
                  <span
                    key={subcategory}
                    className="rounded-full bg-cream border border-line px-2 py-0.5 text-[10px] font-medium text-ink-mute"
                    role="listitem"
                  >
                    {subcategory}
                  </span>
                ))}
                {subcategories.length > 2 && (
                  <span className="rounded-full bg-cream border border-line px-2 py-0.5 text-[10px] font-medium text-ink-mute">
                    +{subcategories.length - 2}
                  </span>
                )}
              </div>
            </div>
          )}

          <footer className="mt-auto flex items-center gap-1 text-[12px] font-semibold text-ink group-hover:text-brand transition-colors">
            <span>Explorer</span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </footer>
        </div>
      </article>
    </Link>
    </motion.div>
  );
});

CategoryCard.displayName = 'CategoryCard';

export default CategoryCard;