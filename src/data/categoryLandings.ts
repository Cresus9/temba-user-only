import { foldAscii, slugifyFr } from '../utils/slugFr';

export type CategoryLanding = {
  slug: string;
  name: string;
  description: string;
  /** Incoming English / UUID-era paths that must still resolve. */
  aliases: string[];
};

export const CATEGORY_LANDINGS: CategoryLanding[] = [
  {
    slug: 'concerts-de-musique',
    name: 'Concerts de Musique',
    description: 'Performances live des meilleurs artistes',
    aliases: ['music-concerts', 'music concerts', 'concerts'],
  },
  {
    slug: 'cinema',
    name: 'Cinéma',
    description: 'Premières de films et festivals de cinéma',
    aliases: ['movies', 'film', 'films'],
  },
  {
    slug: 'sport',
    name: 'Sports',
    description: 'Grands événements sportifs',
    aliases: ['sports'],
  },
  {
    slug: 'festivals',
    name: 'Festivals',
    description: 'Célébrations culturelles et festivals',
    aliases: [],
  },
];

export function categoryLandingFromParam(param: string | undefined): CategoryLanding | undefined {
  if (!param) return undefined;
  const folded = foldAscii(param.replace(/-/g, ' '));
  return CATEGORY_LANDINGS.find(
    (c) =>
      c.slug === param.toLowerCase() ||
      foldAscii(c.name) === folded ||
      c.aliases.some((a) => foldAscii(a) === folded || a === param.toLowerCase())
  );
}

export function categoryLandingFromRecord(category: {
  id?: string;
  slug?: string | null;
  name?: string | null;
}): CategoryLanding | undefined {
  const keys = [category.slug, category.name, category.id].filter(Boolean) as string[];
  for (const key of keys) {
    const hit = categoryLandingFromParam(key);
    if (hit) return hit;
  }
  return undefined;
}

/** Public path: French slug. Never emit music-concerts / UUID when we have a name. */
export function categoryPublicSlug(category: {
  id?: string;
  slug?: string | null;
  name?: string | null;
}): string {
  const landing = categoryLandingFromRecord(category);
  if (landing) return landing.slug;
  const fromName = category.name ? slugifyFr(category.name) : '';
  if (fromName && !isEnglishCategorySlug(fromName)) return fromName;
  if (category.slug && !isEnglishCategorySlug(category.slug)) return category.slug;
  return fromName || category.slug || category.id || '';
}

export function categoryPublicPath(category: {
  id?: string;
  slug?: string | null;
  name?: string | null;
}): string {
  return `/categories/${categoryPublicSlug(category)}`;
}

function isEnglishCategorySlug(slug: string): boolean {
  const s = slug.toLowerCase();
  if (CATEGORY_LANDINGS.some((c) => c.aliases.includes(s))) return true;
  return /^(music-concerts|movies|events)$/.test(s);
}
