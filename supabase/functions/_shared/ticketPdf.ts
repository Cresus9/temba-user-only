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

/** dome-tk.svg, viewBox 0 0 390 360. Squares are [x, y, size] in that box. */
const DOME_VB_W = 390;
const DOME_VB_H = 360;
const DOME_SQUARES: Array<[number, number, number]> = [
  [196.6,100.6,2.9], [172.6,172.6,2.9], [244.6,172.6,2.9], [268.6,172.6,2.9], [100.6,196.6,2.9], [148.6,196.6,2.9],
  [171.3,195.3,5.4], [195.3,195.3,5.4], [220.6,196.6,2.9], [243.3,195.3,5.4], [268.6,196.6,2.9], [135.3,207.3,5.4],
  [157.7,205.7,8.6], [171.6,207.6,4.8], [180.8,204.8,10.3], [192.8,204.8,10.3], [205.7,205.7,8.6], [229.7,205.7,8.6],
  [243.6,207.6,4.8], [255.3,207.3,5.4], [76.6,220.6,2.9], [99.3,219.3,5.4], [121.7,217.7,8.6], [134.4,218.4,7.2],
  [144.8,216.8,10.3], [156.8,216.8,10.3], [168.8,216.8,10.3], [180.8,216.8,10.3], [192.8,216.8,10.3], [204.8,216.8,10.3],
  [216.8,216.8,10.3], [228.8,216.8,10.3], [240.8,216.8,10.3], [254.4,218.4,7.2], [267.3,219.3,5.4], [292.6,220.6,2.9],
  [316.6,220.6,2.9], [87.3,231.3,5.4], [108.8,228.8,10.3], [120.8,228.8,10.3], [132.8,228.8,10.3], [144.8,228.8,10.3],
  [156.8,228.8,10.3], [181.7,229.7,8.6], [205.7,229.7,8.6], [219.6,231.6,4.8], [228.8,228.8,10.3], [240.8,228.8,10.3],
  [252.8,228.8,10.3], [264.8,228.8,10.3], [276.8,228.8,10.3], [303.3,231.3,5.4], [75.3,243.3,5.4], [84.8,240.8,10.3],
  [96.8,240.8,10.3], [108.8,240.8,10.3], [120.8,240.8,10.3], [145.7,241.7,8.6], [169.7,241.7,8.6], [195.3,243.3,5.4],
  [243.3,243.3,5.4], [255.6,243.6,4.8], [264.8,240.8,10.3], [276.8,240.8,10.3], [288.8,240.8,10.3], [303.6,243.6,4.8],
  [315.3,243.3,5.4], [340.6,244.6,2.9], [63.3,255.3,5.4], [72.8,252.8,10.3], [84.8,252.8,10.3], [96.8,252.8,10.3],
  [111.3,255.3,5.4], [133.7,253.7,8.6], [159.3,255.3,5.4], [183.3,255.3,5.4], [231.3,255.3,5.4], [255.3,255.3,5.4],
  [276.8,252.8,10.3], [288.8,252.8,10.3], [300.8,252.8,10.3], [315.6,255.6,4.8], [327.3,255.3,5.4], [51.3,267.3,5.4],
  [62.4,266.4,7.2], [72.8,264.8,10.3], [84.8,264.8,10.3], [99.3,267.3,5.4], [147.3,267.3,5.4], [171.3,267.3,5.4],
  [195.3,267.3,5.4], [219.3,267.3,5.4], [243.3,267.3,5.4], [289.7,265.7,8.6], [300.8,264.8,10.3], [312.8,264.8,10.3],
  [339.3,267.3,5.4], [51.6,279.6,4.8], [60.8,276.8,10.3], [72.8,276.8,10.3], [87.3,279.3,5.4], [111.3,279.3,5.4],
  [135.3,279.3,5.4], [207.3,279.3,5.4], [231.3,279.3,5.4], [255.3,279.3,5.4], [279.3,279.3,5.4], [301.7,277.7,8.6],
  [312.8,276.8,10.3], [324.8,276.8,10.3], [4.6,292.6,2.9], [27.3,291.3,5.4], [48.8,288.8,10.3], [60.8,288.8,10.3],
  [73.7,289.7,8.6], [99.3,291.3,5.4], [123.3,291.3,5.4], [148.6,292.6,2.9], [171.3,291.3,5.4], [196.6,292.6,2.9],
  [219.3,291.3,5.4], [244.6,292.6,2.9], [267.3,291.3,5.4], [291.3,291.3,5.4], [312.8,288.8,10.3], [324.8,288.8,10.3],
  [336.8,288.8,10.3], [364.6,292.6,2.9], [36.8,300.8,10.3], [48.8,300.8,10.3], [61.7,301.7,8.6], [87.3,303.3,5.4],
  [111.3,303.3,5.4], [207.3,303.3,5.4], [279.3,303.3,5.4], [303.3,303.3,5.4], [315.6,303.6,4.8], [324.8,300.8,10.3],
  [336.8,300.8,10.3], [351.3,303.3,5.4], [4.6,316.6,2.9], [27.3,315.3,5.4], [36.8,312.8,10.3], [48.8,312.8,10.3],
  [75.3,315.3,5.4], [99.3,315.3,5.4], [124.6,316.6,2.9], [148.6,316.6,2.9], [196.6,316.6,2.9], [220.6,316.6,2.9],
  [243.3,315.3,5.4], [268.6,316.6,2.9], [313.7,313.7,8.6], [336.8,312.8,10.3], [350.4,314.4,7.2], [361.7,313.7,8.6],
  [388.6,316.6,2.9], [27.6,327.6,4.8], [36.8,324.8,10.3], [50.4,326.4,7.2], [63.3,327.3,5.4], [255.3,327.3,5.4],
  [303.3,327.3,5.4], [325.7,325.7,8.6], [336.8,324.8,10.3], [348.8,324.8,10.3], [24.8,336.8,10.3], [36.8,336.8,10.3],
  [51.3,339.3,5.4], [75.3,339.3,5.4], [99.3,339.3,5.4], [124.6,340.6,2.9], [148.6,340.6,2.9], [196.6,340.6,2.9],
  [220.6,340.6,2.9], [244.6,340.6,2.9], [315.3,339.3,5.4], [336.8,336.8,10.3], [348.8,336.8,10.3], [363.3,339.3,5.4],
  [388.6,340.6,2.9], [15.3,351.3,5.4], [24.8,348.8,10.3], [36.8,348.8,10.3], [51.6,351.6,4.8], [63.3,351.3,5.4],
  [87.3,351.3,5.4], [279.3,351.3,5.4], [303.3,351.3,5.4], [327.3,351.3,5.4], [348.8,348.8,10.3], [363.6,351.6,4.8],
  [375.3,351.3,5.4],
];

/** Square pixels from dome-tk.svg, xMidYMax slice, clipped to the blue head. */
function drawDome(page: PDFPage, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / DOME_VB_W, h / DOME_VB_H);
  const originX = x + (w - DOME_VB_W * scale) / 2;
  const right = x + w;
  const top = y + h;
  const ink = rgb(47 / 255, 48 / 255, 149 / 255);
  for (const [rx, ry, size] of DOME_SQUARES) {
    let px = originX + rx * scale;
    let py = y + (DOME_VB_H - (ry + size)) * scale;
    let pw = size * scale;
    let ph = size * scale;
    if (px < x) {
      pw -= x - px;
      px = x;
    }
    if (py < y) {
      ph -= y - py;
      py = y;
    }
    if (px + pw > right) pw = right - px;
    if (py + ph > top) ph = top - py;
    if (pw < 0.4 || ph < 0.4) continue;
    page.drawRectangle({ x: px, y: py, width: pw, height: ph, color: ink });
  }
}

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
    drawDome(page, left, cardTop - headH, cardW, headH);
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
