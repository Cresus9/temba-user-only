import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  authorizeFinalize,
  hmacSha256,
  probeProjectServiceRole,
  serviceRoleClaimsOk,
  serviceRoleJwtSignatureOk,
  type JwtParts,
} from "../../../supabase/functions/_shared/finalizeAuth";

const SECRET = "test-jwt-secret-not-a-real-key";
const URL = "https://wlyncuwbzhzjafmqozcm.supabase.co";
const NOW = 1_700_000_000;

function b64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function signJwt(payload: Record<string, unknown>, secret = SECRET, alg = "HS256") {
  const header = b64url(JSON.stringify({ alg, typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const input = `${header}.${body}`;
  const sig = alg === "none" ? "" : createHmac("sha256", secret).update(input).digest("base64url");
  return `${input}.${sig}`;
}

function servicePayload(overrides: Record<string, unknown> = {}) {
  return {
    role: "service_role",
    iss: "supabase",
    ref: "wlyncuwbzhzjafmqozcm",
    iat: NOW - 60,
    exp: NOW + 60 * 60 * 24 * 365,
    ...overrides,
  };
}

function baseInput(overrides: Partial<Parameters<typeof authorizeFinalize>[0]> = {}) {
  return {
    finalizeSecret: "finalize-secret",
    presentedSecret: "",
    serviceRoleKey: "sb_secret_runtime_key",
    bearer: "",
    supabaseUrl: URL,
    jwtSecret: SECRET,
    nowSeconds: NOW,
    ...overrides,
  };
}

describe("finalize auth", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts a legacy service_role JWT signed for this project", async () => {
    const probe = vi.fn(async () => false);
    const ok = await authorizeFinalize(baseInput({
      bearer: signJwt(servicePayload()),
      probe,
    }));
    expect(ok).toBe(true);
    expect(probe).not.toHaveBeenCalled();
  });

  it("accepts the auth-server issuer as well as the legacy iss", async () => {
    const ok = await authorizeFinalize(baseInput({
      bearer: signJwt(servicePayload({ iss: `${URL}/auth/v1` })),
    }));
    expect(ok).toBe(true);
  });

  it("rejects an anon JWT even when the signature is valid", async () => {
    const probe = vi.fn(async () => true);
    const ok = await authorizeFinalize(baseInput({
      bearer: signJwt(servicePayload({ role: "anon" })),
      probe,
    }));
    expect(ok).toBe(false);
    expect(probe).not.toHaveBeenCalled();
  });

  it("rejects a user JWT even when the signature is valid", async () => {
    const probe = vi.fn(async () => true);
    const ok = await authorizeFinalize(baseInput({
      bearer: signJwt(servicePayload({ role: "authenticated" })),
      probe,
    }));
    expect(ok).toBe(false);
    expect(probe).not.toHaveBeenCalled();
  });

  it("rejects a service_role JWT for another project", async () => {
    const probe = vi.fn(async () => true);
    const ok = await authorizeFinalize(baseInput({
      bearer: signJwt(servicePayload({ ref: "someoneelse" })),
      probe,
    }));
    expect(ok).toBe(false);
    expect(probe).not.toHaveBeenCalled();
  });

  it("rejects an expired service_role JWT", async () => {
    const probe = vi.fn(async () => true);
    const ok = await authorizeFinalize(baseInput({
      bearer: signJwt(servicePayload({ exp: NOW - 10 })),
      probe,
    }));
    expect(ok).toBe(false);
    expect(probe).not.toHaveBeenCalled();
  });

  it("rejects alg none without calling the project", async () => {
    const probe = vi.fn(async () => true);
    const ok = await authorizeFinalize(baseInput({
      bearer: signJwt(servicePayload(), SECRET, "none"),
      probe,
    }));
    expect(ok).toBe(false);
    expect(probe).not.toHaveBeenCalled();
  });

  it("rejects a bad signature when the project also rejects it", async () => {
    const probe = vi.fn(async () => false);
    const ok = await authorizeFinalize(baseInput({
      bearer: signJwt(servicePayload(), "other-secret"),
      probe,
    }));
    expect(ok).toBe(false);
    expect(probe).toHaveBeenCalledOnce();
  });

  it("accepts the legacy JWT via the project check when the local secret is absent", async () => {
    const token = signJwt(servicePayload());
    const probe = vi.fn(async () => true);
    const ok = await authorizeFinalize(baseInput({
      bearer: token,
      jwtSecret: "",
      probe,
    }));
    expect(ok).toBe(true);
    expect(probe).toHaveBeenCalledWith(token);
  });

  it("still accepts the runtime service key and the finalize secret", async () => {
    const probe = vi.fn(async () => false);
    await expect(authorizeFinalize(baseInput({
      bearer: "sb_secret_runtime_key",
      probe,
    }))).resolves.toBe(true);
    await expect(authorizeFinalize(baseInput({
      presentedSecret: "finalize-secret",
      probe,
    }))).resolves.toBe(true);
    expect(probe).not.toHaveBeenCalled();
  });

  it("does not treat a publishable key as a service key", async () => {
    const probe = vi.fn(async () => true);
    const ok = await authorizeFinalize(baseInput({
      bearer: "sb_publishable_not_a_service_key",
      probe,
    }));
    expect(ok).toBe(false);
    expect(probe).not.toHaveBeenCalled();
  });

  it("can accept another sb_secret key only when the project confirms it", async () => {
    const probe = vi.fn(async () => true);
    await expect(authorizeFinalize(baseInput({
      bearer: "sb_secret_other_project_key",
      probe,
    }))).resolves.toBe(true);
    probe.mockResolvedValue(false);
    await expect(authorizeFinalize(baseInput({
      bearer: "sb_secret_other_project_key",
      probe,
    }))).resolves.toBe(false);
  });

  it("keeps dev mode open only when the finalize secret is unset", async () => {
    await expect(authorizeFinalize(baseInput({ finalizeSecret: "" }))).resolves.toBe(true);
  });

  it("asks Auth with the presented credential and drops the response body", async () => {
    const cancel = vi.fn(async () => {});
    const fetchMock = vi.fn(async () => ({
      status: 200,
      body: { cancel },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const token = signJwt(servicePayload());
    await expect(probeProjectServiceRole(URL, token)).resolves.toBe(true);
    const [calledUrl, init] = fetchMock.mock.calls[0];
    expect(String(calledUrl)).toBe(`${URL}/auth/v1/admin/users?page=1&per_page=1`);
    expect(init.headers.Authorization).toBe(`Bearer ${token}`);
    expect(init.headers.apikey).toBe(token);
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("treats a non-200 from Auth as not a service credential", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ status: 401, body: { cancel: async () => {} } })));
    await expect(probeProjectServiceRole(URL, "sb_secret_nope")).resolves.toBe(false);
  });

  it("matches the Web Crypto HMAC used for the signature", async () => {
    const token = signJwt(servicePayload());
    const [, payload, signature] = token.split(".");
    const header = token.split(".")[0];
    const jwt: JwtParts = {
      alg: "HS256",
      role: "service_role",
      iss: "supabase",
      ref: "wlyncuwbzhzjafmqozcm",
      exp: NOW + 10,
      signingInput: `${header}.${payload}`,
      signature: Buffer.from(signature, "base64url"),
    };
    expect(serviceRoleClaimsOk(jwt, URL, NOW)).toBe(true);
    await expect(serviceRoleJwtSignatureOk(jwt, SECRET)).resolves.toBe(true);
    const mac = await hmacSha256(SECRET, jwt.signingInput);
    expect(Buffer.from(mac).toString("base64url")).toBe(signature);
  });
});
