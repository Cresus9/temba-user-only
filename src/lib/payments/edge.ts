import { supabase, supabaseAnonKey, supabaseUrl } from '../supabase-client';

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
    'Content-Type': 'application/json',
    apikey: supabaseAnonKey,
    'x-application-name': 'Temba',
  };
  // Guest checkout uses the publishable key; functions with verify_jwt=false accept it.
  headers.Authorization = `Bearer ${session?.access_token || supabaseAnonKey}`;

  const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const rawText = await response.text();
  let json: unknown = null;
  if (rawText) {
    try {
      json = JSON.parse(rawText);
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    throw new Error(messageFromEdgeJson(json, response.status, rawText));
  }

  return json as T;
}

export function makeIdempotencyKey(prefix: 'web-stripe' | 'web-pawapay'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
