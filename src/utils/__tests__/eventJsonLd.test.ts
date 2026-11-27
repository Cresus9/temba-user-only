import { describe, expect, it } from 'vitest';
import { buildEventJsonLd, formatFcfa, isoLocal, utcOffsetFor } from '../../../netlify/edge-functions/lib/eventJsonLd';
import { buildVenueIndex } from '../../../netlify/edge-functions/lib/venueIndex';

const base = {
  id: '0a5d63d0-0000-4000-8000-000000000000',
  slug: 'alif-naaba',
  title: 'Alif Naaba',
  description: '<p>Grand concert.</p><p>Deuxième paragraphe.</p>',
  date: '2026-12-26',
  time: '20:00',
  timezone: 'Africa/Ouagadougou',
  location: 'Centre Culturel du Faso',
  city: 'Ouagadougou',
  country_code: 'BF',
  currency: 'XOF',
};
const url = 'https://tembas.com/e/alif-naaba';

describe('eventJsonLd', () => {
  it('uses +00:00 for Ouagadougou and full ISO times', () => {
    expect(utcOffsetFor('Africa/Ouagadougou', '2026-12-26')).toBe('+00:00');
    expect(isoLocal('2026-12-26', '20:00', 'Africa/Ouagadougou')).toBe('2026-12-26T20:00:00+00:00');
    expect(utcOffsetFor('Europe/Paris', '2026-07-01')).toBe('+02:00');
  });

  it('never marks a 0 or missing price as an offer', () => {
    const ld: any = buildEventJsonLd(
      { ...base, price: 0, ticket_types: [{ name: 'Coming soon', price: 0, available: 0, sales_enabled: false }] },
      { url },
    );
    expect(ld.offers).toBeUndefined();
    expect(JSON.stringify(ld)).not.toMatch(/"price":0|gratuit|free/i);
    const noTickets: any = buildEventJsonLd({ ...base, price: null, ticket_types: [] }, { url });
    expect(noTickets.offers).toBeUndefined();
  });

  it('keeps only real prices and real organizer and venue', () => {
    const ld: any = buildEventJsonLd(
      {
        ...base,
        ticket_types: [
          { name: 'Standard', price: 5000, available: 1200, sales_enabled: true },
          { name: 'Invitation', price: 0, available: 10, sales_enabled: true },
          { name: 'VIP', price: 10000, available: 0, sales_enabled: true },
          { name: 'VVIP', price: 25000, available: 0, sales_enabled: false },
        ],
      },
      {
        url,
        image: 'https://example.com/flyer.jpg',
        organizer: { name: 'Organisateur Réel' },
        venue: { name: 'Centre Culturel du Faso', city: 'Ouagadougou' },
        dates: [{ date: '2026-12-26', start_time: '20:00', end_time: '02:00', status: 'ACTIVE' }],
      },
    );
    expect(ld.offers.map((o: any) => o.price)).toEqual([5000, 10000, 25000]);
    expect(ld.offers[0].availability).toBe('https://schema.org/InStock');
    expect(ld.offers[1].availability).toBe('https://schema.org/SoldOut');
    expect(ld.offers[2].availability).toBeUndefined();
    expect(ld.organizer).toEqual({ '@type': 'Organization', name: 'Organisateur Réel' });
    expect(ld.location.name).toBe('Centre Culturel du Faso');
    expect(ld.startDate).toBe('2026-12-26T20:00:00+00:00');
    expect(ld.endDate).toBe('2026-12-27T02:00:00+00:00');
    expect(ld.description).toBe('Grand concert.\nDeuxième paragraphe.');
    expect(ld.image).toEqual(['https://example.com/flyer.jpg']);
    expect(ld.eventStatus).toBe('https://schema.org/EventScheduled');
  });

  it('marks permanent attractions as TouristAttraction, never as an Event', () => {
    const ld: any = buildEventJsonLd({ ...base, is_permanent: true }, { url, dates: [{ date: '2026-12-01', status: 'ACTIVE' }] });
    expect(ld['@type']).toBe('TouristAttraction');
    expect(ld.organizer).toBeUndefined();
    expect(ld.startDate).toBeUndefined();
    expect(ld.offers).toBeUndefined();
    expect(ld.eventStatus).toBeUndefined();
  });

  it('gives no markup to an event without any date', () => {
    expect(buildEventJsonLd({ ...base, date: null }, { url, dates: [] })).toBeNull();
  });

  it('lists performers with their artist page', () => {
    const ld: any = buildEventJsonLd(base, { url, performers: [{ name: 'Alif Naaba', slug: 'alif-naaba' }] });
    expect(ld.performer).toEqual([
      { '@type': 'Person', '@id': 'https://tembas.com/artists/alif-naaba', name: 'Alif Naaba', url: 'https://tembas.com/artists/alif-naaba' },
    ]);
  });

  it('formats prices as F CFA', () => {
    expect(formatFcfa(1000)).toBe('1 000 F CFA');
    expect(formatFcfa(50000)).toBe('50 000 F CFA');
  });
});

describe('venueIndex', () => {
  const venues = [
    { id: 'a', name: 'dfyguh', slug: 'dfyguh', city: 'Ouagadougou' },
    { id: 'b', name: 'Ciné Neerwaya', slug: 'cin-neerwaya', city: 'Ouagadougou' },
    { id: 'c', name: 'Maison de la Culture de Bobo-Dioulasso', slug: 'maison-de-la-culture-de-bobo-dioulasso', city: 'Bobo-Dioulasso' },
    { id: 'd', name: 'Maison de la culture ( BOBO DIOULASSO)', slug: 'maison-de-la-culture-bobo-dioulasso', city: 'Bobo-Dioulasso' },
    { id: 'e', name: 'Ouagadougou', slug: 'ouagadougou', city: 'Ouagadougou' },
  ];
  const events = [
    { id: '1', venue_id: 'b' },
    { id: '2', venue_id: 'c' },
    { id: '3', venue_id: 'c' },
    { id: '4', venue_id: 'd' },
    { id: '5', venue_id: 'e' },
  ];
  it('drops test rows, city-only rows and venues with no event; merges duplicates', () => {
    const { pages, bySlug } = buildVenueIndex(venues, events);
    expect(bySlug.has('dfyguh')).toBe(false);
    expect(bySlug.has('ouagadougou')).toBe(false);
    expect(pages.map((p) => p.primarySlug).sort()).toEqual(['cin-neerwaya', 'maison-de-la-culture-de-bobo-dioulasso']);
    expect(bySlug.get('maison-de-la-culture-bobo-dioulasso')?.primarySlug).toBe('maison-de-la-culture-de-bobo-dioulasso');
  });
});
