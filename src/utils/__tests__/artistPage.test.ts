import { describe, expect, it } from 'vitest';
import {
  artistLinks,
  artistSections,
  dayParts,
  fcfa,
  genreChips,
  initials,
  lineupArtists,
  showPriceLine,
  showTiers,
  similarArtists,
} from '../artistPage';
import { artistFaqItems } from '../artistSeo';
import type { CatalogArtist, CatalogShow } from '../../services/laCatalog';

type Tier = { id: string; name: string; price: number; sales_enabled: boolean };

function show(tiers: Tier[]): Pick<CatalogShow, 'event'> {
  return { event: { ticket_types: tiers } as unknown as CatalogShow['event'] };
}

function artist(over: Partial<CatalogArtist>): CatalogArtist {
  return {
    id: 'a',
    name: 'Artiste',
    slug: 'artiste',
    genre: '',
    genreKey: '',
    city: '',
    countryCode: 'BF',
    bio: '',
    photo: 'https://x/p.jpg',
    verified: false,
    coArtistIds: [],
    social: {},
    upcoming: [],
    past: [],
    ...over,
  };
}

describe('fcfa', () => {
  it('formats as "5 000 F CFA" with no-break spaces', () => {
    expect(fcfa(5000)).toBe('5\u202f000\u00a0F\u00a0CFA');
    expect(fcfa(10000)).toBe('10\u202f000\u00a0F\u00a0CFA');
    expect(fcfa(500)).toBe('500\u00a0F\u00a0CFA');
    expect(fcfa(1250000)).toBe('1\u202f250\u202f000\u00a0F\u00a0CFA');
  });
});

describe('showPriceLine', () => {
  it('announces the lowest price and says the sale is not open when sales are off', () => {
    const line = showPriceLine(show([
      { id: '1', name: 'Standard', price: 5000, sales_enabled: false },
      { id: '2', name: 'VIP', price: 10000, sales_enabled: false },
    ]));
    expect(line).toEqual({ label: `Dès ${fcfa(5000)}`, soon: true });
  });

  it('shows the plain price when one open price exists, "Dès" when several', () => {
    expect(showPriceLine(show([{ id: '1', name: 'Entrée', price: 2000, sales_enabled: true }]))).toEqual({ label: fcfa(2000), soon: false });
    expect(
      showPriceLine(show([
        { id: '1', name: 'A', price: 2000, sales_enabled: true },
        { id: '2', name: 'B', price: 5000, sales_enabled: true },
      ])).label,
    ).toBe(`Dès ${fcfa(2000)}`);
  });

  it('never says "Gratuit": a price of 0 is "Tarifs à venir"', () => {
    const zero = showPriceLine(show([{ id: '1', name: 'Entrée Gratuite', price: 0, sales_enabled: false }]));
    expect(zero).toEqual({ label: 'Tarifs à venir', soon: true });
    const open0 = showPriceLine(show([{ id: '1', name: 'Entrée', price: 0, sales_enabled: true }]));
    expect(open0.label).not.toMatch(/gratuit/i);
    expect(showPriceLine(show([])).label).not.toMatch(/gratuit/i);
  });
});

describe('showTiers', () => {
  it('lists cheapest first, names unnamed types "Billet" and zero prices as "Tarif à venir"', () => {
    const tiers = showTiers(show([
      { id: '2', name: 'VIP', price: 10000, sales_enabled: false },
      { id: '1', name: '', price: 5000, sales_enabled: false },
      { id: '3', name: 'Entrée Gratuite', price: 0, sales_enabled: false },
    ]));
    expect(tiers.map((t) => t.name)).toEqual(['Entrée Gratuite', 'Billet', 'VIP']);
    expect(tiers[0].price).toBe('Tarif à venir');
    expect(tiers[2].price).toBe(fcfa(10000));
  });
});

