import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  OG_DESCRIPTION_MAX,
  TEMBA_OG_FALLBACK,
  eventOgImageUrl,
  eventShareDescription,
  eventShareLocation,
  isBlockedImageUrl,
  parseOgImageKey,
  publicSiteOrigin,
  shortHash,
  supabasePublicRenderUrl,
  toAbsoluteHttps,
} from '../../../netlify/edge-functions/lib/eventOgShare';

const ZONE_SLUG = 'festival-de-la-zone-1-5e-edition-6a79a2b6';
const ZONE_IMG =
  'https://wlyncuwbzhzjafmqozcm.supabase.co/storage/v1/object/public/event-images/event-images/n30z9fvg72-1794672828368.jpg';

describe('eventOgImageUrl', () => {
  it('points at the first-party /og/e proxy and keeps a cache buster', () => {
    const url = eventOgImageUrl({ id: 'uuid-1', slug: ZONE_SLUG }, ZONE_IMG);
    expect(url.startsWith(`https://tembas.com/og/e/${ZONE_SLUG}.jpg?`)).toBe(true);
    expect(url).toContain(`v=${shortHash(ZONE_IMG)}`);
    expect(url).not.toContain('supabase.co');
  });

  it('falls back to the event id when there is no slug', () => {
    const id = '6a79a2b6-1111-4111-8111-111111111111';
    expect(eventOgImageUrl({ id }, ZONE_IMG)).toContain(`/og/e/${id}.jpg`);
  });

  it('uses the site fallback when the event has no key', () => {
    expect(eventOgImageUrl({}, ZONE_IMG)).toBe(TEMBA_OG_FALLBACK);
  });
});

describe('parseOgImageKey', () => {
  it('reads the slug from the public path, with or without an extension', () => {
    expect(parseOgImageKey(`/og/e/${ZONE_SLUG}`)).toBe(ZONE_SLUG);
    expect(parseOgImageKey(`/og/e/${ZONE_SLUG}.jpg`)).toBe(ZONE_SLUG);
    expect(parseOgImageKey(`https://tembas.com/og/e/${ZONE_SLUG}?v=abc`)).toBe(ZONE_SLUG);
  });

  it('rejects empty or traversal keys', () => {
    expect(parseOgImageKey('')).toBeNull();
    expect(parseOgImageKey('/og/e/../secret')).toBeNull();
    expect(parseOgImageKey('/og/e/a/b')).toBeNull();
  });
});

describe('supabasePublicRenderUrl', () => {
  it('rewrites a public storage object to a 1200x630 cover render', () => {
    expect(supabasePublicRenderUrl(ZONE_IMG)).toBe(
      'https://wlyncuwbzhzjafmqozcm.supabase.co/storage/v1/render/image/public/event-images/event-images/n30z9fvg72-1794672828368.jpg?width=1200&height=630&resize=cover',
    );
  });

  it('leaves non-supabase and non-storage URLs alone', () => {
    expect(supabasePublicRenderUrl('https://afroduc.com/flyer.jpg')).toBeNull();
    expect(
      supabasePublicRenderUrl(
        'https://wlyncuwbzhzjafmqozcm.supabase.co/storage/v1/render/image/public/event-images/x.jpg',
      ),
    ).toBeNull();
  });
});

