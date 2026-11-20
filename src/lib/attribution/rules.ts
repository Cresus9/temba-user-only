/**
 * Rules the Phase 1 SQL follows (temba_internal.decide_attribution,
 * commission_rate, record_order_rewards, reverse_order_rewards).
 * The database is the authority at payment time. This module is the
 * checked specification and the browser-side code normalizer.
 */

export const ATTRIBUTION_WINDOW_MS = 15 * 24 * 60 * 60 * 1000;
export const ATTRIBUTION_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;

export type AttributionKind = "user_referral" | "reseller";
export type AttributionStatus = "attributed" | "blocked";

export interface AttributionDecision {
  status: AttributionStatus;
  kind: AttributionKind | null;
  reason: string | null;
}

export function normalizeAttributionCode(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  if (!ATTRIBUTION_CODE_PATTERN.test(code)) return null;
  return code;
}

export function phoneTail(value: string | null | undefined): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits.slice(-8);
}

function comparableEmail(value: string | null | undefined): string | null {
  const email = (value ?? "").trim().toLowerCase();
  if (!email || email.endsWith("@temba.temp")) return null;
  return email;
}

function placeholderPhone(email: string | null | undefined): string | null {
  const raw = (email ?? "").trim().toLowerCase();
  if (!raw.endsWith("@temba.temp")) return null;
  return phoneTail(raw.split("@")[0] ?? "");
}

export function decideAttribution(input: {
  hasUser: boolean;
  hasReseller: boolean;
  resellerValid: boolean;
  resellerReason?: string | null;
  buyerId?: string | null;
  referrerId?: string | null;
  resellerUserId?: string | null;
  guestEmail?: string | null;
  referrerEmail?: string | null;
  resellerEmail?: string | null;
  referrerPhone?: string | null;
  resellerPhone?: string | null;
}): AttributionDecision {
  const guestEmail = comparableEmail(input.guestEmail);
  const guestPhone = placeholderPhone(input.guestEmail);

  if (input.hasUser && input.hasReseller) {
    return { status: "blocked", kind: null, reason: "ambiguous_code" };
  }

  if (input.hasReseller) {
    if (!input.resellerValid) {
      const reason = (input.resellerReason ?? "").trim() || "invalid_reseller_code";
      return { status: "blocked", kind: null, reason };
    }
    if (input.buyerId && input.resellerUserId && input.buyerId === input.resellerUserId) {
      return { status: "blocked", kind: null, reason: "self_referral" };
    }
    if (!input.buyerId && guestEmail && comparableEmail(input.resellerEmail) === guestEmail) {
      return { status: "blocked", kind: null, reason: "self_referral" };
    }
    if (!input.buyerId && guestPhone && phoneTail(input.resellerPhone) === guestPhone) {
      return { status: "blocked", kind: null, reason: "self_referral" };
    }
    return { status: "attributed", kind: "reseller", reason: null };
  }

  if (input.hasUser) {
    if (input.buyerId && input.referrerId && input.buyerId === input.referrerId) {
      return { status: "blocked", kind: null, reason: "self_referral" };
    }
    if (!input.buyerId && guestEmail && comparableEmail(input.referrerEmail) === guestEmail) {
      return { status: "blocked", kind: null, reason: "self_referral" };
    }
    if (!input.buyerId && guestPhone && phoneTail(input.referrerPhone) === guestPhone) {
      return { status: "blocked", kind: null, reason: "self_referral" };
    }
    return { status: "attributed", kind: "user_referral", reason: null };
  }

  return { status: "blocked", kind: null, reason: "unknown_code" };
}

/** Code override > per-event setting (including 0) > reseller rate > default. */
export function commissionRate(input: {
  codeOverride?: number | null;
  eventRate?: number | null;
  resellerRate?: number | null;
  defaultRate?: number | null;
}): number {
  if (input.codeOverride != null && input.codeOverride > 0) return input.codeOverride;
  if (input.eventRate != null) return input.eventRate;
  if (input.resellerRate != null && input.resellerRate > 0) return input.resellerRate;
  return input.defaultRate != null ? input.defaultRate : 8;
}

export function roundXof(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount);
}

export interface PlannedReward {
  kind: "referral_reward" | "referee_bonus" | "reseller_commission";
  idempotencyKey: string;
  amount: number;
}

export interface RewardPlanInput {
  orderId: string;
  paid: boolean;
  status: AttributionStatus | null;
  kind: AttributionKind | null;
  programEnabled: boolean;
  resellerProgramEnabled: boolean;
  basis: number;
  minPurchase: number;
  referrerReward: number | null;
  refereeBonus: number | null;
  commissionRate: number | null;
  referrerId: string | null;
  buyerId: string | null;
  guestEmail: string | null;
  resellerId: string | null;
}

export function referralIdempotencyKey(input: {
  referrerId: string;
  buyerId: string | null;
  guestEmail: string | null;
  orderId: string;
}): string {
  if (input.buyerId) return `referral_reward:${input.referrerId}:${input.buyerId}`;
  const email = (input.guestEmail ?? "").trim().toLowerCase();
  if (email) return `referral_reward:${input.referrerId}:guest:${email}`;
  return `referral_reward:${input.referrerId}:order:${input.orderId}`;
}