describe('dayParts', () => {
  it('reads a YYYY-MM-DD day as a local calendar day (no UTC shift)', () => {
    const p = dayParts('2026-12-26');
    expect(p.day).toBe('26');
    expect(p.month).toBe('déc');
    expect(p.year).toBe('2026');
    expect(p.short).toMatch(/^sam\.? 26 déc/);
  });
  it('handles ISO timestamps by their date part', () => {
    expect(dayParts('2025-12-24T00:00:00+00:00').day).toBe('24');
  });
});

describe('small helpers', () => {
  it('initials', () => {
    expect(initials('Aurel')).toBe('A');
    expect(initials('Alif Naaba')).toBe('AN');
    expect(initials('MAS-B')).toBe('MB');
  });
  it('genreChips', () => {
    expect(genreChips('Afropop / Reggae')).toEqual(['Afropop', 'Reggae']);
    expect(genreChips('')).toEqual([]);
  });
});

describe('artistLinks', () => {
  it('only returns links present in social_links, normalised', () => {
    expect(artistLinks({})).toEqual([]);
    const links = artistLinks({ instagram: '@floby_officiel', facebook: 'flobyofficiel', youtube: 'FlobyOfficiel' });
    expect(links.map((l) => l.label)).toEqual(['Instagram', 'Facebook', 'YouTube']);
    expect(links[0].href).toBe('https://www.instagram.com/floby_officiel');
    expect(links[2].href).toBe('https://www.youtube.com/@FlobyOfficiel');
  });
  it('does not invent streaming links', () => {
    const labels = artistLinks({ instagram: '@a', facebook: 'a', youtube: 'a', website: 'https://soundcloud.com/a' }).map((l) => l.label);
    expect(labels).toEqual(['Instagram', 'Facebook', 'YouTube', 'SoundCloud']);
    expect(labels.join(' ')).not.toMatch(/spotify|apple|deezer/i);
  });
});

describe('similarArtists and lineupArtists', () => {
  const me = artist({ id: 'me', genre: 'Afropop / Reggae', coArtistIds: ['c1', 'c2'] });
  const all = [
    me,
    artist({ id: 'z', name: 'Zed', genre: 'Afropop' }),
    artist({ id: 'b', name: 'Bao', genre: 'Reggae' }),
    artist({ id: 'n', name: 'NoPhoto', genre: 'Afropop', photo: '' }),
    artist({ id: 'r', name: 'Rap', genre: 'Hip-Hop' }),
    artist({ id: 'c1', name: 'Zoe', photo: '' }),
    artist({ id: 'c2', name: 'Yan' }),
  ];
  it('keeps shared genre only, with a photo, sorted by name', () => {
    expect(similarArtists(me, all).map((a) => a.name)).toEqual(['Bao', 'Zed']);
  });
  it('lists co-billed artists, photo first', () => {
    expect(lineupArtists(me, all).map((a) => a.name)).toEqual(['Yan', 'Zoe']);
    expect(lineupArtists(artist({ id: 'x' }), all)).toEqual([]);
  });
});

describe('artistSections', () => {
  it('drops sections that have no data', () => {
    expect(artistSections({ hasPast: false, hasLinks: false, hasLineup: false, hasSimilar: false }).map((s) => s.id)).toEqual(['dates', 'a-propos']);
    expect(artistSections({ hasPast: true, hasLinks: true, hasLineup: true, hasSimilar: true }).map((s) => s.id)).toEqual([
      'dates',
      'passe',
      'a-propos',
      'liens',
      'meme-affiche',
      'similaires',
    ]);
  });
});

describe('artist FAQ wording', () => {
  it('does not claim that only on-sale concerts are listed', () => {
    const items = artistFaqItems({ name: 'Alif Naaba', city: 'Ouagadougou', nextShow: { id: '1', title: 'Alif Naaba', date: '2026-12-26', location: 'Centre Culturel du Faso', slug: 'alif-naaba' } });
    const text = items.map((i) => `${i.q} ${i.a}`).join(' ');
    expect(text).not.toMatch(/Seuls les concerts/);
    expect(text).not.toMatch(/gratuit/i);
    expect(items[0].a).toContain('dès l’ouverture de la vente');
  });
});