describe('isBlockedImageUrl and toAbsoluteHttps', () => {
  it('allows public https hosts and rejects private or non-https URLs', () => {
    expect(isBlockedImageUrl(ZONE_IMG)).toBe(false);
    expect(isBlockedImageUrl('https://afroduc.com/wp.jpg')).toBe(false);
    expect(isBlockedImageUrl('http://tembas.com/x.jpg')).toBe(true);
    expect(isBlockedImageUrl('https://localhost/x.jpg')).toBe(true);
    expect(isBlockedImageUrl('https://127.0.0.1/x.jpg')).toBe(true);
    expect(isBlockedImageUrl('https://192.168.1.4/x.jpg')).toBe(true);
    expect(isBlockedImageUrl('https://169.254.169.254/latest/meta-data')).toBe(true);
    expect(isBlockedImageUrl('https://user:pass@tembas.com/x.jpg')).toBe(true);
  });

  it('turns protocol-relative and site-relative paths into https', () => {
    expect(toAbsoluteHttps('//cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
    expect(toAbsoluteHttps('/photos/a.jpg')).toBe('https://tembas.com/photos/a.jpg');
    expect(toAbsoluteHttps('http://tembas.com/a.jpg')).toBeNull();
  });
});

describe('eventShareDescription', () => {
  it('puts the date and venue first, then the event text', () => {
    const text = eventShareDescription({
      title: 'Festival de la Zone 1 – 5e édition',
      description:
        'Le Festival de la Zone 1 revient pour sa 5e édition les 18, 19 et 20 décembre 2026 au Lycée Bangré Yiguia.',
      dateLabel: 'samedi 19 décembre 2026',
      location: 'Lycée Bangré Yiguia, Ouagadougou',
    });
    expect(text.startsWith('samedi 19 décembre 2026 · Lycée Bangré Yiguia, Ouagadougou.')).toBe(true);
    expect(text).toContain('Le Festival de la Zone 1 revient');
    expect(text.toLowerCase()).not.toContain('gratuit');
    expect(text.length).toBeLessThanOrEqual(OG_DESCRIPTION_MAX);
  });

  it('does not repeat the date when the description already has it', () => {
    const text = eventShareDescription({
      title: 'Alif Naaba',
      description: 'Concert Alif Naaba. 26 décembre 2026. Centre Culturel du Faso, Ouagadougou.',
      dateLabel: '26 décembre 2026',
      location: 'Centre Culturel du Faso, Ouagadougou',
    });
    expect(text.startsWith('Concert Alif Naaba')).toBe(true);
    expect(text.match(/26 décembre 2026/g)?.length).toBe(1);
  });

  it('joins venue and city without duplicating the city', () => {
    expect(
      eventShareLocation({
        location: 'Lycée Bangré Yiguia, Zone 1, Ouagadougou, Burkina Faso',
        city: 'Ouagadougou',
      }),
    ).toBe('Lycée Bangré Yiguia, Zone 1, Ouagadougou, Burkina Faso');
    expect(eventShareLocation({ location: 'Centre Culturel du Faso', city: 'Ouagadougou' })).toBe(
      'Centre Culturel du Faso, Ouagadougou',
    );
  });
});

describe('Netlify routes', () => {
  it('rewrites /og/e/* to the image function before the SPA catch-all', () => {
    const toml = readFileSync('netlify.toml', 'utf8');
    const redirects = readFileSync('public/_redirects', 'utf8');
    const ogAt = toml.indexOf('from = "/og/e/*"');
    const spaAt = toml.indexOf('from = "/*"');
    expect(ogAt).toBeGreaterThan(0);
    expect(spaAt).toBeGreaterThan(ogAt);
    expect(toml).toContain('to = "/.netlify/functions/og-image?key=:splat"');
    expect(redirects.indexOf('/og/e/*')).toBeGreaterThan(0);
    expect(redirects.indexOf('/og/e/*')).toBeLessThan(redirects.indexOf('/* /index.html'));
  });
});

describe('publicSiteOrigin', () => {
  it('keeps production on tembas.com and allows only this site\'s Netlify previews', () => {
    expect(publicSiteOrigin('https://tembas.com/e/zone-1?r=CODE')).toBe('https://tembas.com');
    expect(publicSiteOrigin('https://www.tembas.com/e/zone-1')).toBe('https://www.tembas.com');
    expect(publicSiteOrigin('https://deploy-preview-24--temba-user.netlify.app/e/zone-1')).toBe(
      'https://deploy-preview-24--temba-user.netlify.app',
    );
    expect(publicSiteOrigin('https://temba-user.netlify.app/e/zone-1')).toBe('https://temba-user.netlify.app');
    expect(publicSiteOrigin('https://evil.netlify.app/e/zone-1')).toBe('https://tembas.com');
    expect(publicSiteOrigin('https://deploy-preview-24--other-site.netlify.app/')).toBe('https://tembas.com');
  });

  it('points preview og:image at the preview host', () => {
    const preview = 'https://deploy-preview-24--temba-user.netlify.app';
    const url = eventOgImageUrl({ slug: 'alif-naaba' }, 'https://example.com/a.jpg', preview);
    expect(url.startsWith(`${preview}/og/e/alif-naaba.jpg?`)).toBe(true);
    expect(url).not.toContain('tembas.com/og/e');
  });
});
