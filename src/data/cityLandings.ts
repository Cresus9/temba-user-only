import type { Event } from '../types/event';
import { foldAscii } from '../utils/slugFr';

export { foldAscii };

export type CityLanding = {
  slug: string;
  name: string;
  countryCode: string;
  countryName: string;
  aliases: string[];
  title: string;
  description: string;
  intro: string;
};

/** Crawlable city hubs — markets in order of Temba expansion. */
export const CITY_LANDINGS: CityLanding[] = [
  {
    slug: 'ouagadougou',
    name: 'Ouagadougou',
    countryCode: 'BF',
    countryName: 'Burkina Faso',
    aliases: ['ouagadougou', 'ouaga'],
    title: 'Événements à Ouagadougou — billets en FCFA',
    description:
      'Concerts, festivals, soirées et attractions à Ouagadougou. Achetez vos billets Temba en Orange Money, Moov ou carte.',
    intro:
      'Ouaga sort. Temba est la billetterie pour les concerts, festivals, ciné-plein-air et lieux ouverts toute l’année. Paiement en FCFA, QR sur le téléphone à l’entrée.',
  },
  {
    slug: 'bobo-dioulasso',
    name: 'Bobo-Dioulasso',
    countryCode: 'BF',
    countryName: 'Burkina Faso',
    aliases: ['bobo-dioulasso', 'bobo dioulasso', 'bobo'],
    title: 'Événements à Bobo-Dioulasso — billets Temba',
    description:
      'Agenda Temba à Bobo-Dioulasso : concerts, culture et sorties. Billets en ligne, paiement Mobile Money.',
    intro:
      'Bobo a sa scène. Retrouvez ici les prochaines dates et les attractions de la capitale économique, avec le même QR Temba qu’à Ouaga.',
  },
  {
    slug: 'abidjan',
    name: 'Abidjan',
    countryCode: 'CI',
    countryName: "Côte d'Ivoire",
    aliases: ['abidjan', 'cocody', 'plateau', 'yopougon', 'marcory'],
    title: 'Événements à Abidjan — billets Temba',
    description:
      'Concerts et festivals à Abidjan sur Temba. Réservez en ligne, payez en FCFA, présentez votre QR à l’entrée.',
    intro:
      'Temba s’ouvre sur Abidjan : dates à l’affiche, organisateurs partenaires, paiement local. Une page pour tout ce qui se joue en ville.',
  },
  {
    slug: 'dakar',
    name: 'Dakar',
    countryCode: 'SN',
    countryName: 'Sénégal',
    aliases: ['dakar'],
    title: 'Événements à Dakar — billets Temba',
    description:
      'Concerts et festivals à Dakar. Achetez vos billets Temba en ligne, QR sur mobile.',
    intro:
      'Quand des dates Dakar sont en ligne sur Temba, elles s’affichent ici — bientôt les unes après les autres, même parcours d’achat qu’au Burkina.',
  },
];

export function cityBySlug(slug: string | undefined): CityLanding | undefined {
  if (!slug) return undefined;
  return CITY_LANDINGS.find((c) => c.slug === slug.toLowerCase());
}

export const DEFAULT_CITY_SLUG_BY_COUNTRY: Record<string, string> = {
  BF: 'ouagadougou',
  CI: 'abidjan',
  SN: 'dakar',
};

function haystack(event: {
  city?: string | null;
  location?: string | null;
  address?: string | null;
  venue?: string | null;
}): string {
  return foldAscii(
    [event.city, event.location, event.address, event.venue].filter(Boolean).join(' ')
  );
}

function aliasesHit(hay: string, aliases: string[]): boolean {
  if (!hay) return false;
  const tokens = hay.split(/[^a-z0-9]+/).filter(Boolean);
  return aliases.some((alias) => {
    const a = foldAscii(alias);
    if (!a) return false;
    if (a.includes(' ')) return hay.includes(a);
    return tokens.includes(a);
  });
}

export function eventMatchesCity(
  event: Event & { venue?: string | null },
  city: CityLanding
): boolean {
  const hay = haystack(event);
  if (aliasesHit(hay, city.aliases)) return true;

  const otherCity = CITY_LANDINGS.some(
    (c) => c.slug !== city.slug && aliasesHit(hay, c.aliases)
  );
  if (otherCity) return false;

  const cc = (event.country_code || 'BF').toUpperCase();
  if (cc !== city.countryCode) return false;
  return DEFAULT_CITY_SLUG_BY_COUNTRY[cc] === city.slug;
}
