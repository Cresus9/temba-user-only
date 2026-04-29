import { supabase, supabaseAnonKey } from '../supabase-client';

function messageFromEdgeJson(json: unknown, status: number, rawText: string): string {
  const sanitize = (value: string) =>
    value.replace(/\bsk_(live|test)_[A-Za-z0-9]+\b/g, 'sk_$1_***');
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>;
    if (typeof o.error === 'string') return sanitize(o.error);
    if (typeof o.message === 'string') return sanitize(o.message);
    if (typeof o.detail === 'string') return sanitize(o.detail);
  }
  const t = rawText?.trim();
  if (t && t.length > 0 && t.length < 400) return sanitize(t);
  return `HTTP ${status}`;
}

export async function postEdgeFunctionAnon<T>(
  name: string,
  body: Record<string, unknown>
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    apikey: supabaseAnonKey,
  };

  // Prefer user access token when available. If not authenticated, only send anon as bearer
  // when it is a legacy JWT key (publishable keys are not JWTs and cause 401 when forced).
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  } else if (supabaseAnonKey.startsWith('eyJ')) {
    headers.Authorization = `Bearer ${supabaseAnonKey}`;
  }

  const { data, error, response } = await supabase.functions.invoke(name, {
    body,
    headers,
  });

  if (!error) {
    return data as T;
  }

  let rawText = '';
  let json: unknown = null;
  let status = response?.status ?? 500;
  try {
    rawText = await response?.clone().text();
    if (rawText) {
      json = JSON.parse(rawText);
    }
  } catch {
    // ignore parse errors, fallback to raw text
  }

  throw new Error(messageFromEdgeJson(json, status, rawText || error.message || `HTTP ${status}`));
}

export function makeIdempotencyKey(prefix: 'web-stripe' | 'web-pawapay'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
