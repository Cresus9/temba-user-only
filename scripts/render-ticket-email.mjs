import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import puppeteer from "/tmp/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js";

execSync(
  "npx --yes esbuild supabase/functions/_shared/email.ts --bundle --platform=node --format=esm --outfile=/tmp/ticket-email-bundle.mjs",
  { stdio: "inherit", cwd: "/workspace" },
);

const { ticketEmailHtml } = await import("/tmp/ticket-email-bundle.mjs");
const require = createRequire(import.meta.url);
const QRCode = require("/tmp/node_modules/qrcode/lib/index.js");

async function qr(value) {
  const buf = await QRCode.toBuffer(value, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 360,
    color: { dark: "#03061E", light: "#FFFFFF" },
  });
  return `data:image/png;base64,${buf.toString("base64")}`;
}

const tickets = [
  { id: "1", name: "VIP", price: 5000, code: "Temba:EXEMPLE-NE-PAS-SCANNER-0001" },
  { id: "2", name: "Standard", price: 3000, code: "Temba:EXEMPLE-NE-PAS-SCANNER-0002" },
  { id: "3", name: "Standard", price: 3000, code: "Temba:EXEMPLE-NE-PAS-SCANNER-0003" },
];

const html = ticketEmailHtml({
  buyerName: "Awa Ouédraogo",
  eventTitle: "MALAKEY EN CONCERT",
  whenLong: "Vendredi 18 décembre 2026 · 19:00",
  whenShort: "Ven. 18 déc. 2026 · 19:00",
  dateLabel: "Ven. 18 déc. 2026",
  timeLabel: "19:00",
  subjectDate: "ven. 18 déc.",
  timezoneLabel: "Heure de Ouagadougou",
  venueLine: "Maison de la Culture · Bobo-Dioulasso",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Maison+de+la+Culture+Bobo-Dioulasso",
  posterUrl: "file:///tmp/v6email/v6-email/img/poster-malakey-240.jpg",
  tickets: await Promise.all(tickets.map(async (ticket, index) => ({
    id: ticket.id,
    name: ticket.name,
    price: ticket.price,
    number: `0000000${index + 1}`.slice(-8),
    qrSrc: await qr(`00000000-0000-4000-8000-00000000000${index + 1}`),
    qrAlt: `QR code du billet ${index + 1} sur 3 (${ticket.name}) pour MALAKEY EN CONCERT`,
  }))),
  lines: [
    { label: "2 × Standard", amount: 6000 },
    { label: "1 × VIP", amount: 5000 },
  ],
  total: 11000,
  orderRef: "9C14BCC9",
  paymentRef: "4F2A91D0",
  paidBy: "Mobile Money · +226 70 •• •• 56",
  paidAt: "14 nov. 2026 à 11:42 (Ouagadougou)",
  ticketsUrl: "https://tembas.com/find-tickets",
  guestHint: true,
  hidePayment: false,
});
async function dataUri(path) {
  const bytes = await readFile(path);
  return `data:image/png;base64,${bytes.toString("base64")}`;
}
const withAssets = html
  .replaceAll("https://tembas.com/email/temba-logo-white-noR.png", await dataUri("/workspace/public/email/temba-logo-white-noR.png"))
  .replaceAll("https://tembas.com/email/tk-dome-170x300.png", await dataUri("/workspace/public/email/tk-dome-170x300.png"))
  .replaceAll("https://tembas.com/email/tk-dome-536x190.png", await dataUri("/workspace/public/email/tk-dome-536x190.png"))
  .replaceAll("https://tembas.com/email/symbol-purple.png", await dataUri("/workspace/public/email/symbol-purple.png"));
const out = "/opt/cursor/artifacts/redesign/v6-email";
await mkdir(out, { recursive: true });
await writeFile(`${out}/ticket-email.html`, withAssets);

const browser = await puppeteer.launch({
  executablePath: "/usr/local/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--allow-file-access-from-files"],
});
for (const [width, file] of [[780, "ticket-email-600.png"], [375, "ticket-email-375.png"]]) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900, deviceScaleFactor: 2 });
  await page.goto(`file://${out}/ticket-email.html`, { waitUntil: "networkidle0" });
  await page.screenshot({ path: `${out}/${file}`, fullPage: true });
  await page.close();
  console.log("wrote", width);
}
await browser.close();
