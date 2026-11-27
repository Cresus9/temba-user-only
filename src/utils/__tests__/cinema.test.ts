import { describe, expect, it } from 'vitest';
import {
  crossesMidnight,
  durationLabel,
  fcfa,
  isCinemaCategoryName,
  lowestPrice,
  normalizeSeance,
  pricesVary,
  seanceDays,
  seanceExtras,
  seanceHours,
  seancePrice,
  seancesOn,
  weekdayShort,
  dayNumber,
  withSeancePrices,
} from '../cinema';

const row = (id: string, date: string, start: string, prices: Array<[string, number]>, state = 'open') =>
  normalizeSeance({
    id, date, start_time: `${start}:00`, end_time: null, end_is_estimate: true, hall: null, version: null, format: null,
    capacity: 500, remaining: 500, state,
    prices: prices.map(([t, p]) => ({ ticket_type_id: t, price: p, base_price: 2000, is_override: p !== 2000 })),
  });

describe('cinema helpers', () => {
  it('formats prices as F CFA, never « Gratuit »', () => {
    expect(fcfa(1000)).toBe('1 000 F CFA');
    expect(fcfa(25000)).toBe('25 000 F CFA');
    expect(fcfa(0)).toBe('0 F CFA');
  });

  it('only matches the Cinema category', () => {
    expect(isCinemaCategoryName('Cinema')).toBe(true);
    expect(isCinemaCategoryName('Cinéma')).toBe(true);
    expect(isCinemaCategoryName('Concert')).toBe(false);
    expect(isCinemaCategoryName('Médecine')).toBe(false);
  });

  it('groups séances by day in time order', () => {
    const list = [row('c', '2026-12-19', '18:30', []), row('b', '2026-12-18', '22:30', []), row('a', '2026-12-18', '18:30', [])];
    expect(seanceDays(list)).toEqual(['2026-12-18', '2026-12-19']);
    expect(seancesOn(list, '2026-12-18').map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('uses the séance price, else the ticket type price', () => {
    const s = row('a', '2026-12-18', '18:30', [['e', 3000]]);
    expect(seancePrice(s, 'e', 2000)).toBe(3000);
    expect(seancePrice(s, 'v', 2500)).toBe(2500);
    expect(seancePrice(null, 'e', 2000)).toBe(2000);
  });

  it('lowest price skips sold out and past séances', () => {
    const list = [row('a', '2026-12-18', '18:30', [['e', 1500]], 'sold_out'), row('b', '2026-12-18', '20:30', [['e', 2000]])];
    expect(lowestPrice(list, ['e'])).toBe(2000);
    expect(pricesVary(list)).toBe(true);
  });

  it('hours, extras, midnight', () => {
    expect(seanceHours('20:30:00', '22:15')).toBe('20:30 – 22:15');
    expect(seanceHours('20:30', null)).toBe('20:30');
    expect(seanceExtras({ hall: 'Salle 1', version: 'VF', format: null })).toBe('Salle 1 · VF');
    expect(crossesMidnight('22:30', '00:20')).toBe(true);
    expect(durationLabel(105)).toBe('1 h 45');
  });

  it('reads calendar days locally (parseLocalDate)', () => {
    expect(dayNumber('2026-12-18')).toBe(18);
    expect(weekdayShort('2026-12-18')).toBe('ven');
  });

  it('applies séance prices to checkout lines', () => {
    const lines = [{ id: 'e', price: 2000, qty: 1 }, { id: 'v', price: 2500, qty: 1 }];
    expect(withSeancePrices(lines, new Map([['e', 3000]]))).toEqual([{ id: 'e', price: 3000, qty: 1 }, { id: 'v', price: 2500, qty: 1 }]);
  });
});

import { formatCheckoutPrice } from '../formatters';

describe('formatCheckoutPrice (house format)', () => {
  it('formats XOF as "4 500 F CFA" with no-break spaces', () => {
    expect(formatCheckoutPrice(4500, 'XOF')).toBe('4\u202f500\u00a0F\u00a0CFA');
    expect(formatCheckoutPrice(1000000, 'FCFA')).toBe('1\u202f000\u202f000\u00a0F\u00a0CFA');
    expect(formatCheckoutPrice(0, 'XOF')).toBe('0\u00a0F\u00a0CFA');
    expect(formatCheckoutPrice(4500, 'XOF')).not.toContain('FCFA');
  });
  it('falls back for other currencies', () => {
    expect(formatCheckoutPrice(10, 'EUR')).toContain('€');
  });
});
