import { describe, expect, it } from 'vitest';
import { flyerSrcSet, resizedImageUrl } from '../imageUrl';

describe('imageUrl', () => {
  it('uses Supabase transformation for Temba storage', () => {
    const src = 'https://wlyncuwbzhzjafmqozcm.supabase.co/storage/v1/object/public/event-images/event-images/a.jpg';
    expect(resizedImageUrl(src, 480)).toBe(
      'https://wlyncuwbzhzjafmqozcm.supabase.co/storage/v1/render/image/public/event-images/event-images/a.jpg?width=480&quality=70&resize=contain',
    );
    expect(flyerSrcSet(src)?.split(', ')).toHaveLength(5);
  });

  it('keeps unknown hosts, and other websites off Netlify hosts, as they are', () => {
    expect(resizedImageUrl('https://example.org/a.jpg', 480)).toBeNull();
    // jsdom runs on localhost: no Netlify Image CDN there
    expect(resizedImageUrl('https://showbook.africa/storage/1/a.jpg', 480)).toBeNull();
    expect(resizedImageUrl('', 480)).toBeNull();
    expect(flyerSrcSet('https://example.org/a.jpg')).toBeUndefined();
  });
});
