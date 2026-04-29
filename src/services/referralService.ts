/**
 * Referral backend — same Supabase project as `src/lib/supabase-client.ts` (env-driven).
 * `createClient` sends `apikey` (anon) automatically; user-scoped calls add `Authorization: Bearer <access_token>`.
 *
 * Edge Functions (POST → `/functions/v1/<name>` on that host):
 * - get-referral-config — public program config (no JWT required)
 * - generate-referral-link — JWT required
 * - track-referral — body `{ referralCode }` (+ optional fields), JWT required
 * - complete-referral — body `{ userId, orderId, orderAmount }` (prefer trusted server in production)
 *
 * Optional REST reads (same host `/rest/v1/…`) if RLS allows: referrals, user_credits,
 * credit_transactions, user_referral_codes.
 */
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase-client';
import { buildReferralShareLinks } from '../config/referralShare';
import { clearPendingReferralCode, getPendingReferralCode } from '../utils/referralStorage';
import {
  fetchUserCreditBalanceFromSupabase,
  fetchUserCreditTransactionsFromSupabase,
} from './creditService';

export type { CreditTransactionRow, UserCreditBalance } from './creditService';

export interface ReferralConfig {
  program_enabled?: boolean;
  trigger_event?: string;
  referrer_reward_amount?: number;
  referee_reward_amount?: number;
  referrer_reward_fcfa?: number;
  referee_reward_fcfa?: number;
  share_message_template?: string;
  [key: string]: unknown;
}

export interface ReferralLinks {
  oneLink?: string;
  one_link?: string;
  app?: string;
  web?: string;
}

export interface ReferralLinkPayload {
  referralCode?: string;
  code?: string;
  referral_code?: string;
  links?: ReferralLinks;
  shareMessage?: string;
  share_message?: string;
  /** True when code came from Edge Function; false when DB/env fallback only */
  source?: 'edge_function' | 'database' | 'merged';
}

export interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  creditsEarnedApprox: number;
}

export interface CompleteReferralInput {
  userId: string;
  orderId: string;
  orderAmount: number;
}

export interface ReferralActionResult {
  ok: boolean;
  message?: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Merges top-level JSON with nested `data` (common Edge Function pattern) so we read `referral_code`
 * whether it lives at the root or under `data`.
 */
function flattenEdgeResponse(raw: unknown): Record<string, unknown> | null {
  if (!isRecord(raw)) return null;
  const merged: Record<string, unknown> = { ...raw };
  if (isRecord(raw.data)) {
    Object.assign(merged, raw.data);
  }
  return merged;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function normalizeReferralConfig(raw: unknown): ReferralConfig | null {
  const obj = flattenEdgeResponse(raw);
  if (!obj) return null;
  const cfg = obj.config ?? obj.settings ?? obj.referral_config;
  if (isRecord(cfg)) return cfg as ReferralConfig;
  return obj as ReferralConfig;
}

function normalizeLinksObject(raw: unknown): ReferralLinks | undefined {
  if (!isRecord(raw)) return undefined;
  return {
    oneLink: pickString(raw, ['oneLink', 'one_link', 'onelink']),
    app: pickString(raw, ['app', 'app_link', 'deep_link']),
    web: pickString(raw, ['web', 'web_link', 'fallback_web']),
  };
}

function normalizeReferralLinkPayload(raw: unknown): ReferralLinkPayload | null {
  const obj = flattenEdgeResponse(raw);
  if (!obj) return null;

  let code = pickString(obj, [
    'referralCode',
    'referral_code',
    'code',
    'public_code',
    'invite_code',
    'user_referral_code',
    'referralCodeUpper',
  ]);

  if (!code) {
    const nestedKeys = ['referral', 'result', 'payload', 'referral_link', 'referralLink'];
    for (const key of nestedKeys) {
      const n = obj[key];
      if (isRecord(n)) {
        code = pickString(n, ['code', 'referralCode', 'referral_code', 'public_code', 'invite_code']);
        if (code) break;
      }
    }
  }

  let linksRaw = obj.links ?? obj.share_links ?? obj.urls;
  if (!linksRaw) {
    for (const key of ['referral', 'result', 'payload', 'referral_link', 'referralLink']) {
      const n = obj[key];
      if (isRecord(n) && (n.links || n.share_links || n.urls)) {
        linksRaw = n.links ?? n.share_links ?? n.urls;
        break;
      }
    }
  }
  const links = normalizeLinksObject(linksRaw);

  const shareMessage = pickString(obj, ['shareMessage', 'share_message', 'message', 'share_text']);

  const out: ReferralLinkPayload = {};
  if (code) {
    out.referralCode = code.toUpperCase();
  }
  if (links && Object.keys(links).length) {
    out.links = links;
  }
  if (shareMessage) {
    out.shareMessage = shareMessage;
  }
  if (out.referralCode || out.links || out.shareMessage) {
    out.source = 'edge_function';
    return out;
  }
  return null;
}

function mergeShareLinks(api: ReferralLinks | undefined, code: string): ReferralLinks {
  const built = buildReferralShareLinks(code);
  return {
    oneLink: api?.oneLink || api?.one_link || built.oneLink,
    app: api?.app || built.app,
    web: api?.web || built.web,
  };
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return headers;
}

/**
 * Web often mounts before `getSession()` hydrates from storage — same account works on mobile
 * because the native session is already warm. Refresh + short retry aligns web with that.
 */
async function ensureAccessToken(): Promise<string | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return session.access_token;
    }
    await supabase.auth.refreshSession();
    await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
  }
  return null;
}

