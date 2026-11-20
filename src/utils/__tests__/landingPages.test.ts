import { describe, expect, it } from 'vitest';
import { landingByPath, landingCityOf, selectLandingEvents, weekendRange } from '../../../netlify/edge-functions/lib/landingPages';

describe('landing pages', () => {
  it('finds pages by path', () => {
    expect(landingByPath('/ce-weekend/')?.weekend).toBe(true);
    expect(landingByPath('/Ouagadougou/concerts')?.city).toBe('Ouagadougou');
    expect(landingByPath('/nope')).toBeUndefined();
  });

  it('computes the weekend like the events page', () => {
    expect(weekendRange('2026-11-20')).toEqual({ start: '2026-11-21', end: '2026-11-22' }); // Friday
    expect(weekendRange('2026-11-21')).toEqual({ start: '2026-11-21', end: '2026-11-22' }); // Saturday
    expect(weekendRange('2026-11-22')).toEqual({ start: '2026-11-21', end: '2026-11-22' }); // Sunday
  });

  it('matches cities', () => {
    expect(landingCityOf({ city: '', location: 'Salle Rouge, Palais des Congrès' })).toBe('Ouagadougou');
    expect(landingCityOf({ city: 'Bobo-Dioulasso' })).toBe('Bobo-Dioulasso');
    expect(landingCityOf({ city: 'Abidjan' })).toBeNull();
  });

  it('selects upcoming concerts in a city and weekend events', () => {
    const events = [
      { id: 'a', date: '2026-12-12', city: 'Ouagadougou' },
      { id: 'b', date: '2026-12-13', city: 'Bobo-Dioulasso' },
      { id: 'c', date: '2026-10-01', city: 'Ouagadougou' },
      { id: 'd', date: '2026-11-19', city: 'Ouagadougou' },
      { id: 'e', date: '2026-08-06', city: 'Ouagadougou', is_permanent: true },
      { id: 'f', date: '2026-11-20', city: 'Abidjan' },
    ];
    const dates = new Map([['d', ['2026-11-19', '2026-11-23']], ['f', ['2026-11-21']]]);
    const concertIds = new Set(['a', 'b', 'c', 'e']);
    const today = '2026-11-20';
    expect(selectLandingEvents(landingByPath('/ouagadougou/concerts')!, events, { today, dates, concertIds }).map((e) => e.id)).toEqual(['a']);
    expect(selectLandingEvents(landingByPath('/ce-weekend')!, events, { today, dates, concertIds }).map((e) => e.id)).toEqual(['f']);
  });
});
