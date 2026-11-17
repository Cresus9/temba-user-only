import { describe, expect, it } from 'vitest';
import { buildLineAllocations, orderDateFields, sanitizeAllocations, sumAllocations } from '../lineAllocations';

describe('lineAllocations', () => {
  it('applies the same quantities to every chosen date', () => {
    const lines = buildLineAllocations({ a: 2, b: 1, c: 0 }, ['d1', 'd2', 'd3']);
    expect(lines).toHaveLength(6);
    expect(sumAllocations(lines)).toEqual({ a: 6, b: 3 });
  });

  it('keeps single-date orders exactly as before', () => {
    expect(orderDateFields('d1', null)).toEqual({ event_date_id: 'd1', line_allocations: null });
    expect(orderDateFields(null, null)).toEqual({ event_date_id: null, line_allocations: null });
    // One date in the lines is still a single-date order.
    expect(orderDateFields(null, buildLineAllocations({ a: 2 }, ['d1']))).toEqual({ event_date_id: 'd1', line_allocations: null });
  });

  it('several dates: lines set, event_date_id null', () => {
    const lines = buildLineAllocations({ a: 1 }, ['d1', 'd2']);
    expect(orderDateFields('d1', lines)).toEqual({ event_date_id: null, line_allocations: lines });
  });

  it('drops junk lines', () => {
    expect(sanitizeAllocations([{ ticket_type_id: 'a', event_date_id: '', quantity: 1 }, { ticket_type_id: 'a', event_date_id: 'd', quantity: 0 }])).toBeNull();
    expect(sanitizeAllocations('x')).toBeNull();
  });
});
