export type VenueSeoShow = {
  id: string;
  title: string;
  date: string | null;
  slug?: string | null;
  is_permanent?: boolean;
};

export function venueCanonicalUrl(slug: string) {
  return `https://tembas.com/venues/${slug}`;
}

export function venueSeoTitle(name: string, city?: string | null) {
  const loc = city ? ` à ${city}` : '';
  return `${name}${loc} — événements et billets | Temba`;
}

export function venueMetaDescription(opts: {
  name: string;
  city?: string | null;
  description?: string | null;
  nextShow?: VenueSeoShow | null;
}) {
  const next = opts.nextShow;
  if (next?.title) {
    const when = next.is_permanent
      ? 'ouvert toute l’année'
      : next.date
        ? `prochaine date : ${next.title}`
        : next.title;
    return `Événements à ${opts.name}${opts.city ? `, ${opts.city}` : ''}. ${when}. Billets en FCFA sur Temba (Orange Money, Moov, carte).`;
  }
  const bio = opts.description?.replace(/\s+/g, ' ').trim();
  if (bio && bio.length > 40) {
    const cut = bio.slice(0, 155);
    const sp = cut.lastIndexOf(' ');
    return `${(sp > 80 ? cut.slice(0, sp) : cut).trim()}…`;
  }
  return `Événements à ${opts.name}${opts.city ? ` (${opts.city})` : ''} — billets en FCFA sur Temba.`;
}

export function venueFaqItems(opts: {
  name: string;
  city?: string | null;
  address?: string | null;
  nextShow?: VenueSeoShow | null;
  serviceCount?: number;
}): { q: string; a: string }[] {
  const name = opts.name;
  const city = opts.city || 'Ouagadougou';
  const next = opts.nextShow;
  const dateLine = next?.is_permanent
    ? `${name} accueille une attraction permanente. Les billets de visite s’achètent sur Temba.`
    : next?.title
      ? `Oui : « ${next.title} ». Les billets s’achètent sur Temba (Orange Money, Moov, carte).`
      : `${name} n’a pas encore de date publiée sur Temba. Dès qu’un organisateur met des billets en vente, ils apparaissent ici.`;
  const access = opts.address
    ? `${opts.address}${opts.city ? `, ${opts.city}` : ''}. Ouvrez l’itinéraire depuis cette fiche.`
    : `${name} se trouve à ${city}. L’adresse exacte est indiquée sur chaque événement.`;
  return [
    {
      q: `Où acheter des billets pour ${name} ?`,
      a: `Sur Temba, fiche officielle ${name}. Seuls les événements réellement mis en vente sur tembas.com sont listés — paiement en FCFA.`,
    },
    {
      q: `Événements à ${name} (${city}) ?`,
      a: dateLine,
    },
    {
      q: `Comment s’y rendre ?`,
      a: access,
    },
    ...(opts.serviceCount && opts.serviceCount > 0
      ? [
          {
            q: `Y a-t-il des services sur place ?`,
            a: `Oui : restauration, parking ou autres extras peuvent être ajoutés au moment de la réservation, selon l’événement.`,
          },
        ]
      : []),
  ];
}

export function venueStructuredData(opts: {
  name: string;
  slug: string;
  description?: string | null;
  city?: string | null;
  address?: string | null;
  image?: string | null;
  nextShow?: VenueSeoShow | null;
  serviceCount?: number;
}) {
  const url = venueCanonicalUrl(opts.slug);
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://tembas.com/' },
      { '@type': 'ListItem', position: 2, name: 'Lieux', item: 'https://tembas.com/venues' },
      { '@type': 'ListItem', position: 3, name: opts.name, item: url },
    ],
  };
  const place = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: opts.name,
    url,
    image: opts.image || undefined,
    description: opts.description || undefined,
    address: opts.city || opts.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: opts.address || undefined,
          addressLocality: opts.city || undefined,
        }
      : undefined,
  };
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: venueFaqItems({
      name: opts.name,
      city: opts.city,
      address: opts.address,
      nextShow: opts.nextShow,
      serviceCount: opts.serviceCount,
    }).map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
  return [breadcrumb, place, faq];
}

export function venuesDirectoryStructuredData(
  venues: { name: string; slug: string | null }[]
) {
  const items = venues.filter((v) => v.slug).slice(0, 40);
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Lieux Temba',
    url: 'https://tembas.com/venues',
    numberOfItems: items.length,
    itemListElement: items.map((v, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: venueCanonicalUrl(v.slug as string),
      name: v.name,
    })),
  };
}
