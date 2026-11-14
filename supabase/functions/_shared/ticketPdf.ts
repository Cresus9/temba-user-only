/**
 * A6 portrait ticket PDF, one page per ticket.
 * Fonts are subset at embed time. QR modules encode tickets.id.
 */
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "npm:pdf-lib@1.17.1";
import fontkit from "npm:@pdf-lib/fontkit@1.1.1";
import QRCode from "npm:qrcode@1.5.4";

const MM = 2.83465;
const PAGE_W = 105 * MM;
const PAGE_H = 148 * MM;

export interface PdfTicket {
  id: string;
  name: string;
  price: number;
  index: number;
  total: number;
}

export interface PdfTicketInput {
  eventTitle: string;
  dateLabel: string;
  timeLabel: string;
  venueLine: string;
  buyerName?: string | null;
  orderRef: string;
  tickets: PdfTicket[];
}

export interface PdfAssets {
  inter: Uint8Array;
  interSemi: Uint8Array;
  interBold: Uint8Array;
  tightBold: Uint8Array;
  mono: Uint8Array;
  logo: Uint8Array;
  dome: Uint8Array;
  symbol: Uint8Array;
}

function fcfa(amount: number) {
  const n = Math.round(Number(amount) || 0);
  const formatted = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 })
    .format(n)
    .replace(/[\u00a0\u202f]/g, "\u202f");
  return `${formatted}\u00a0FCFA`;
}

function wrap(text: string, font: PDFFont, size: number, max: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > max && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

export async function qrPng(value: string): Promise<Uint8Array> {
  const buf = await QRCode.toBuffer(value, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 400,
    color: { dark: "#03061E", light: "#FFFFFF" },
  });
  return buf instanceof Uint8Array ? buf : new Uint8Array(buf);
}

function drawQr(page: PDFPage, value: string, x: number, y: number, size: number) {
  const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const cell = size / n;
  const ink = rgb(0.012, 0.024, 0.118);
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (!qr.modules.get(row, col)) continue;
      page.drawRectangle({
        x: x + col * cell,
        y: y + (n - 1 - row) * cell,
        width: cell + 0.2,
        height: cell + 0.2,
        color: ink,
      });
    }
  }
}

