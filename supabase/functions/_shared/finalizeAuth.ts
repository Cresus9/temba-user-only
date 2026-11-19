/**
 * Finalize auth.
 *
 * The cron job still sends the legacy service_role JWT. That token is signed
 * for this project and its role is service_role, but it is not the same string
 * as the edge runtime SUPABASE_SERVICE_ROLE_KEY (often a new sb_secret_ key).
 * Anon keys and user tokens stay rejected.
 */

export type JwtParts = {
  alg: string;
  role: string;
  iss: string;
  ref: string;
  exp: number;
  signingInput: string;
  signature: Uint8Array;
};

const textEncoder = new TextEncoder();

export function timingSafeEqual(a: string, b: string): boolean {
  const left = textEncoder.encode(a);
  const right = textEncoder.encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}

function timingSafeEqualBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}

function bytesFromBase64Url(value: string): Uint8Array | null {
  if (!value || /[^A-Za-z0-9_-]/.test(value)) return null;
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  try {
    const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function jsonFromBase64Url(value: string): Record<string, unknown> | null {
  const bytes = bytesFromBase64Url(value);
  if (!bytes) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

/** Reads a JWT without trusting it. null when the token is not a JWT. */
export function readUnverifiedJwt(token: string): JwtParts | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const header = jsonFromBase64Url(parts[0]);
  const payload = jsonFromBase64Url(parts[1]);
  const signature = bytesFromBase64Url(parts[2]);
  if (!header || !payload || !signature) return null;
  return {
    alg: typeof header.alg === "string" ? header.alg : "",
    role: typeof payload.role === "string" ? payload.role : "",
    iss: typeof payload.iss === "string" ? payload.iss : "",
    ref: typeof payload.ref === "string" ? payload.ref : "",
    exp: typeof payload.exp === "number" ? payload.exp : 0,
    signingInput: `${parts[0]}.${parts[1]}`,
    signature,
  };
}

export function projectRefFromSupabaseUrl(supabaseUrl: string): string {
  try {
    return new URL(supabaseUrl).hostname.split(".")[0] || "";
  } catch {
    return "";
  }
}

function issMatchesProject(iss: string, supabaseUrl: string): boolean {
  const origin = supabaseUrl.replace(/\/$/, "");
  return iss === "supabase" || iss === `${origin}/auth/v1`;
}

/** Claim checks only. The signature is a separate step. */
export function serviceRoleClaimsOk(jwt: JwtParts, supabaseUrl: string, nowSeconds: number): boolean {
  const ref = projectRefFromSupabaseUrl(supabaseUrl);
  if (!ref) return false;
  if (jwt.alg !== "HS256") return false;
  if (jwt.role !== "service_role") return false;
  if (!jwt.exp || jwt.exp <= nowSeconds) return false;
  if (jwt.ref && jwt.ref !== ref) return false;
  if (!issMatchesProject(jwt.iss, supabaseUrl)) return false;
  return true;
}

export async function hmacSha256(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, textEncoder.encode(data)));
}

export async function serviceRoleJwtSignatureOk(jwt: JwtParts, jwtSecret: string): Promise<boolean> {
  if (!jwtSecret) return false;
  const expected = await hmacSha256(jwtSecret, jwt.signingInput);
  return timingSafeEqualBytes(expected, jwt.signature);
}

/**
 * Asks this project's Auth server whether the credential is a service-role key.
 * The body is discarded and never logged. Anon and user tokens get a non-200.
 */
export async function probeProjectServiceRole(supabaseUrl: string, token: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL("/auth/v1/admin/users", supabaseUrl);
  } catch {
    return false;
  }
  url.searchParams.set("page", "1");
  url.searchParams.set("per_page", "1");
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: token,
        Accept: "application/json",
      },
    });
    await res.body?.cancel();
    return res.status === 200;
  } catch {
    return false;
  }
}

export async function authorizeFinalize(input: {
  finalizeSecret: string;
  presentedSecret: string;
  serviceRoleKey: string;
  bearer: string;
  supabaseUrl: string;
  jwtSecret: string;
  nowSeconds?: number;
  probe?: (token: string) => Promise<boolean>;
}): Promise<boolean> {
  if (!input.finalizeSecret) return true;
  if (input.presentedSecret && timingSafeEqual(input.presentedSecret, input.finalizeSecret)) return true;
  if (input.serviceRoleKey && input.bearer && timingSafeEqual(input.bearer, input.serviceRoleKey)) return true;
  if (!input.bearer) return false;
  if (input.bearer.startsWith("sb_publishable_") || input.bearer.startsWith("sb_anon_")) return false;

  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const jwt = readUnverifiedJwt(input.bearer);
  if (jwt) {
    if (!serviceRoleClaimsOk(jwt, input.supabaseUrl, now)) return false;
    if (input.jwtSecret && await serviceRoleJwtSignatureOk(jwt, input.jwtSecret)) return true;
    if (!input.probe) return false;
    return input.probe(input.bearer);
  }

  if (input.bearer.startsWith("sb_secret_") && input.probe) return input.probe(input.bearer);
  return false;
}
