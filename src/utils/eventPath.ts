/** Public event URLs: /e/{slug} or /e/{uuid}. Old /events/:id still resolves. */

export const EVENT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isEventUuid(value: string): boolean {
  return EVENT_UUID_RE.test(value);
}

export function eventPublicPath(event: { id: string; slug?: string | null }): string {
  const slug = event.slug?.trim();
  return `/e/${slug || event.id}`;
}

export function eventPublicUrl(event: { id: string; slug?: string | null }): string {
  return `https://tembas.com${eventPublicPath(event)}`;
}
