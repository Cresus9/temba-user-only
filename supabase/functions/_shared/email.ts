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

export const TICKET_EMAIL_LOGO = "https://tembas.com/email/temba-logo-white-noR.png";

export interface TicketEmailTicket {
  id: string;
  name: string;
  price: number;
  qrSrc: string;
  qrAlt: string;
}

export interface TicketEmailLine {
  label: string;
  amount: number;
}

export interface TicketEmailInput {
  buyerName?: string | null;
  eventTitle: string;
  whenLong: string;
  whenShort: string;
  subjectDate: string;
  timezoneLabel: string;
  venueLine: string;
  mapsUrl: string;
  posterUrl?: string | null;
  tickets: TicketEmailTicket[];
  lines: TicketEmailLine[];
  total: number;
  orderRef: string;
  paymentRef?: string | null;
  paidBy?: string | null;
  paidAt?: string | null;
  ticketsUrl: string;
  guestHint: boolean;
  hidePayment: boolean;
}

function fcfa(amount: number) {
  const n = Math.round(Number(amount) || 0);
  const formatted = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 })
    .format(n)
    .replace(/[\u00a0\u202f]/g, "\u202f");
  return `${formatted}\u00a0FCFA`;
}

function row(label: string, value: string) {
  return `<tr><td style="padding:0 0 10px;font:500 11px/1.3 'Inter',Helvetica,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#6B6F86;">${label}</td></tr><tr><td class="ink" style="padding:0 0 14px;font:600 15px/1.35 'Inter',Helvetica,Arial,sans-serif;color:#03061E;">${value}</td></tr>`;
}

function ticketBlock(input: TicketEmailInput, ticket: TicketEmailTicket, index: number) {
  const vip = ticket.name.trim().toLowerCase() === "vip";
  const tag = vip
    ? `background:#F6B84A;color:#03061E;`
    : `background:#ECECFD;color:#3D3FE2;`;
  const holder = (input.buyerName || "").trim();
  return `<tr><td style="padding:0 32px 16px;" class="px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card" style="border:1px solid #E4E6F0;border-radius:14px;border-collapse:separate;background:#FFFFFF;">
    <tr><td colspan="2" bgcolor="#3D3FE2" style="background:#3D3FE2;padding:13px 20px 13px 22px;border-radius:13px 13px 0 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="left" style="font:800 14px/1.3 'Inter Tight','Inter',Helvetica,Arial,sans-serif;color:#FFFFFF;">${escapeHtml(input.eventTitle)}<br><span style="font:600 12.5px/1.5 'Inter',Helvetica,Arial,sans-serif;color:#D9DAFB;">${escapeHtml(input.whenShort)}</span></td>
        <td align="right" valign="middle" width="110"><span style="display:inline-block;${tag}font:800 11px/1 'Inter',Helvetica,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;padding:6px 9px;border-radius:6px;">${escapeHtml(ticket.name.trim())}</span></td>
      </tr></table>
    </td></tr>
    <tr>
      <td class="stack" width="326" valign="top" style="padding:18px 20px 4px 22px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${holder ? row("Détenteur", escapeHtml(holder)) : ""}
          ${row("Catégorie", `${escapeHtml(ticket.name.trim())} · <span style="white-space:nowrap">${fcfa(ticket.price)}</span>`)}
          ${row("Lieu", escapeHtml(input.venueLine))}
          ${row("Billet · Commande", `${index + 1}/${input.tickets.length} · ${escapeHtml(input.orderRef)}`)}
        </table>
      </td>
      <td class="stack qrcell" width="210" valign="middle" align="center" style="padding:18px 18px 16px;border-left:1px dashed #E4E6F0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
          <td bgcolor="#FFFFFF" style="background:#FFFFFF;padding:8px;border-radius:10px;border:1px solid #E4E6F0;">
            <img src="${ticket.qrSrc}" width="160" height="160" alt="${escapeHtml(ticket.qrAlt)}" class="qr" style="display:block;width:160px;height:160px;border:0;">
          </td></tr></table>
        <p style="margin:10px 0 0;font:600 12px/1.4 'Inter',Helvetica,Arial,sans-serif;color:#6B6F86;text-align:center;">1 QR = 1 entrée</p>
      </td>
    </tr>
  </table>
</td></tr>`;
}

export function ticketEmailSubject(input: Pick<TicketEmailInput, "eventTitle" | "subjectDate">) {
  return `Vos billets · ${input.eventTitle} · ${input.subjectDate}`;
}