export async function buildTicketPdf(input: PdfTicketInput, assets: PdfAssets): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regular = await pdf.embedFont(assets.inter, { subset: true });
  const semi = await pdf.embedFont(assets.interSemi, { subset: true });
  const bold = await pdf.embedFont(assets.interBold, { subset: true });
  const tight = await pdf.embedFont(assets.tightBold, { subset: true });
  const mono = await pdf.embedFont(assets.mono, { subset: true });
  const logo = await pdf.embedPng(assets.logo);
  const dome = await pdf.embedPng(assets.dome);
  const symbol = await pdf.embedPng(assets.symbol);
  const blue = rgb(0.239, 0.247, 0.886);
  const gold = rgb(0.965, 0.722, 0.29);
  const ink = rgb(0.012, 0.024, 0.118);
  const mute = rgb(0.369, 0.384, 0.471);
  const white = rgb(1, 1, 1);

  for (const ticket of input.tickets) {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    const left = 5 * MM;
    const cardTop = PAGE_H - 5 * MM;
    const cardH = 131.5 * MM;
    const cardW = 95 * MM;
    const headH = 40 * MM;
    page.drawRectangle({ x: left, y: cardTop - cardH, width: cardW, height: cardH, borderColor: rgb(0.9, 0.905, 0.933), borderWidth: 0.6, color: white });
    page.drawRectangle({ x: left, y: cardTop - headH, width: cardW, height: headH, color: blue });
    const domeW = cardW;
    const domeH = Math.min(headH, domeW * (dome.height / dome.width));
    page.drawImage(dome, { x: left, y: cardTop - headH, width: domeW, height: domeH });
    page.drawImage(logo, { x: left + 5 * MM, y: cardTop - 9 * MM, width: 22 * MM, height: 5 * MM });
    const vip = ticket.name.trim().toLowerCase() === "vip";
    if (vip) {
      const vipLabel = "VIP";
      const vipSize = 16;
      page.drawText(vipLabel, {
        x: left + cardW - 5 * MM - tight.widthOfTextAtSize(vipLabel, vipSize),
        y: cardTop - 10 * MM,
        size: vipSize,
        font: tight,
        color: gold,
      });
    } else {
      const tag = ticket.name.trim().toUpperCase().slice(0, 18);
      const tagSize = 7;
      const tagW = bold.widthOfTextAtSize(tag, tagSize);
      const padX = 1.6 * MM;
      const boxW = tagW + padX * 2;
      const boxH = 4.6 * MM;
      const boxX = left + cardW - 5 * MM - boxW;
      const boxY = cardTop - 10.2 * MM;
      page.drawRectangle({
        x: boxX,
        y: boxY,
        width: boxW,
        height: boxH,
        borderColor: rgb(0.773, 0.776, 0.969),
        borderWidth: 0.9,
        color: blue,
      });
      page.drawText(tag, { x: boxX + padX, y: boxY + 1.4 * MM, size: tagSize, font: bold, color: white });
    }
    const titleLines = wrap(input.eventTitle, tight, 12, 70 * MM);
    titleLines.forEach((line, i) => {
      page.drawText(line, { x: left + 5 * MM, y: cardTop - 24 * MM - i * 14, size: 12, font: tight, color: white });
    });
    page.drawText("DATE", { x: left + 5 * MM, y: cardTop - 34 * MM, size: 6, font: semi, color: rgb(0.85, 0.855, 0.984) });
    page.drawText(input.dateLabel, { x: left + 5 * MM, y: cardTop - 37.5 * MM, size: 9, font: semi, color: white });
    page.drawText("HEURE", { x: left + 48 * MM, y: cardTop - 34 * MM, size: 6, font: semi, color: rgb(0.85, 0.855, 0.984) });
    page.drawText(input.timeLabel || "—", { x: left + 48 * MM, y: cardTop - 37.5 * MM, size: 9, font: semi, color: white });
    if (vip) page.drawRectangle({ x: left, y: cardTop - headH - 0.9 * MM, width: cardW, height: 0.9 * MM, color: gold });

    let cursor = cardTop - headH - 8 * MM;
    const label = (text: string, x: number, y: number) => page.drawText(text, { x, y, size: 6.2, font: semi, color: mute });
    const value = (text: string, x: number, y: number, font: PDFFont = semi) => page.drawText(text, { x, y, size: 9.5, font, color: ink });
    if (input.buyerName) {
      label("DÉTENTEUR", left + 5 * MM, cursor);
      value(input.buyerName, left + 5 * MM, cursor - 12);
      cursor -= 8 * MM;
    }
    label("CATÉGORIE", left + 5 * MM, cursor);
    value(ticket.name.trim(), left + 5 * MM, cursor - 12);
    label("PRIX", left + 50 * MM, cursor);
    page.drawText(fcfa(ticket.price), { x: left + 50 * MM, y: cursor - 12, size: 9.5, font: bold, color: ink });
    cursor -= 8 * MM;
    label("LIEU", left + 5 * MM, cursor);
    value(input.venueLine, left + 5 * MM, cursor - 12);
    cursor -= 8 * MM;
    label("BILLET", left + 5 * MM, cursor);
    value(`${ticket.index}/${ticket.total}`, left + 5 * MM, cursor - 12, mono);
    label("COMMANDE", left + 50 * MM, cursor);
    value(input.orderRef, left + 50 * MM, cursor - 12, mono);

    const perfY = cursor - 8 * MM;
    for (let x = left + 4 * MM; x < left + cardW - 4 * MM; x += 4) {
      page.drawRectangle({ x, y: perfY, width: 2, height: 0.6, color: rgb(0.83, 0.84, 0.89) });
    }
    const qrSize = 37 * MM;
    const qrX = left + (cardW - qrSize) / 2;
    const qrY = 18 * MM;
    drawQr(page, ticket.id, qrX, qrY, qrSize);
    const num = ticket.id.replace(/-/g, "").slice(0, 8).toUpperCase();
    const caption = `Billet ${num}`;
    page.drawText(caption, {
      x: left + (cardW - mono.widthOfTextAtSize(caption, 8)) / 2,
      y: qrY - 5 * MM,
      size: 8,
      font: mono,
      color: ink,
    });
    const foot = "Billet nominatif · 1 QR = 1 entrée · tembas.com · +226 74 75 08 15";
    page.drawImage(symbol, { x: left + 8 * MM, y: 6 * MM, width: 2.4 * MM, height: 2.4 * MM });
    page.drawText(foot, { x: left + 12 * MM, y: 6.4 * MM, size: 5.8, font: regular, color: mute });
  }
  return pdf.save();
}
