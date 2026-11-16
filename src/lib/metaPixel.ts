/** Meta Pixel "Temba". The server Purchase uses the same order id as eventID. */
export const META_PIXEL_ID = '1646664936924509';

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
  push?: Fbq;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
    /** Path already sent as PageView by the snippet in index.html or the last route effect. */
    __tembaFbPath?: string;
  }
}

const PURCHASE_PREFIX = 'temba_fbq_purchase_';
const ORDER_PREFIX = 'temba_fbq_order_';

export interface MetaOrderContext {
  orderId: string;
  eventId: string;
  value: number;
  currency: string;
  numItems: number;
}

export function currencyCode(currency?: string | null): string {
  const code = (currency || 'XOF').trim().toUpperCase();
  return code === 'FCFA' || code === 'CFA' ? 'XOF' : code;
}

/** XOF has no decimals. Other currencies keep two. */
export function moneyAmount(value: number, currency: string): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  if (currencyCode(currency) === 'XOF') return Math.round(amount);
  return Math.round(amount * 100) / 100;
}

function fbq(): Fbq | null {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return null;
  return window.fbq;
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  if (!match?.[1]) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/** First-party Meta cookies. Sent with the payment so the webhook can match the browser Purchase. */
export function metaBrowserMatch(): { fbp?: string; fbc?: string } {
  const fbp = readCookie('_fbp');
  const fbc = readCookie('_fbc');
  return {
    ...(fbp ? { fbp } : {}),
    ...(fbc ? { fbc } : {}),
  };
}

export function trackPageView(pathname: string) {
  const pixel = fbq();
  if (!pixel || !pathname) return;
  if (window.__tembaFbPath === pathname) return;
  window.__tembaFbPath = pathname;
  pixel('track', 'PageView');
}

const recentViews = new Map<string, number>();

export function trackViewContent(args: { eventId: string; value: number; currency?: string | null }) {
  const pixel = fbq();
  if (!pixel || !args.eventId) return;
  const currency = currencyCode(args.currency);
  const value = moneyAmount(args.value, currency);
  // Canonical /e/:uuid → /e/:slug remounts the page. Send one ViewContent for that open.
  const now = Date.now();
  const prev = recentViews.get(args.eventId);
  if (prev && now - prev < 2500) return;
  recentViews.set(args.eventId, now);
  pixel('track', 'ViewContent', {
    content_ids: [args.eventId],
    content_type: 'product',
    value,
    currency,
  });
}

export function trackInitiateCheckout(args: {
  eventId: string;
  value: number;
  currency?: string | null;
  numItems: number;
}) {
  const pixel = fbq();
  if (!pixel || !args.eventId) return;
  const currency = currencyCode(args.currency);
  const value = moneyAmount(args.value, currency);
  const numItems = Math.max(0, Math.round(Number(args.numItems) || 0));
  const dedupeKey = `temba_fbq_ic_${args.eventId}_${value}_${numItems}`;
  try {
    if (sessionStorage.getItem(dedupeKey)) return;
    sessionStorage.setItem(dedupeKey, '1');
  } catch {
    /* private mode — still send */
  }
  pixel('track', 'InitiateCheckout', {
    content_ids: [args.eventId],
    value,
    currency,
    num_items: numItems,
  });
}

/** Same-browser copy of the checkout total, so Purchase can use it after the payment redirect. */
export function rememberMetaOrder(ctx: MetaOrderContext) {
  if (!ctx.orderId || !ctx.eventId) return;
  try {
    const payload: MetaOrderContext = {
      orderId: ctx.orderId,
      eventId: ctx.eventId,
      value: moneyAmount(ctx.value, currencyCode(ctx.currency)),
      currency: currencyCode(ctx.currency),
      numItems: Math.max(1, Math.round(Number(ctx.numItems) || 1)),
    };
    localStorage.setItem(ORDER_PREFIX + ctx.orderId, JSON.stringify(payload));
  } catch {
    /* private mode */
  }
}

export function readMetaOrder(orderId: string): MetaOrderContext | null {
  try {
    const raw = localStorage.getItem(ORDER_PREFIX + orderId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MetaOrderContext;
    if (!parsed?.eventId || !Number.isFinite(Number(parsed.value))) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Fire Purchase once per order. eventID is the order id so a later server event can dedupe.
 * A joined ticket whose event id is actually the order id (guest mapping) is ignored.
 */
const PURCHASE_WINDOW_MS = 6 * 60 * 60 * 1000;

export function trackPurchase(args: {
  orderId: string;
  eventId?: string | null;
  value?: number | null;
  currency?: string | null;
  numItems?: number | null;
  createdAt?: string | null;
}) {
  const pixel = fbq();
  if (!pixel || !args.orderId) return;
  try {
    if (localStorage.getItem(PURCHASE_PREFIX + args.orderId)) return;
  } catch {
    /* still try to send */
  }

  const remembered = readMetaOrder(args.orderId);
  if (!remembered && args.createdAt) {
    const age = Date.now() - new Date(args.createdAt).getTime();
    if (Number.isFinite(age) && age > PURCHASE_WINDOW_MS) return;
  }
  const joinedId = args.eventId && args.eventId !== args.orderId ? args.eventId : null;
  const eventId = joinedId || remembered?.eventId;
  const passed = args.value != null && Number.isFinite(Number(args.value)) ? Number(args.value) : null;
  const rawValue = passed != null && passed > 0
    ? passed
    : (remembered && remembered.value > 0 ? remembered.value : passed);
  if (!eventId || rawValue == null || !Number.isFinite(Number(rawValue))) return;

  const currency = currencyCode(args.currency || remembered?.currency);
  const numItems = Math.max(
    1,
    Math.round(Number(args.numItems ?? remembered?.numItems) || 1),
  );

  try {
    localStorage.setItem(PURCHASE_PREFIX + args.orderId, '1');
  } catch {
    /* ignore */
  }

  pixel(
    'track',
    'Purchase',
    {
      value: moneyAmount(rawValue, currency),
      currency,
      content_ids: [eventId],
      content_type: 'product',
      num_items: numItems,
    },
    { eventID: args.orderId },
  );
}
