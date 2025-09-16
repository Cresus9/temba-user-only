import { buildTextSearchFilter, sanitizeTextSearchTerm } from '../supabaseFilters';

describe('sanitizeTextSearchTerm', () => {
  it('removes dangerous characters and normalizes whitespace', () => {
    expect(sanitizeTextSearchTerm("  party%; DROP TABLE  ")).toBe('party DROP TABLE');
  });

  it('preserves unicode characters and digits', () => {
    expect(sanitizeTextSearchTerm('Fête Élite 2024!')).toBe('Fête Élite 2024');
  });

  it('truncates overly long input to the default maximum length', () => {
    const long = 'a'.repeat(300);
    expect(sanitizeTextSearchTerm(long)).toHaveLength(120);
  });
});

describe('buildTextSearchFilter', () => {
  it('returns null when the sanitized term is empty', () => {
    expect(buildTextSearchFilter(['title', 'description'], '!!!')).toBeNull();
  });

  it('builds a safe ilike filter for provided columns', () => {
    expect(buildTextSearchFilter(['title', 'description'], 'music')).toBe('title.ilike.%music%,description.ilike.%music%');
  });

  it('sanitizes characters that could break the filter expression', () => {
    expect(buildTextSearchFilter(['title'], "Summer, status.eq.DRAFT"))
      .toBe('title.ilike.%Summer status.eq.DRAFT%');
  });
});