/** If `functions.invoke` drops headers in some builds, direct fetch matches mobile/Postman. */
async function fetchGenerateReferralLinkDirect(accessToken: string): Promise<unknown | null> {
  try {
    const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/generate-referral-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({}),
    });
    const text = await res.text();
    if (!res.ok) {
      console.warn('[referral] generate-referral-link fetch', res.status, text.slice(0, 200));
      return null;
    }
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  } catch (e) {
    console.warn('[referral] generate-referral-link fetch exception', e);
    return null;
  }
}

function isBenignTrackError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('already') ||
    m.includes('duplicate') ||
    m.includes('self') ||
    m.includes('own code') ||
    m.includes('invalid') ||
    m.includes('disabled') ||
    m.includes('not found')
  );
}

/** Reads stored code if Edge Function did not return one (same Supabase DB as mobile). */
async function fetchReferralCodeFromUserTable(userId: string): Promise<string | null> {
  const { data, error } = await supabase.from('user_referral_codes').select('*').eq('user_id', userId).maybeSingle();

  if (error) {
    if (error.code !== '42P01') {
      console.warn('[referral] user_referral_codes:', error.message);
    }
    return null;
  }
  if (!isRecord(data)) return null;
  const code = pickString(data, ['code', 'referral_code', 'public_code', 'invite_code']);
  return code ? code.toUpperCase() : null;
}

/** Optional `profiles.referral_code` when present in schema (ignored if column missing). */
async function fetchReferralCodeFromProfile(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return null;
    const row = data as { referral_code?: unknown } | null;
    const c = row?.referral_code;
    if (typeof c !== 'string' || !c.trim()) return null;
    return c.trim().toUpperCase();
  } catch {
    return null;
  }
}

class ReferralService {
  async getConfig(): Promise<ReferralConfig | null> {
    try {
      const { data, error } = await supabase.functions.invoke('get-referral-config', {
        method: 'POST',
        body: {},
      });
      if (error) {
        console.warn('[referral] get-referral-config:', error.message);
        return null;
      }
      return normalizeReferralConfig(data);
    } catch (e) {
      console.warn('[referral] get-referral-config exception', e);
      return null;
    }
  }

  /**
   * Shareable code + links come from the `generate-referral-link` Edge Function (authoritative).
   * If the response omits `links`, we build OneLink / web / app URLs client-side (same as mobile).
   * If the function fails but `user_referral_codes` has a row, we still show a code + built links.
   */
  async getReferralLink(): Promise<ReferralLinkPayload | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    let fromEdge: ReferralLinkPayload | null = null;

    try {
      const token = await ensureAccessToken();
      if (!token) {
        console.warn('[referral] generate-referral-link: no access token after refresh');
      } else {
        const headers = { Authorization: `Bearer ${token}` };
        const { data, error } = await supabase.functions.invoke('generate-referral-link', {
          method: 'POST',
          body: {},
          headers,
        });
        if (error) {
          console.warn('[referral] generate-referral-link invoke:', error.message);
        }
        if (data != null) {
          fromEdge = normalizeReferralLinkPayload(data);
        }
        if (!fromEdge?.referralCode && token) {
          const direct = await fetchGenerateReferralLinkDirect(token);
          if (direct != null) {
            const parsed = normalizeReferralLinkPayload(direct);
            if (parsed) {
              fromEdge = parsed;
            }
          }
        }
      }
    } catch (e) {
      console.warn('[referral] generate-referral-link exception', e);
    }

    let code = fromEdge?.referralCode || fromEdge?.code || fromEdge?.referral_code;
    let source: ReferralLinkPayload['source'] = fromEdge?.source;

    if (!code) {
      const fromDb = await fetchReferralCodeFromUserTable(user.id);
      if (fromDb) {
        code = fromDb;
        source = 'database';
      }
    }

    if (!code) {
      const fromProfile = await fetchReferralCodeFromProfile(user.id);
      if (fromProfile) {
        code = fromProfile;
        source = 'database';
      }
    }

    if (!code) {
      return fromEdge;
    }

    const mergedLinks = mergeShareLinks(fromEdge?.links, code);
    const shareMessage =
      fromEdge?.shareMessage ||
      fromEdge?.share_message ||
      undefined;

