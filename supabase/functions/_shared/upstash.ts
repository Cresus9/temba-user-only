/**
 * _shared/upstash.ts
 *
 * Shared Upstash Redis + QStash helpers for all Temba Edge Functions.
 * Fail-open design: every function wraps calls in try/catch and returns
 * null/false when Upstash is unavailable — callers fall back to direct DB.
 *
 * Required Supabase secrets (Settings → Edge Functions → Secrets):
 *   UPSTASH_REDIS_REST_URL    https://xxx.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN  AXxx...
 *   QSTASH_TOKEN              eyJV... (from Upstash QStash console)
 *   FINALIZE_ORDER_SECRET     arbitrary shared secret (openssl rand -hex 32)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Config helpers
// ─────────────────────────────────────────────────────────────────────────────

function redisConfig(): { url: string; token: string } | null {
  const url   = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const token = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
  if (!url || !token) return null;
  return { url, token };
}

function qstashToken(): string | null {
  return Deno.env.get("QSTASH_TOKEN") ?? null;
}

export function upstashEnabled(): boolean {
  return redisConfig() !== null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Redis REST helpers
// ─────────────────────────────────────────────────────────────────────────────

async function redisCmd<T>(cmd: unknown[]): Promise<T | null> {
  const cfg = redisConfig();
  if (!cfg) return null;

  try {
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cmd),
    });
    if (!res.ok) {
      console.error(`[Upstash] HTTP ${res.status}`, await res.text());
      return null;
    }
    const json = await res.json();
    return json.result as T;
  } catch (err) {
    console.error("[Upstash] redis error:", err);
    return null;
  }
}

/** GET — returns string value or null on miss / unavailability */
export async function redisGet(key: string): Promise<string | null> {
  return redisCmd<string>(["GET", key]);
}

/** GET + JSON parse convenience wrapper */
export async function redisGetJson<T>(key: string): Promise<T | null> {
  const raw = await redisGet(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

/** SET EX (overwrite). Returns false if Redis unavailable. */
export async function redisSet(
  key: string,
  value: unknown,
  ttlSeconds?: number
): Promise<boolean> {
  const cmd: unknown[] = ["SET", key, typeof value === "string" ? value : JSON.stringify(value)];
  if (ttlSeconds) cmd.push("EX", ttlSeconds);
  const result = await redisCmd<string>(cmd);
  return result === "OK";
}

/**
 * SET NX EX — atomic "set only if Not eXists".
 * Returns true  = key was set (first caller wins)
 *         false = key already existed (duplicate)
 *         null  = Redis unavailable
 */
export async function redisSetNx(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<boolean | null> {
  const cmd: unknown[] = [
    "SET",
    key,
    typeof value === "string" ? value : JSON.stringify(value),
    "NX",
    "EX",
    ttlSeconds,
  ];
  const result = await redisCmd<string | null>(cmd);
  if (result === null && !redisConfig()) return null; // Redis unavailable
  return result === "OK"; // "OK" = set, null = already existed
}

/** DEL one or more keys. Returns deleted count or 0 on error. */
export async function redisDel(...keys: string[]): Promise<number> {
  const result = await redisCmd<number>(["DEL", ...keys]);
  return result ?? 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// QStash helpers
// ─────────────────────────────────────────────────────────────────────────────

interface QStashOptions {
  /** Deduplication ID — only one message with this ID can exist in the queue */
  dedupId?: string;
  /** Delay in seconds before the message is delivered */
  delay?: number;
  /** Number of retries on 5xx (default: 3) */
  retries?: number;
  /** Extra headers forwarded by QStash to the destination (e.g. auth secrets) */
  forwardHeaders?: Record<string, string>;
}

/**
 * Publish a JSON message to QStash v2.
 * Returns true on success, false if QSTASH_TOKEN is missing or HTTP error.
 */
export async function qstashPublish(
  destinationUrl: string,
  body: unknown,
  opts: QStashOptions = {}
): Promise<boolean> {
  const token = qstashToken();
  if (!token) {
    console.warn("[QStash] QSTASH_TOKEN not set — skipping publish");
    return false;
  }

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Upstash-Retries": String(opts.retries ?? 3),
    };

    if (opts.dedupId)  headers["Upstash-Deduplication-Id"] = opts.dedupId;
    if (opts.delay)    headers["Upstash-Delay"]            = `${opts.delay}s`;

    // Forward custom headers to the destination (e.g. X-Finalize-Secret)
    if (opts.forwardHeaders) {
      for (const [k, v] of Object.entries(opts.forwardHeaders)) {
        headers[`Upstash-Forward-${k}`] = v;
      }
    }

    const res = await fetch(
      `https://qstash.upstash.io/v2/publish/${encodeURIComponent(destinationUrl)}`,
      { method: "POST", headers, body: JSON.stringify(body) }
    );

    if (!res.ok) {
      console.error(`[QStash] HTTP ${res.status}`, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[QStash] publish error:", err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify X-Finalize-Secret header.
 * Returns true if the env var is not set (dev/local mode).
 */
export function verifyFinalizeSecret(req: Request): boolean {
  const secret = Deno.env.get("FINALIZE_ORDER_SECRET");
  if (!secret) return true; // dev mode — skip
  return req.headers.get("X-Finalize-Secret") === secret;
}

// ─────────────────────────────────────────────────────────────────────────────
// Key patterns
// ─────────────────────────────────────────────────────────────────────────────

/** `temba:payment:{id}:status` */
export function paymentStatusKey(paymentId: string): string {
  return `temba:payment:${paymentId}:status`;
}

/** `temba:webhook:{provider}:{id}` */
export function webhookDedupKey(provider: string, id: string): string {
  return `temba:webhook:${provider}:${id}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TTL constants (seconds)
// ─────────────────────────────────────────────────────────────────────────────

export const PAYMENT_STATUS_TTL = 7_200;   // 2 h
export const WEBHOOK_DEDUP_TTL  = 86_400;  // 24 h

// ─────────────────────────────────────────────────────────────────────────────
// Cache key constants (shared with get-events / get-categories)
// ─────────────────────────────────────────────────────────────────────────────

export const CACHE_KEYS = {
  EVENTS_PUBLISHED: "events:published",
  EVENTS_FEATURED:  "events:featured",
  CATEGORIES_ALL:   "categories:all",
  BANNERS_ACTIVE:   "banners:active",
} as const;

export const CACHE_TTL = {
  EVENTS:     5  * 60,
  CATEGORIES: 30 * 60,
  BANNERS:    10 * 60,
} as const;
