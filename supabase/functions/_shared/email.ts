/** Shared HTML for Resend. Table layout + inline styles only.
 * Visual language adapted from 21st.dev Email Verification Card
 * (diarmuradi/verification-1) and Minimal Welcome Onboarding
 * (ziegfiroyt/onboarding3): centered mark, muted copy, digit cells, one CTA.
 */

export const EMAIL_FROM = "Temba <support@tembas.com>";

const INK = "#14172A";
const MUTE = "#6B7288";
const BRAND = "#3D3FE2";
const ACCENT = "#C68A1F";
const CREAM = "#FAF7F2";
const PAPER = "#FFFFFF";
const LINE = "#E6E1D8";
const FONT = "Inter,Helvetica,Arial,sans-serif";
const MARK = "https://tembas.com/temba-mark-navy.jpg";
const ORANGE = "https://tembas.com/orange-money-seeklogo.png";
const MOOV = "https://tembas.com/moov-money-transparent.png";

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function logoBlock() {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" align="center">
      <tr>
        <td style="width:56px;height:56px;border-radius:14px;background:${CREAM};border:1px solid ${LINE};text-align:center;vertical-align:middle;">
          <img src="${MARK}" width="36" height="36" alt="Temba" style="display:block;margin:10px auto;border:0;width:36px;height:36px;border-radius:6px;" />
        </td>
      </tr>
    </table>`;
}

export function tembaEmailLayout(opts: {
  preheader?: string;
  bodyHtml: string;
}): string {
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(opts.preheader)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${CREAM};">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};">
  <tr>
    <td align="center" style="padding:32px 12px;">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
        <tr>
          <td style="background:${PAPER};border:1px solid ${LINE};border-radius:20px;padding:36px 32px 28px;box-shadow:0 18px 40px rgba(20,23,42,0.06);">
            ${opts.bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 8px 0;font-family:${FONT};text-align:center;">
            <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:${MUTE};">
              Temba · EZSTAY LLC · Ouagadougou<br>
              support@tembas.com · +226 74 75 08 15
            </p>
            <p style="margin:0;font-size:11px;color:${MUTE};">
              Message transactionnel. Vous le recevez parce qu’un compte ou un billet Temba est lié à cette adresse.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export function ctaButton(href: string, label: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="background:${BRAND};border-radius:12px;">
        <a href="${href}" style="display:block;padding:14px 20px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

function stepRow(index: string, title: string, detail: string) {
  return `<tr>
    <td width="44" valign="top" style="padding:10px 12px 10px 0;">
      <div style="width:36px;height:36px;border-radius:10px;background:${CREAM};border:1px solid ${LINE};text-align:center;line-height:36px;font-family:${FONT};font-size:12px;font-weight:700;color:${BRAND};">${index}</div>
    </td>
    <td valign="top" style="padding:10px 0;font-family:${FONT};">
      <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:${INK};">${title}</p>
      <p style="margin:0;font-size:13px;line-height:1.5;color:${MUTE};">${detail}</p>
    </td>
  </tr>`;
}

function paymentTrustRow() {
  return `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 8px;">
    <tr>
      <td style="padding:0 6px;"><img src="${ORANGE}" alt="Orange Money" width="28" height="28" style="display:block;border:0;width:28px;height:28px;border-radius:6px;" /></td>
      <td style="padding:0 6px;"><img src="${MOOV}" alt="Moov Money" width="36" height="22" style="display:block;border:0;height:22px;width:auto;" /></td>
      <td style="padding:0 6px;font-family:${FONT};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${MUTE};font-weight:700;">Visa · Mastercard</td>
    </tr>
  </table>`;
}

export function otpCellsHtml(code: string) {
  const digits = escapeHtml(code).replace(/\D/g, "").slice(0, 6).split("");
  while (digits.length < 6) digits.push("·");
  const cells = digits
    .map(
      (d) =>
        `<td align="center" style="width:42px;height:52px;border:1px solid ${LINE};border-radius:10px;background:${CREAM};font-family:${FONT};font-size:22px;font-weight:800;color:${INK};letter-spacing:0;">${d}</td>`,
    )
    .join(`<td width="8"></td>`);
  return `<table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>${cells}</tr></table>`;
}

export function welcomeEmailHtml(name: string) {
  const safe = escapeHtml(name);
  return tembaEmailLayout({
    preheader: "Votre compte Temba est prêt. Billets QR, paiement en FCFA.",
    bodyHtml: `
      ${logoBlock()}
      <p style="margin:20px 0 0;font-family:${FONT};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${ACCENT};font-weight:700;text-align:center;">Compte créé</p>
      <h1 style="margin:10px 0 8px;font-family:${FONT};font-size:26px;line-height:1.2;letter-spacing:-0.03em;font-weight:700;color:${INK};text-align:center;">Bonjour ${safe}</h1>
      <p style="margin:0 0 28px;font-family:${FONT};font-size:15px;line-height:1.6;color:${MUTE};text-align:center;">
        Votre espace Temba est prêt. Concerts, festivals et attractions au Burkina — billet QR, paiement Orange Money, Moov ou carte.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
        ${stepRow("01", "Payer comme ici", "Orange Money, Moov Money, ou carte. Montants en FCFA.")}
        ${stepRow("02", "Billet sur le téléphone", "QR à l’entrée. Transfert si vous ne pouvez plus y aller.")}
        ${stepRow("03", "Support à Ouagadougou", "support@tembas.com · +226 74 75 08 15")}
      </table>
      ${ctaButton("https://tembas.com/events", "Voir l’agenda")}
      <p style="margin:18px 0 0;font-family:${FONT};font-size:12px;line-height:1.5;color:${MUTE};text-align:center;">
        Vos billets : tembas.com/profile/my-tickets
      </p>
      <div style="height:1px;background:${LINE};margin:24px 0 16px;"></div>
      ${paymentTrustRow()}
      <p style="margin:0;font-family:${FONT};font-size:11px;color:${MUTE};text-align:center;">Paiement local · Support local · EZSTAY LLC</p>
    `,
  });
}

export function recoveryCodeEmailHtml(code: string) {
  return tembaEmailLayout({
    preheader: `Code ${code} pour retrouver vos billets Temba.`,
    bodyHtml: `
      ${logoBlock()}
      <p style="margin:20px 0 0;font-family:${FONT};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${ACCENT};font-weight:700;text-align:center;">Vérification</p>
      <h1 style="margin:10px 0 8px;font-family:${FONT};font-size:26px;line-height:1.2;letter-spacing:-0.03em;font-weight:700;color:${INK};text-align:center;">Votre code</h1>
      <p style="margin:0 0 24px;font-family:${FONT};font-size:15px;line-height:1.6;color:${MUTE};text-align:center;">
        Entrez ces 6 chiffres pour retrouver les billets achetés sans compte.
      </p>
      ${otpCellsHtml(code)}
      <p style="margin:20px 0 24px;font-family:${FONT};font-size:12px;color:${MUTE};text-align:center;">Valable 10 minutes</p>
      ${ctaButton("https://tembas.com/find-tickets", "Ouvrir mes billets")}
      <p style="margin:22px 0 0;font-family:${FONT};font-size:12px;line-height:1.55;color:${MUTE};text-align:center;">
        Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail. Personne chez Temba ne vous demandera ce code.
      </p>
    `,
  });
}

export async function sendResendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY missing");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const errorData = await res.text();
    throw new Error(`Resend ${res.status}: ${errorData}`);
  }
}
