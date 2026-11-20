// Pure helpers for pawaPay v2 deposits (no network, no Supabase).
// Used by create-pawapay-payment and check-pawapay-status; unit-tested in
// supabase/functions/_shared/pawapayDeposit.test.ts.

/**
 * Burkina Faso mobile prefixes (first two digits of the 8-digit number).
 * Source: Moov Africa Burkina numbering plan (https://moov-africa.bf/plan-numerotation/),
 * aligned with ARCEP's Plan National de Numérotation (décision n°2024-050).
 */
export const BF_MOBILE_PREFIXES = {
  MOOV: ["01", "02", "03", "50", "51", "52", "53", "60", "61", "62", "63", "70", "71", "72", "73"],
  ORANGE: ["04", "05", "06", "07", "44", "45", "46", "54", "55", "56", "57", "64", "65", "66", "67", "74", "75", "76", "77"],
  TELECEL: ["58", "68", "69", "78", "79"],
} as const;

export type BfOperator = keyof typeof BF_MOBILE_PREFIXES;

/**
 * Turn whatever the client sent into a Burkina MSISDN (226 + 8 digits), or null.
 *
 * BF numbers are a closed 8-digit plan and several real prefixes start with 0
 * (Moov 01/02/03, Orange 04–07). The old code stripped every leading 0, which
 * turned 01 23 45 67 into 1234567 and failed. Older app builds also strip that
 * 0 before sending (+2261234567), so a 226 + 7-digit number whose first digit is
 * 1–7 is repaired by putting the 0 back: that shape is never valid otherwise.
 */
export function toBfMsisdn(raw: string | null | undefined): string | null {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("00226")) d = d.slice(2);
  if (d.length === 8) return `226${d}`;
  if (d.length === 9 && d.startsWith("0")) return `226${d.slice(1)}`; // stray trunk 0 before an 8-digit number
  if (d.startsWith("226")) {
    const local = d.slice(3);
    if (local.length === 8) return d;
    if (local.length === 9 && local.startsWith("0") && local[1] !== "0") return `226${local.slice(1)}`;
    if (local.length === 7 && /^[1-7]/.test(local)) return `2260${local}`;
  }
  // Legacy shape the old code accepted: several zeros before an 8-digit number.
  const z = d.replace(/^0+/, "");
  if (z.length === 8 && d.length > 8) return `226${z}`;
  return null;
}

export function bfOperatorOf(msisdn: string): BfOperator | null {
  if (!/^226\d{8}$/.test(msisdn)) return null;
  const p = msisdn.slice(3, 5);
  for (const op of Object.keys(BF_MOBILE_PREFIXES) as BfOperator[]) {
    if ((BF_MOBILE_PREFIXES[op] as readonly string[]).includes(p)) return op;
  }
  return null;
}

/**
 * French message when the number clearly belongs to another operator than the
 * one picked. Only Moov is checked: Orange keeps its current behaviour.
 */
export function providerMismatchMessage(provider: string, msisdn: string): string | null {
  if (provider !== "MOOV_BFA") return null;
  const op = bfOperatorOf(msisdn);
  if (!op || op === "MOOV") return null;
  const name = op === "ORANGE" ? "Orange" : "Telecel";
  return `Ce numéro est un numéro ${name}, pas Moov. Choisissez ${op === "ORANGE" ? "Orange Money" : "un numéro Moov Money"} ou saisissez votre numéro Moov.`;
}

export type InitiationOutcome =
  | { kind: "accepted"; status: string }
  | { kind: "completed"; status: string }
  | { kind: "rejected"; status: string; failureCode: string; failureMessage: string };

/**
 * pawaPay v2 POST /deposits answers 200 with status ACCEPTED, DUPLICATE_IGNORED
 * or REJECTED (+ failureReason). REJECTED means nothing was sent to the phone,
 * so the payment is over; it must not be left pending.
 */
export function classifyInitiation(httpOk: boolean, body: any): InitiationOutcome {
  const status = String(body?.status ?? "").toUpperCase();
  if (httpOk && (status === "ACCEPTED" || status === "DUPLICATE_IGNORED" || status === "SUBMITTED" || status === "PROCESSING" || status === "ENQUEUED")) {
    return { kind: "accepted", status };
  }
  if (httpOk && status === "COMPLETED") return { kind: "completed", status };
  return {
    kind: "rejected",
    status: status || "ERROR",
    failureCode: String(body?.failureReason?.failureCode ?? body?.failureCode ?? (httpOk ? "UNKNOWN" : "HTTP_ERROR")),
    failureMessage: String(body?.failureReason?.failureMessage ?? body?.message ?? ""),
  };
}

const FR_FAILURES: Record<string, string> = {
  INVALID_PHONE_NUMBER: "Numéro invalide. Vérifiez votre numéro Mobile Money.",
  PAYER_NOT_FOUND: "Ce numéro n'a pas de compte chez cet opérateur. Vérifiez le numéro ou l'opérateur choisi.",
  INVALID_PROVIDER: "Cet opérateur n'est pas disponible pour ce paiement.",
  DEPOSITS_NOT_ALLOWED: "Cet opérateur n'est pas encore activé pour les paiements Temba.",
  PROVIDER_TEMPORARILY_UNAVAILABLE: "L'opérateur est momentanément indisponible. Réessayez dans quelques minutes ou choisissez un autre moyen de paiement.",
  AMOUNT_OUT_OF_BOUNDS: "Le montant dépasse les limites de l'opérateur pour un paiement.",
  INVALID_AMOUNT: "Montant non accepté par l'opérateur.",
  INVALID_CURRENCY: "Devise non acceptée par l'opérateur.",
  PAYMENT_IN_PROGRESS: "Un autre paiement est déjà en cours sur ce numéro. Attendez quelques minutes puis réessayez.",
  INSUFFICIENT_BALANCE: "Solde insuffisant sur votre compte Mobile Money.",
  PAYMENT_NOT_APPROVED: "Le paiement n'a pas été validé sur le téléphone.",
  WALLET_LIMIT_REACHED: "Votre compte Mobile Money a atteint sa limite.",
};

export function frenchFailureMessage(code: string | null | undefined): string {
  return FR_FAILURES[String(code ?? "")] ?? "Le paiement n'a pas pu démarrer. Réessayez ou choisissez un autre moyen de paiement.";
}

/** Status of GET /v2/deposits/{id}: { status: "FOUND", data: { status } } or { status: "NOT_FOUND" }. v1 returned an array. */
export function readDepositStatus(apiBody: any): { found: boolean; status: string; failureCode: string | null } {
  if (Array.isArray(apiBody)) {
    const d = apiBody[0];
    return { found: !!d, status: String(d?.status ?? "").toUpperCase(), failureCode: d?.failureReason?.failureCode ?? null };
  }
  const envelope = String(apiBody?.status ?? "").toUpperCase();
  if (envelope === "NOT_FOUND") return { found: false, status: "NOT_FOUND", failureCode: null };
  if (envelope === "FOUND" || apiBody?.data) {
    const d = apiBody?.data ?? {};
    return { found: true, status: String(d.status ?? "").toUpperCase(), failureCode: d.failureReason?.failureCode ?? null };
  }
  return { found: !!envelope, status: envelope, failureCode: apiBody?.failureReason?.failureCode ?? null };
}

/** Final statuses only. IN_RECONCILIATION / PROCESSING / ACCEPTED are still in flight. */
export function isFinalDepositStatus(status: string): boolean {
  return status === "COMPLETED" || status === "FAILED";
}