export function ticketEmailHtml(input: TicketEmailInput): string {
  const count = input.tickets.length;
  const first = (input.buyerName || "").trim().split(/\s+/)[0] || "";
  const greeting = first ? `Vos billets sont prêts, ${escapeHtml(first)}.` : "Vos billets sont prêts.";
  const poster = input.posterUrl
    ? `<img src="${escapeHtml(input.posterUrl)}" width="120" height="150" alt="Affiche de ${escapeHtml(input.eventTitle)}" class="poster" style="display:block;width:120px;height:150px;border-radius:10px;border:0;background:#F5F6FB;">`
    : "";
  const lines = input.lines.map((line) =>
    `<tr><td class="ink" style="padding:8px 0;font:500 14px/1.4 'Inter',Helvetica,Arial,sans-serif;color:#03061E;">${escapeHtml(line.label)}</td><td class="ink" align="right" style="padding:8px 0;font:600 14px/1.4 'Inter',Helvetica,Arial,sans-serif;color:#03061E;white-space:nowrap;">${fcfa(line.amount)}</td></tr>`,
  ).join("");
  const payRows = input.hidePayment ? "" : `
    <tr><td class="mute" style="padding:6px 0;font:500 13px/1.4 'Inter',Helvetica,Arial,sans-serif;color:#6B6F86;">Payé par</td><td class="ink" align="right" style="padding:6px 0;font:600 13px/1.4 'Inter',Helvetica,Arial,sans-serif;color:#03061E;">${escapeHtml(input.paidBy || "")}</td></tr>
    ${input.paidAt ? `<tr><td class="mute" style="padding:6px 0;font:500 13px/1.4 'Inter',Helvetica,Arial,sans-serif;color:#6B6F86;">Le</td><td class="ink" align="right" style="padding:6px 0;font:600 13px/1.4 'Inter',Helvetica,Arial,sans-serif;color:#03061E;">${escapeHtml(input.paidAt)}</td></tr>` : ""}
    ${input.paymentRef ? `<tr><td class="mute" style="padding:6px 0;font:500 13px/1.4 'Inter',Helvetica,Arial,sans-serif;color:#6B6F86;">Réf. paiement</td><td class="ink" align="right" style="padding:6px 0;font:600 13px/1.4 'JetBrains Mono',Menlo,Consolas,monospace;color:#03061E;">${escapeHtml(input.paymentRef)}</td></tr>` : ""}`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(ticketEmailSubject(input))}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Inter+Tight:wght@700;800&family=JetBrains+Mono:wght@600&display=swap" rel="stylesheet">
