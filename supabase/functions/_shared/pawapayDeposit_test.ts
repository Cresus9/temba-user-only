// deno test supabase/functions/_shared/pawapayDeposit_test.ts
import { assertEquals } from "jsr:@std/assert@1";
import {
  bfOperatorOf,
  classifyInitiation,
  frenchFailureMessage,
  isFinalDepositStatus,
  providerMismatchMessage,
  readDepositStatus,
  toBfMsisdn,
} from "./pawapayDeposit.ts";

Deno.test("toBfMsisdn keeps the leading 0 of Moov 01/02/03 numbers", () => {
  assertEquals(toBfMsisdn("01234567"), "22601234567");
  assertEquals(toBfMsisdn("+226 01 23 45 67"), "22601234567");
  assertEquals(toBfMsisdn("0022601234567"), "22601234567");
});

Deno.test("toBfMsisdn repairs +226 numbers whose 0 was stripped by old app builds", () => {
  assertEquals(toBfMsisdn("+2261234567"), "22601234567");
  assertEquals(toBfMsisdn("2265123456"), "22605123456");
});

Deno.test("toBfMsisdn keeps every shape the old code accepted", () => {
  assertEquals(toBfMsisdn("75581026"), "22675581026");
  assertEquals(toBfMsisdn("+22675581026"), "22675581026");
  assertEquals(toBfMsisdn("22675581026"), "22675581026");
  assertEquals(toBfMsisdn("075581026"), "22675581026");
  assertEquals(toBfMsisdn("0075581026"), "22675581026");
  assertEquals(toBfMsisdn("226075581026"), "22675581026");
  assertEquals(toBfMsisdn("70 12 34 56"), "22670123456");
});

Deno.test("toBfMsisdn rejects what pawaPay would reject", () => {
  assertEquals(toBfMsisdn(""), null);
  assertEquals(toBfMsisdn(null), null);
  assertEquals(toBfMsisdn("1234"), null);
  assertEquals(toBfMsisdn("+2250701020304"), null);
  assertEquals(toBfMsisdn("+2268123456"), null);
});

Deno.test("bfOperatorOf follows the official numbering plan", () => {
  for (const p of ["01", "02", "03", "50", "53", "60", "63", "70", "73"]) assertEquals(bfOperatorOf(`226${p}123456`), "MOOV");
  for (const p of ["04", "07", "44", "54", "57", "64", "67", "74", "77"]) assertEquals(bfOperatorOf(`226${p}123456`), "ORANGE");
  for (const p of ["58", "68", "69", "78", "79"]) assertEquals(bfOperatorOf(`226${p}123456`), "TELECEL");
  assertEquals(bfOperatorOf("22625123456"), null);
});

Deno.test("providerMismatchMessage only blocks Moov with another operator's number", () => {
  assertEquals(providerMismatchMessage("MOOV_BFA", "22670123456"), null);
  assertEquals(providerMismatchMessage("MOOV_BFA", "22601234567"), null);
  assertEquals(typeof providerMismatchMessage("MOOV_BFA", "22675581026"), "string");
  assertEquals(typeof providerMismatchMessage("MOOV_BFA", "22678123456"), "string");
  assertEquals(providerMismatchMessage("MOOV_BFA", "22625123456"), null); // unknown prefix: let pawaPay decide
  assertEquals(providerMismatchMessage("ORANGE_BFA", "22670123456"), null); // Orange unchanged
});

Deno.test("classifyInitiation treats REJECTED as a failure, ACCEPTED as pending", () => {
  assertEquals(classifyInitiation(true, { depositId: "x", status: "ACCEPTED" }).kind, "accepted");
  assertEquals(classifyInitiation(true, { depositId: "x", status: "DUPLICATE_IGNORED" }).kind, "accepted");
  assertEquals(classifyInitiation(true, { depositId: "x", status: "COMPLETED" }).kind, "completed");
  const r = classifyInitiation(true, {
    depositId: "x",
    status: "REJECTED",
    failureReason: { failureCode: "PROVIDER_TEMPORARILY_UNAVAILABLE", failureMessage: "down" },
  });
  assertEquals(r.kind, "rejected");
  if (r.kind === "rejected") assertEquals(r.failureCode, "PROVIDER_TEMPORARILY_UNAVAILABLE");
  assertEquals(classifyInitiation(false, { failureReason: { failureCode: "DEPOSITS_NOT_ALLOWED" } }).kind, "rejected");
});

Deno.test("readDepositStatus reads the v2 envelope", () => {
  assertEquals(readDepositStatus({ status: "FOUND", data: { status: "COMPLETED" } }).status, "COMPLETED");
  assertEquals(readDepositStatus({ status: "FOUND", data: { status: "IN_RECONCILIATION" } }).status, "IN_RECONCILIATION");
  assertEquals(
    readDepositStatus({ status: "FOUND", data: { status: "FAILED", failureReason: { failureCode: "PAYMENT_NOT_APPROVED" } } }).failureCode,
    "PAYMENT_NOT_APPROVED",
  );
  assertEquals(readDepositStatus({ status: "NOT_FOUND" }).found, false);
  assertEquals(readDepositStatus([{ status: "COMPLETED" }]).status, "COMPLETED");
});

Deno.test("only COMPLETED and FAILED are final", () => {
  assertEquals(["COMPLETED", "FAILED"].every(isFinalDepositStatus), true);
  assertEquals(["ACCEPTED", "PROCESSING", "IN_RECONCILIATION", "FOUND", "NOT_FOUND", ""].some(isFinalDepositStatus), false);
});

Deno.test("frenchFailureMessage has a fallback", () => {
  assertEquals(frenchFailureMessage("DEPOSITS_NOT_ALLOWED").includes("activé"), true);
  assertEquals(frenchFailureMessage("SOMETHING_NEW").length > 10, true);
});
