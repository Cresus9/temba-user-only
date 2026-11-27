import { describe, expect, it } from 'vitest';
import { artistPageTitle, eventSeoTitle, frDay, frDayRange, splitArtistShows } from '../../../netlify/edge-functions/lib/eventSeo';

describe('eventSeo', () => {
  it('formats French days without Date parsing', () => {
    expect(frDay('2026-12-26')).toBe('26 décembre 2026');
    expect(frDay('2027-01-01')).toBe('1er janvier 2027');
    expect(frDayRange('2026-12-19', '2026-12-20')).toBe('19 au 20 décembre 2026');
    expect(frDayRange('2026-11-29', '2026-12-02')).toBe('29 novembre au 2 décembre 2026');
    expect(frDayRange('2026-12-30', '2027-01-02')).toBe('30 décembre 2026 au 2 janvier 2027');
  });

  it('adds city and date to event titles', () => {
    expect(eventSeoTitle({ title: 'Alif Naaba', city: 'Ouagadougou', date: '2026-12-26' })).toBe('Alif Naaba — Ouagadougou, 26 décembre 2026');
    expect(
      eventSeoTitle(
        { title: 'Festival de la Zone 1 – 5e édition', city: 'Ouagadougou', date: '2026-12-19' },
        [{ date: '2026-12-20', status: 'ACTIVE' }, { date: '2026-12-19', status: 'ACTIVE' }],
      ),
    ).toBe('Festival de la Zone 1 — Ouagadougou, 19 au 20 décembre 2026');
  });

  it('skips the city when the title already names it and shortens long titles', () => {
    expect(eventSeoTitle({ title: 'Festival Bobo Ambiance – 5e édition', city: 'Bobo-Dioulasso', date: '2026-12-26' })).toBe(
      'Festival Bobo Ambiance – 5e édition — 26 décembre 2026',
    );
    const t = eventSeoTitle({
      title: 'FEMULO – 6e édition (Festival des musiques urbaines lives de Ouagadougou)',
      city: 'Ouagadougou',
      date: '2026-11-25',
    });
    expect(t).toBe('FEMULO — 25 novembre 2026');
  });

  it('never puts a date on permanent attractions', () => {
    expect(eventSeoTitle({ title: 'Banco National Zoo', city: 'Abidjan', date: '2026-08-09', is_permanent: true })).toBe(
      'Banco National Zoo à Abidjan — billets',
    );
  });

  it('never shows a past show as upcoming', () => {
    const shows = [
      { id: 'floby-2025', date: '2025-12-24' },
      { id: 'flory', date: '2026-09-27' },
      { id: 'next', date: '2026-12-26' },
      { id: 'multi', date: '2026-11-25', event_dates: [{ date: '2026-11-25' }, { date: '2026-11-29' }] },
    ];
    const { upcoming, past } = splitArtistShows(shows, '2026-11-27');
    expect(upcoming.map((s) => s.id)).toEqual(['multi', 'next']);
    expect(past.map((s) => s.id)).toEqual(['flory', 'floby-2025']);
  });

  it('drops "concert à" when the artist has no upcoming show', () => {
    expect(artistPageTitle('Floby', null)).toBe('Floby — artiste, dates et billets');
    expect(artistPageTitle('Floby', { city: 'Ouagadougou' })).toBe('Floby — concert à Ouagadougou, billets');
  });
});
