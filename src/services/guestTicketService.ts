import { supabase } from '../lib/supabase-client';
import { normalizePhone } from '../utils/phoneValidation';

const STORAGE_KEY = 'temba_guest_wallets';

/** Test only. Re-enable OTP (`false`) before production. */
export const SKIP_GUEST_TICKET_OTP = true;

const PLACEHOLDER_GUEST_EMAIL_DOMAIN = '@temba.temp';

/** True for empty or phone-derived addresses (not a real inbox). */
export function isPlaceholderGuestEmail(email?: string | null): boolean {
  const trimmed = (email || '').trim().toLowerCase();
  return !trimmed || trimmed.endsWith(PLACEHOLDER_GUEST_EMAIL_DOMAIN);
}

/** Real inbox only — omit placeholders so lookup/UI never treat them as contact. */
export function realGuestEmail(email?: string | null): string | undefined {
  const trimmed = (email || '').trim().toLowerCase();
  if (!trimmed || trimmed.endsWith(PLACEHOLDER_GUEST_EMAIL_DOMAIN)) return undefined;
  return trimmed;
}

/** Real email if typed; otherwise a phone-derived address so guest_email constraints pass. */
export function resolveGuestEmail(email?: string | null, phone?: string | null): string {
  const real = realGuestEmail(email);
  if (real) return real;
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length >= 8) return `${digits}${PLACEHOLDER_GUEST_EMAIL_DOMAIN}`;
  return '';
}

export interface GuestWallet {
  token: string;
  orderId: string;
  phone?: string;
  email?: string;
  savedAt: string;
}

export interface GuestTicketRow {
  id: string;
  order_id: string;
  qr_code: string;
  status?: string;
  ticket_type_name?: string;
  ticket_type_price?: number;
  event_title?: string;
  event_date?: string;
  event_time?: string;
  event_location?: string;
  event_image?: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  token?: string;
}

function phoneDigits(phone?: string | null): string {
  return (phone || '').replace(/\D/g, '');
}

export function phonesMatch(a?: string | null, b?: string | null): boolean {
  const da = phoneDigits(a);
  const db = phoneDigits(b);
  if (!da || !db) return false;
  if (da === db) return true;
  const tailA = da.slice(-8);
  const tailB = db.slice(-8);
  return tailA.length === 8 && tailA === tailB;
}