<style>
body{margin:0!important;padding:0!important;width:100%!important;}
table{border-collapse:collapse;}
@media only screen and (max-width:620px){
  .wrap{width:100%!important;}
  .px{padding-left:18px!important;padding-right:18px!important;}
  .hero{padding:24px 20px 26px!important;}
  .h1{font-size:25px!important;}
  .stack{display:block!important;width:100%!important;}
  .qrcell{border-left:0!important;border-top:1px dashed #E4E6F0!important;}
  .qr{width:200px!important;height:200px!important;}
  .poster{width:96px!important;height:120px!important;}
}
@media (prefers-color-scheme:dark){
  .page{background:#0B0D1C!important;}
  .panel{background:#14172B!important;}
  .card{background:#14172B!important;}
  .ink{color:#F2F3F8!important;}
  .mute{color:#9A9DB4!important;}
}
[data-ogsc] .ink{color:#F2F3F8!important;}
[data-ogsc] .mute{color:#9A9DB4!important;}
</style>
</head>
<body class="page" style="margin:0;padding:0;background:#EEF0F6;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(`${count} ${count > 1 ? "billets" : "billet"} pour ${input.eventTitle} · ${input.whenShort}. Un QR par personne à l’entrée.`)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="page" bgcolor="#EEF0F6" style="background:#EEF0F6;">
<tr><td align="center" style="padding:20px 10px 32px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="wrap panel" bgcolor="#FFFFFF" style="width:600px;max-width:600px;background:#FFFFFF;border-radius:16px;">
<tr><td class="hero" bgcolor="#3D3FE2" style="background:#3D3FE2;padding:28px 32px 30px;">
  <img src="${TICKET_EMAIL_LOGO}" width="105" height="24" alt="Temba" style="display:block;width:105px;height:24px;border:0;">
  <p style="margin:26px 0 0;font:700 12px/1.3 'Inter',Helvetica,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#D9DAFB;">Paiement confirmé${input.paidBy && !input.hidePayment ? ` · ${escapeHtml(input.paidBy.split("·")[0].trim())}` : ""}</p>
  <h1 class="h1" style="margin:8px 0 0;font:800 30px/1.15 'Inter Tight','Inter',Helvetica,Arial,sans-serif;color:#FFFFFF;">${greeting}</h1>
  <p style="margin:10px 0 0;font:500 15px/1.55 'Inter',Helvetica,Arial,sans-serif;color:#E4E5FC;">${count} ${count > 1 ? "billets" : "billet"} pour ${escapeHtml(input.eventTitle)}. Un QR par personne, à présenter à l’entrée.</p>
</td></tr>
<tr><td class="px" style="padding:26px 32px 8px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="120" valign="top" style="width:120px;">${poster}</td>
    <td width="18"></td>
    <td valign="top">
      <p style="margin:2px 0 0;font:700 13.5px/1.4 'Inter',Helvetica,Arial,sans-serif;color:#3D3FE2;">${escapeHtml(input.whenLong)}</p>
      <p class="ink" style="margin:6px 0 0;font:800 21px/1.2 'Inter Tight','Inter',Helvetica,Arial,sans-serif;color:#03061E;">${escapeHtml(input.eventTitle)}</p>
      <p style="margin:6px 0 0;font:500 13px/1.5 'Inter',Helvetica,Arial,sans-serif;color:#6B6F86;">${escapeHtml(input.timezoneLabel)}</p>
      <p class="ink" style="margin:12px 0 0;font:500 14px/1.5 'Inter',Helvetica,Arial,sans-serif;color:#3A3D55;">${escapeHtml(input.venueLine)}<br><a href="${escapeHtml(input.mapsUrl)}" style="color:#3D3FE2;font-weight:600;text-decoration:none;">Itinéraire →</a></p>
    </td>
  </tr></table>
</td></tr>
<tr><td class="px" style="padding:18px 32px 6px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td align="center" bgcolor="#3D3FE2" style="background:#3D3FE2;border-radius:10px;">
      <a href="${escapeHtml(input.ticketsUrl)}" style="display:block;padding:14px 18px;font:700 15px/1.2 'Inter',Helvetica,Arial,sans-serif;color:#FFFFFF;text-decoration:none;">Voir mes billets sur tembas.com</a>
    </td>
  </tr></table>
  ${input.guestHint ? `<p style="margin:10px 0 0;font:500 12.5px/1.5 'Inter',Helvetica,Arial,sans-serif;color:#6B6F86;text-align:center;">Sans compte ? Entrez le numéro ou l’e-mail de la commande sur tembas.com/find-tickets.</p>` : ""}
</td></tr>
<tr><td class="px" style="padding:26px 32px 12px;">
  <p class="ink" style="margin:0;font:800 18px/1.3 'Inter Tight','Inter',Helvetica,Arial,sans-serif;color:#03061E;">Vos ${count} ${count > 1 ? "billets" : "billet"}</p>
  <p style="margin:4px 0 0;font:500 13.5px/1.5 'Inter',Helvetica,Arial,sans-serif;color:#6B6F86;">Gardez cet e-mail : vos billets sont aussi sur tembas.com et dans l’appli Temba.</p>
</td></tr>
${input.tickets.map((ticket, index) => ticketBlock(input, ticket, index)).join("")}
<tr><td class="px" style="padding:10px 32px 8px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F5F6FB" style="background:#F5F6FB;border-radius:12px;">
    <tr><td style="padding:18px 20px 8px;">
      <p class="ink" style="margin:0 0 12px;font:700 15px/1.3 'Inter',Helvetica,Arial,sans-serif;color:#03061E;">Le jour J</p>
      <p class="ink" style="margin:0 0 10px;font:500 14px/1.5 'Inter',Helvetica,Arial,sans-serif;color:#3A3D55;">1. Arrivez 30 minutes avant le début.</p>
      <p class="ink" style="margin:0 0 10px;font:500 14px/1.5 'Inter',Helvetica,Arial,sans-serif;color:#3A3D55;">2. Montez la luminosité de l’écran au moment du scan.</p>
      <p class="ink" style="margin:0 0 10px;font:500 14px/1.5 'Inter',Helvetica,Arial,sans-serif;color:#3A3D55;">3. Vous venez à plusieurs ? Chaque personne présente son propre QR.</p>
    </td></tr>
  </table>
</td></tr>
<tr><td class="px" style="padding:22px 32px 6px;">
  <p class="ink" style="margin:0 0 6px;font:800 18px/1.3 'Inter Tight','Inter',Helvetica,Arial,sans-serif;color:#03061E;">Récapitulatif</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    ${lines}
    <tr><td class="ink" style="padding:12px 0 10px;border-top:1px solid #E4E6F0;font:700 15px/1.3 'Inter',Helvetica,Arial,sans-serif;color:#03061E;">Total payé</td>
        <td class="ink" align="right" style="padding:12px 0 10px;border-top:1px solid #E4E6F0;font:800 18px/1.3 'Inter Tight','Inter',Helvetica,Arial,sans-serif;color:#03061E;">${fcfa(input.total)}</td></tr>
  </table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #E4E6F0;">
    ${payRows}
    <tr><td style="padding:6px 0;font:500 13px/1.4 'Inter',Helvetica,Arial,sans-serif;color:#6B6F86;">Commande</td><td align="right" style="padding:6px 0;font:600 13px/1.4 'JetBrains Mono',Menlo,Consolas,monospace;color:#03061E;">${escapeHtml(input.orderRef)}</td></tr>
  </table>
</td></tr>
<tr><td class="px" style="padding:24px 32px 8px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#03061E" style="background:#03061E;border-radius:14px;">
    <tr><td style="padding:22px;">
      <p style="margin:0;font:700 11px/1.3 'Inter',Helvetica,Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#F6B84A;">L’appli Temba</p>
      <p style="margin:8px 0 0;font:800 19px/1.25 'Inter Tight','Inter',Helvetica,Arial,sans-serif;color:#FFFFFF;">Vos billets dans la poche</p>
      <p style="margin:8px 0 16px;font:500 14px/1.5 'Inter',Helvetica,Arial,sans-serif;color:#C9CBDA;">Connectez-vous avec le numéro ou l’e-mail de cette commande pour retrouver vos billets dans l’appli, sur Android et iPhone.</p>
      <a href="https://apps.apple.com/us/app/temba/id6748848506" style="display:inline-block;margin:0 8px 8px 0;padding:9px 16px;background:#FFFFFF;border-radius:10px;text-decoration:none;color:#03061E;font:700 15px/1.25 'Inter',Helvetica,Arial,sans-serif;">App Store</a>
      <a href="https://play.google.com/store/apps/details?id=app.rork.temba" style="display:inline-block;margin:0 0 8px;padding:9px 16px;background:#FFFFFF;border-radius:10px;text-decoration:none;color:#03061E;font:700 15px/1.25 'Inter',Helvetica,Arial,sans-serif;">Google Play</a>
    </td></tr>
  </table>
</td></tr>
<tr><td class="px" style="padding:20px 32px 28px;">
  <p class="ink" style="margin:0;font:700 15px/1.3 'Inter',Helvetica,Arial,sans-serif;color:#03061E;">Une question sur votre commande ?</p>
  <p style="margin:6px 0 0;font:500 14px/1.55 'Inter',Helvetica,Arial,sans-serif;color:#3A3D55;">Écrivez-nous sur WhatsApp au <a href="https://wa.me/22674750815" style="color:#3D3FE2;font-weight:700;text-decoration:none;">+226 74 75 08 15</a>, 7j/7, ou à <a href="mailto:support@tembas.com" style="color:#3D3FE2;font-weight:700;text-decoration:none;">support@tembas.com</a>. Donnez le numéro de commande <span style="font-family:Menlo,Consolas,monospace;font-weight:600;">${escapeHtml(input.orderRef)}</span>.</p>
</td></tr>
</table>
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="wrap" style="width:600px;max-width:600px;">
<tr><td style="padding:22px 32px 0;text-align:center;font-family:${FONT};">
  <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#6B6F86;">
    Temba · EZSTAY LLC · Ouagadougou<br>
    support@tembas.com · +226 74 75 08 15
  </p>
  <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#6B6F86;">
    <a href="https://tembas.com" style="color:#6B6F86;text-decoration:underline;">tembas.com</a> ·
    <a href="https://tembas.com/terms" style="color:#6B6F86;text-decoration:underline;">Conditions</a> ·
    <a href="https://tembas.com/privacy" style="color:#6B6F86;text-decoration:underline;">Confidentialité</a>
  </p>
  <p style="margin:0;font-size:11px;color:#6B6F86;">
    Message transactionnel. Vous le recevez parce qu’un compte ou un billet Temba est lié à cette adresse.
  </p>
</td></tr></table>
</td></tr></table>
</body>
</html>`;
}

export interface ResendAttachment {
  filename: string;
  content: string;
  content_id: string;
}

export async function sendResendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  attachments?: ResendAttachment[];
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
      ...(opts.attachments?.length
        ? {
            attachments: opts.attachments.map((file) => ({
              filename: file.filename,
              content: file.content,
              content_id: file.content_id,
            })),
          }
        : {}),
    }),
  });

  if (!res.ok) {
    const errorData = await res.text();
    throw new Error(`Resend ${res.status}: ${errorData}`);
  }
}