export function planRewards(input: RewardPlanInput): PlannedReward[] {
  if (!input.paid) return [];
  if (input.status !== "attributed" || !input.kind) return [];
  if (!(input.basis > 0)) return [];

  if (input.kind === "user_referral") {
    if (!input.programEnabled || !input.referrerId) return [];
    if (input.basis < input.minPurchase) return [];
    const writes: PlannedReward[] = [];
    if (input.referrerReward != null && input.referrerReward > 0) {
      writes.push({
        kind: "referral_reward",
        amount: roundXof(input.referrerReward),
        idempotencyKey: referralIdempotencyKey({
          referrerId: input.referrerId,
          buyerId: input.buyerId,
          guestEmail: input.guestEmail,
          orderId: input.orderId,
        }),
      });
    }
    if (input.buyerId && input.refereeBonus != null && input.refereeBonus > 0) {
      writes.push({
        kind: "referee_bonus",
        amount: roundXof(input.refereeBonus),
        idempotencyKey: `referee_bonus:${input.buyerId}`,
      });
    }
    return writes;
  }

  if (!input.resellerProgramEnabled || !input.resellerId) return [];
  const rate = input.commissionRate ?? 0;
  const amount = roundXof((input.basis * rate) / 100);
  if (!(amount > 0)) return [];
  return [
    {
      kind: "reseller_commission",
      amount,
      idempotencyKey: `reseller_commission:${input.orderId}`,
    },
  ];
}

/**
 * Whether an unauthenticated payment function may write the code.
 * An order created in this request is ours. Any other unpaid order needs
 * the buyer session or the guest token, and an existing code is left as it is.
 */
export function attributionAttachDecision(input: {
  createdInThisRequest: boolean;
  existingCode: string | null;
  orderUserId: string | null;
  jwtUserId: string | null;
  guestTokenMatches: boolean;
}): "allow" | "skip" {
  if (input.existingCode) return "skip";
  if (input.createdInThisRequest) return "allow";
  if (input.orderUserId) {
    return input.jwtUserId && input.jwtUserId === input.orderUserId ? "allow" : "skip";
  }
  return input.guestTokenMatches ? "allow" : "skip";
}

/** Stripe `charge.refunded` fires for a partial refund too. Only a full refund reverses rewards. */
export function isFullChargeRefund(input: {
  refunded?: boolean;
  amount?: number | null;
  amountRefunded?: number | null;
}): boolean {
  if (input.refunded === true) return true;
  const amount = input.amount ?? 0;
  const refundedAmount = input.amountRefunded ?? 0;
  return amount > 0 && refundedAmount >= amount;
}

export function planReversal(entries: Array<{ key: string; status: string }>): string[] {
  return entries
    .filter((entry) => !entry.key.startsWith("reversal:") && (entry.status === "pending" || entry.status === "available"))
    .map((entry) => `reversal:${entry.key}`);
}

/**
 * Server-side reuse guard (mirrored in the prepared SQL patch).
 * A later checkout of the same buyer + same code is credited only when
 * the client reports a click time after the earlier credited order, which
 * is what a new referral link produces. An event-specific click must match
 * the event being paid.
 */
export function shouldCreditRepeatedReseller(input: {
  alreadyCreditedSameBuyerAndCode: boolean;
  priorOrderCreatedAtMs: number | null;
  capturedAtMs: number | null;
  attributionEventId?: string | null;
  orderEventId?: string | null;
}): boolean {
  if (
    input.attributionEventId &&
    input.orderEventId &&
    input.attributionEventId !== input.orderEventId
  ) {
    return false;
  }
  if (!input.alreadyCreditedSameBuyerAndCode) return true;
  if (input.capturedAtMs == null || input.priorOrderCreatedAtMs == null) return false;
  return input.capturedAtMs > input.priorOrderCreatedAtMs;
}

/** First instant of the calendar day after the event, in the event timezone. */
export function holdAvailableAt(
  eventDate: string | null,
  timeZone: string,
  paidAt: Date,
  fallbackDays = 7,
): Date {
  if (!eventDate) {
    return new Date(paidAt.getTime() + fallbackDays * 24 * 60 * 60 * 1000);
  }
  const [year, month, day] = eventDate.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const nextDate = next.toISOString().slice(0, 10);
  return zonedMidnightToUtc(nextDate, timeZone || "Africa/Ouagadougou");
}

function zonedMidnightToUtc(isoDate: string, timeZone: string): Date {
  const asUtc = new Date(`${isoDate}T00:00:00Z`);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(formatter.formatToParts(asUtc).map((part) => [part.type, part.value]));
  const hour = Number(parts.hour) % 24;
  const asZoned = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), hour, Number(parts.minute), Number(parts.second));
  const offset = asZoned - asUtc.getTime();
  return new Date(asUtc.getTime() - offset);
}