export function persistGuestWallet(wallet: Omit<GuestWallet, 'savedAt'>): void {
  if (!wallet.token || !wallet.orderId) return;
  try {
    const existing = listGuestWallets();
    const next = [
      {
        ...wallet,
        phone: wallet.phone ? normalizePhone(wallet.phone) : undefined,
        email: realGuestEmail(wallet.email),
        savedAt: new Date().toISOString(),
      },
      ...existing.filter(w => w.token !== wallet.token && w.orderId !== wallet.orderId),
    ].slice(0, 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // private mode / quota
  }
}

export function listGuestWallets(): GuestWallet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function walletsForPhone(phone: string): GuestWallet[] {
  return listGuestWallets().filter(w => phonesMatch(w.phone, phone));
}

export function walletsForEmail(email: string): GuestWallet[] {
  const needle = email.trim().toLowerCase();
  if (!needle) return [];
  return listGuestWallets().filter(w => (w.email || '').trim().toLowerCase() === needle);
}

export interface RecoveredOrder {
  token: string;
  orderId?: string;
  eventTitle?: string;
  eventDate?: string;
  ticketCount: number;
}

export async function previewsForTokens(tokens: string[]): Promise<RecoveredOrder[]> {
  const unique = [...new Set(tokens.filter(Boolean))];
  const previews = await Promise.all(
    unique.map(async (token): Promise<RecoveredOrder> => {
      try {
        const rows = await getGuestTicketsByToken(token);
        const first = rows[0];
        return {
          token,
          orderId: first?.order_id,
          eventTitle: first?.event_title,
          eventDate: first?.event_date,
          ticketCount: rows.length,
        };
      } catch {
        return { token, ticketCount: 0 };
      }
    }),
  );
  return previews;
}

function messageFromInvoke(data: unknown, error: { message?: string } | null, fallback: string): string {
  const body = data as { error?: string; message?: string } | null;
  if (body?.error) return body.error;
  if (body?.message) return body.message;
  const msg = error?.message || '';
  if (msg && msg !== 'Edge Function returned a non-2xx status code') return msg;
  return fallback;
}

export async function sendGuestRecoveryEmail(email: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('lookup-guest-tickets', {
    body: { action: 'send', email: email.trim().toLowerCase() },
  });
  if (error) {
    throw new Error(messageFromInvoke(data, error, "Impossible d'envoyer le code"));
  }
  if (data?.error) {
    throw new Error(data.error);
  }
}

export async function getGuestTicketsByToken(token: string): Promise<GuestTicketRow[]> {
  const loaded = await loadGuestTickets(token);
  return loaded.tickets;
}

export async function loadGuestTickets(token: string): Promise<{
  found: boolean;
  orderId?: string;
  eventTitle?: string;
  eventDate?: string;
  guestEmail?: string;
  guestPhone?: string;
  tickets: GuestTicketRow[];
}> {
  const { data, error } = await supabase.functions.invoke('lookup-guest-tickets', {
    body: { action: 'tickets', token: token.trim() },
  });

  if (error) {
    console.error('[guestTicketService] loadGuestTickets:', error);
    throw new Error(messageFromInvoke(data, error, 'Impossible de charger les billets invité'));
  }

  return {
    found: Boolean(data?.found),
    orderId: data?.orderId,
    eventTitle: data?.eventTitle,
    eventDate: data?.eventDate,
    guestEmail: data?.guestEmail,
    guestPhone: data?.guestPhone,
    tickets: Array.isArray(data?.tickets) ? (data.tickets as GuestTicketRow[]) : [],
  };
}

export async function lookupGuestTicketsByPhone(phone: string, code: string): Promise<{
  tokens: string[];
  error?: string;
}> {
  return lookupGuestTickets({ phone, code });
}

export async function lookupGuestTickets(params: {
  phone?: string;
  email?: string;
  code?: string;
}): Promise<{ tokens: string[]; previews: RecoveredOrder[]; error?: string }> {
  const email = params.email?.trim().toLowerCase();
  const phone = params.phone ? normalizePhone(params.phone) : undefined;
  const { data, error } = await supabase.functions.invoke('lookup-guest-tickets', {
    body: {
      action: 'verify',
      ...(SKIP_GUEST_TICKET_OTP ? {} : { code: (params.code || '').trim() }),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
    },
  });

  const local = email ? walletsForEmail(email) : phone ? walletsForPhone(phone) : [];
  const localTokens = local.map(w => w.token);

  if (error) {
    const serverError = (data as { error?: string } | null)?.error;
    if (!serverError && localTokens.length) {
      return { tokens: localTokens, previews: await previewsForTokens(localTokens) };
    }
    return {
      tokens: [],
      previews: [],
      error: serverError || messageFromInvoke(data, error, 'Recherche impossible'),
    };
  }

  const tokens: string[] = Array.isArray(data?.tokens) ? data.tokens : [];
  const merged = [...new Set([...tokens, ...localTokens])];
  const serverPreviews: RecoveredOrder[] = Array.isArray(data?.previews) ? data.previews : [];
  const missing = merged.filter(t => !serverPreviews.some(p => p.token === t));
  const extra = missing.length ? await previewsForTokens(missing) : [];
  return { tokens: merged, previews: [...serverPreviews, ...extra], error: data?.error };
}

export async function claimGuestOrdersForCurrentUser(): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return 0;

  const storedTokens = listGuestWallets().map(w => w.token);

  const { data, error } = await supabase.functions.invoke('claim-guest-orders', {
    body: { tokens: storedTokens },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) {
    console.warn('[guestTicketService] claim-guest-orders:', error);
    return 0;
  }
  return Number(data?.claimed ?? 0);
}

export function getGuestTokenForOrder(orderId?: string | null): string | null {
  if (!orderId) return null;
  try {
    const raw = localStorage.getItem('paymentDetails');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.guestToken && (!parsed.orderId || parsed.orderId === orderId)) {
        return parsed.guestToken;
      }
    }
  } catch {
    /* ignore */
  }
  return listGuestWallets().find(w => w.orderId === orderId)?.token ?? null;
}

export function guestRedirectForOrder(orderId?: string | null): string | null {
  const token = getGuestTokenForOrder(orderId);
  return token ? guestTicketsPath(token) : null;
}

export function guestTicketsPath(token: string): string {
  return `/guest/tickets/${token}`;
}

export function guestWhatsAppShareUrl(token: string, eventTitle?: string): string {
  const url = `https://tembas.com${guestTicketsPath(token)}`;
  const text = eventTitle
    ? `Mes billets Temba pour ${eventTitle} : ${url}`
    : `Mes billets Temba : ${url}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
