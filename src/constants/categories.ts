export const CATEGORIES = [
  {
    id: 'music-concerts',
    name: 'Concerts de Musique',
    description: 'Performances live des meilleurs artistes',
    icon: 'music',
    image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae',
    subcategories: ['Afrobeats', 'Jazz', 'Traditionnel']
  },
  {
    id: 'cinema',
    name: 'Cinéma',
    description: 'Premières de films et festivals de cinéma',
    icon: 'film',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba',
    subcategories: ['Premières', 'Festivals de Film', 'Projections']
  },
  {
    id: 'sports',
    name: 'Sports',
    description: 'Grands événements sportifs',
    icon: 'trophy',
    image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211',
    subcategories: ['Football', 'Athlétisme', 'Boxe']
  },
  {
    id: 'festivals',
    name: 'Festivals',
    description: 'Célébrations culturelles et festivals',
    icon: 'party',
    image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3',
    subcategories: ['Culturel', 'Gastronomie', 'Art', 'Musique']
  }
] as const;

export type CategoryId = typeof CATEGORIES[number]['id'];