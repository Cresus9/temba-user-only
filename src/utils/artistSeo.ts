import { eventPublicUrl } from './eventPath';

export type ArtistSocial = {
  instagram?: string;
  facebook?: string;
  youtube?: string;
  twitter?: string;
  website?: string;
};

export type ArtistSeoShow = {
  id: string;
  title: string;
  date: string;
  location?: string | null;
  slug?: string | null;
};

export function artistCanonicalUrl(slug: string) {
  return `https://tembas.com/artists/${slug}`;
}

export function artistSocialHref(
  kind: keyof ArtistSocial,
  raw: string
): string {
  const v = raw.trim();
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, '').replace(/^\//, '');
  if (kind === 'instagram') return `https://www.instagram.com/${handle}`;
  if (kind === 'facebook') return `https://www.facebook.com/${handle}`;
  if (kind === 'twitter') return `https://twitter.com/${handle}`;
  if (kind === 'youtube') {
    return `https://www.youtube.com/${handle.includes('/') ? handle : `@${handle}`}`;
  }
  return v.startsWith('http') ? v : `https://${v}`;
}

export function artistSameAs(social: ArtistSocial | null | undefined): string[] {
  if (!social) return [];
  const keys: (keyof ArtistSocial)[] = ['instagram', 'facebook', 'youtube', 'twitter', 'website'];
  const urls = keys
    .map((k) => {
      const raw = social[k]?.trim();
      return raw ? artistSocialHref(k, raw) : '';
    })
    .filter(Boolean);
  return Array.from(new Set(urls));
}

function clampMeta(text: string, max = 158) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > 80 ? cut.slice(0, sp) : cut).trim()}…`;
}

function formatFrDay(iso: string) {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function artistSeoTitle(name: string) {
  return `${name} — concerts et billets`;
}

export function artistMetaDescription(opts: {
  name: string;
  bio?: string | null;
  genre?: string | null;
  city?: string | null;
  nextShow?: ArtistSeoShow | null;
}) {
  const { name, bio, genre, city, nextShow } = opts;
  if (nextShow?.title && nextShow.date) {
    const when = formatFrDay(nextShow.date);
    const place = nextShow.location ? ` à ${nextShow.location}` : '';
    return clampMeta(
      `${name}${genre ? ` (${genre})` : ''} : « ${nextShow.title} »${when ? ` le ${when}` : ''}${place}. Billets officiels sur Temba.`
    );
  }
  if (bio?.trim()) return clampMeta(bio);
  const where = city ? ` à ${city}` : ' en Afrique de l’Ouest';
  return clampMeta(
    `Fiche officielle de ${name}${genre ? `, ${genre}` : ''} sur Temba${where}. Dates publiées et billets en FCFA (Orange Money, Moov, carte).`
  );
}

export function artistStructuredData(opts: {
  name: string;
  slug: string;
  bio?: string | null;
  genre?: string | null;
  city?: string | null;
  countryCode?: string | null;
  image?: string | null;
  social?: ArtistSocial | null;
  shows?: ArtistSeoShow[];
}) {
  const pageUrl = artistCanonicalUrl(opts.slug);
  const sameAs = artistSameAs(opts.social);
  const shows = opts.shows ?? [];
  const person = {
    '@context': 'https://schema.org',
    '@type': ['Person', 'MusicGroup'],
    '@id': pageUrl,
    name: opts.name,
    url: pageUrl,
    image: opts.image || undefined,
    description: opts.bio?.trim() || undefined,
    genre: opts.genre || undefined,
    sameAs: sameAs.length ? sameAs : undefined,
    homeLocation: opts.city
      ? {
          '@type': 'Place',
          name: opts.city,
          address: {
            '@type': 'PostalAddress',
            addressLocality: opts.city,
            addressCountry: opts.countryCode || 'BF',
          },
        }
      : undefined,
    performerIn: shows.length
      ? shows.map((s) => ({
          '@type': 'MusicEvent',
          name: s.title,
          url: eventPublicUrl(s),
          startDate: s.date || undefined,
          location: s.location
            ? { '@type': 'Place', name: s.location }
            : undefined,
        }))
      : undefined,
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://tembas.com/' },
      { '@type': 'ListItem', position: 2, name: 'Artistes', item: 'https://tembas.com/artists' },
      { '@type': 'ListItem', position: 3, name: opts.name, item: pageUrl },
    ],
  };

  return [breadcrumb, person];
}

export function artistsDirectoryStructuredData(
  artists: { name: string; slug: string }[]
) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Artistes — Temba',
      url: 'https://tembas.com/artists',
      description:
        'Fiches officielles des artistes programmés sur Temba : dates, concerts et billets en FCFA.',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Artistes Temba',
      itemListElement: artists.slice(0, 80).map((a, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: artistCanonicalUrl(a.slug),
        name: a.name,
      })),
    },
  ];
}