    return {
      referralCode: code,
      code,
      links: mergedLinks,
      shareMessage,
      source: source ?? 'merged',
    };
  }

  async trackReferral(
    referralCode: string,
    options?: { appsflyerClickId?: string; deviceId?: string }
  ): Promise<ReferralActionResult> {
    const code = referralCode.trim().toUpperCase();
    if (!code) return { ok: false, message: 'empty code' };

    try {
      const headers = await authHeaders();
      if (!headers.Authorization) {
        return { ok: false, message: 'no session' };
      }
      const { data, error } = await supabase.functions.invoke('track-referral', {
        method: 'POST',
        body: {
          referralCode: code,
          referral_code: code,
          appsflyerClickId: options?.appsflyerClickId,
          appsflyer_click_id: options?.appsflyerClickId,
          deviceId: options?.deviceId,
          device_id: options?.deviceId,
        },
        headers,
      });
      if (error) {
        const msg = error.message || 'track-referral failed';
        return { ok: false, message: msg };
      }
      const top = flattenEdgeResponse(data);
      if (top && top.success === false) {
        return {
          ok: false,
          message: pickString(top, ['error', 'message']) || 'track failed',
        };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, message: e?.message || 'track exception' };
    }
  }

  async flushPendingReferralAfterAuth(): Promise<void> {
    const code = getPendingReferralCode();
    if (!code) return;

    const result = await this.trackReferral(code);
    if (result.ok) {
      clearPendingReferralCode();
      return;
    }
    if (result.message && isBenignTrackError(result.message)) {
      clearPendingReferralCode();
    }
  }

  async grantSignupBonus(): Promise<ReferralActionResult> {
    try {
      const headers = await authHeaders();
      if (!headers.Authorization) {
        return { ok: false, message: 'no session' };
      }

      const { data, error } = await supabase.functions.invoke('grant-signup-bonus', {
        method: 'POST',
        body: {},
        headers,
      });

      if (error) {
        return { ok: false, message: error.message || 'grant-signup-bonus failed' };
      }

      const top = flattenEdgeResponse(data);
      if (top && top.success === false) {
        return {
          ok: false,
          message: pickString(top, ['error', 'message']) || 'grant-signup-bonus failed',
        };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, message: e?.message || 'grant-signup-bonus exception' };
    }
  }

  async completeReferral(input: CompleteReferralInput): Promise<boolean> {
    try {
      const headers = await authHeaders();
      const { data, error } = await supabase.functions.invoke('complete-referral', {
        method: 'POST',
        body: {
          userId: input.userId,
          user_id: input.userId,
          orderId: input.orderId,
          order_id: input.orderId,
          orderAmount: input.orderAmount,
          order_amount: input.orderAmount,
        },
        headers,
      });
      if (error) {
        console.warn('[referral] complete-referral:', error.message);
        return false;
      }
      const top = flattenEdgeResponse(data);
      if (top?.success === false) return false;
      return true;
    } catch (e) {
      console.warn('[referral] complete-referral exception', e);
      return false;
    }
  }

  async getCreditBalance() {
    return fetchUserCreditBalanceFromSupabase();
  }

  async getCreditTransactions(limit = 25) {
    return fetchUserCreditTransactionsFromSupabase(limit);
  }

  async getReferralStats(): Promise<ReferralStats> {
    const empty: ReferralStats = {
      totalReferrals: 0,
      completedReferrals: 0,
      pendingReferrals: 0,
      creditsEarnedApprox: 0,
    };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return empty;

    const referrerColCandidates = ['referrer_id', 'referrer_user_id', 'referrerId'];
    const tables = ['referrals', 'referral_invitations'];

    let referrals: Record<string, unknown>[] | null = null;

    outer: for (const table of tables) {
      for (const col of referrerColCandidates) {
        const { data, error } = await supabase.from(table).select('*').eq(col, user.id);
        if (!error && Array.isArray(data)) {
          referrals = data as Record<string, unknown>[];
          break outer;
        }
      }
    }

    if (!referrals) {
      return empty;
    }

    let completed = 0;
    let pending = 0;
    for (const r of referrals) {
      const status = String(r.status ?? '').toLowerCase();
      if (status === 'completed' || status === 'rewarded' || status === 'paid') {
        completed += 1;
      } else {
        pending += 1;
      }
    }

    let creditsEarnedApprox = 0;
    const { data: rewards, error: rewardsError } = await supabase
      .from('referral_rewards')
      .select('amount')
      .eq('user_id', user.id);

    if (!rewardsError && rewards) {
      creditsEarnedApprox = (rewards as { amount?: number }[]).reduce(
        (sum, row) => sum + Number(row.amount ?? 0),
        0
      );
    }

    return {
      totalReferrals: referrals.length,
      completedReferrals: completed,
      pendingReferrals: pending,
      creditsEarnedApprox,
    };
  }
}

export const referralService = new ReferralService();
