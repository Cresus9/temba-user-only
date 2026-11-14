// deno-lint-ignore-file no-explicit-any
/**
 * Ticket confirmation email. Called only after tickets exist.
 * A send failure must not roll back finalization.
 * Idempotency flag: payments.metadata.ticket_email_sent_at (no new column).
 */
import {
  sendResendEmail,
  ticketEmailHtml,
  ticketEmailSubject,
  type TicketEmailInput,
} from "./email.ts";
import { buildTicketPdf, qrPng, type PdfAssets } from "./ticketPdf.ts";

const TZ = "Africa/Ouagadougou";

function realEmail(email?: string | null): string | undefined {
  const trimmed = (email || "").trim().toLowerCase();
  if (!trimmed || trimmed.endsWith("@temba.temp") || !trimmed.includes("@")) return undefined;
  return trimmed;
}

function cleanVenue(raw?: string | null, city?: string | null) {
  const name = String(raw || "")
    .replace(/\s*\([^)]*(ouaga|bobo|abidjan|dakar)[^)]*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const place = name
    .split(" ")
    .map((word, index) => {
      const lower = word.toLocaleLowerCase("fr");
      if (index > 0 && ["de", "du", "des", "la", "le", "les", "et"].includes(lower)) return lower;
      return lower.charAt(0).toLocaleUpperCase("fr") + lower.slice(1);
    })
    .join(" ");
  return [place, city].filter(Boolean).join(" · ");
}

function clock(value?: string | null) {
  const match = String(value || "").match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "";
}

function formatWhen(date: string, time: string | null, zone: string) {
  const day = date.split("T")[0];
  const [y, m, d] = day.split("-").map(Number);
  const anchor = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12));
  const long = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: zone,
  }).format(anchor);
  const short = new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: zone,
  }).format(anchor).replace(/\./g, "");
  const hm = clock(time);
  return {
    long: hm ? `${long} · ${hm}` : long,
    short: hm ? `${short} · ${hm}` : short,
    subject: short.toLocaleLowerCase("fr"),
  };
}

function formatPaidAt(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  }).format(date);
  const hm = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: TZ,
  }).format(date);
  return `${day} à ${hm} (Ouagadougou)`;
}

function methodLabel(raw?: string | null, charge?: { currency?: string | null; minor?: number | null }) {
  const value = String(raw || "").toLowerCase();
  let label = "Mobile Money";
  if (value.includes("card") || value.includes("carte") || value.includes("stripe")) label = "Carte";
  if (charge?.currency && charge.minor != null && label === "Carte") {
    const major = Number(charge.minor) / (String(charge.currency).toUpperCase() === "USD" ? 100 : 1);
    const amount = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(major);
    label += ` · débité ${amount} $`;
  }
  return label;
}

function hidePayment(total: number, method?: string | null) {
  if (Number(total) <= 0) return true;
  const value = String(method || "").toUpperCase();
  return value === "FREE_TICKET" || value === "ADMIN_COMP" || value === "REFERRAL_CREDITS";
}

function maskPhone(phone?: string | null) {
  const digits = String(phone || "").replace(/\D/g, "");
  const local = digits.startsWith("226") ? digits.slice(3) : digits;
  if (local.length < 8) return "";
  return `+226 ${local.slice(0, 2)} •• •• ${local.slice(-2)}`;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function pdfAssets(): Promise<PdfAssets> {
  const fonts = new URL("./fonts/", import.meta.url);
  const read = (name: string) => Deno.readFile(new URL(name, fonts));
  return {
    inter: await read("Inter-Regular.ttf"),
    interSemi: await read("Inter-SemiBold.ttf"),
    interBold: await read("Inter-Bold.ttf"),
    tightBold: await read("InterTight-Bold.ttf"),
    mono: await read("JetBrainsMono-SemiBold.ttf"),
    logo: await Deno.readFile(new URL("../../../public/email/temba-logo-white-noR.png", import.meta.url)),
    dome: await Deno.readFile(new URL("../../../public/email/tk-dome-170x300.png", import.meta.url)),
    symbol: await Deno.readFile(new URL("../../../public/email/symbol-purple.png", import.meta.url)),
  };
}

export async function sendTicketEmailForPayment(supabase: any, paymentId: string) {
  const { data: payment, error } = await supabase
    .from("payments")
    .select("id, order_id, payment_method, completed_at, metadata, customer_email, customer_phone, charge_currency, charge_amount_minor")
    .eq("id", paymentId)
    .maybeSingle();
  if (error || !payment?.order_id) {
    console.warn("[ticket-email] payment unreadable", paymentId, error?.message);
    return;
  }
  const meta = (payment.metadata && typeof payment.metadata === "object") ? { ...payment.metadata } : {};
  if (meta.ticket_email_sent_at) return;

  const { data: order } = await supabase
    .from("orders")
    .select("id, user_id, event_id, event_date_id, total, guest_email, ticket_quantities, status")
    .eq("id", payment.order_id)
    .maybeSingle();
  if (!order?.id || order.status !== "COMPLETED") return;

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, ticket_type_id")
    .eq("order_id", order.id);
  if (!tickets?.length) return;

  const { data: guest } = await supabase
    .from("guest_orders")
    .select("name, email, phone")
    .eq("order_id", order.id)
    .maybeSingle();
  let profile: { name?: string | null; email?: string | null; phone?: string | null } | null = null;
  if (order.user_id) {
    const { data } = await supabase
      .from("profiles")
      .select("name, email, phone")
      .eq("user_id", order.user_id)
      .maybeSingle();
    profile = data;
  }
  const email = realEmail(guest?.email) || realEmail(order.guest_email) || realEmail(profile?.email) || realEmail(payment.customer_email);
  if (!email) return;

  const { data: event } = await supabase
    .from("events")
    .select("title, date, time, timezone, venue, location, city, image_url")
    .eq("id", order.event_id)
    .maybeSingle();
  if (!event?.title) return;

  let date = event.date;
  let time = event.time;
  if (order.event_date_id) {
    const { data: eventDate } = await supabase
      .from("event_dates")
      .select("date, start_time")
      .eq("id", order.event_date_id)
      .maybeSingle();
    if (eventDate?.date) {
      date = eventDate.date;
      time = eventDate.start_time || time;
    }
  }

  const typeIds = [...new Set(tickets.map((ticket: any) => ticket.ticket_type_id).filter(Boolean))];
  const { data: types } = typeIds.length
    ? await supabase.from("ticket_types").select("id, name, price").in("id", typeIds)
    : { data: [] };
  const typeMap = new Map((types || []).map((row: any) => [row.id, row]));

  const claimedAt = new Date().toISOString();
  const claimed = { ...meta, ticket_email_sent_at: claimedAt };
  const { data: lock } = await supabase
    .from("payments")
    .update({ metadata: claimed })
    .eq("id", payment.id)
    .filter("metadata->>ticket_email_sent_at", "is", null)
    .select("id");
  if (!lock?.length) return;

  try {
    const zone = event.timezone || TZ;
    const when = formatWhen(String(date || ""), time, zone);
    const venue = cleanVenue(event.venue || event.location, event.city);
    const attachments = [];
    const emailTickets = [];
    const pdfTickets = [];
    for (const [index, ticket] of tickets.entries()) {
      const type = typeMap.get(ticket.ticket_type_id);
      const name = String(type?.name || "Billet").trim();
      const contentId = `qr-${ticket.id}`;
      const png = await qrPng(String(ticket.id));
      attachments.push({
        filename: `${contentId}.png`,
        content: bytesToBase64(png),
        content_id: contentId,
      });
      emailTickets.push({
        id: ticket.id,
        name,
        price: Number(type?.price || 0),
        number: String(ticket.id).slice(0, 8).toUpperCase(),
        qrSrc: `cid:${contentId}`,
        qrAlt: `QR code du billet ${index + 1} sur ${tickets.length} (${name}) pour ${event.title}`,
      });
      pdfTickets.push({
        id: String(ticket.id),
        name,
        price: Number(type?.price || 0),
        index: index + 1,
        total: tickets.length,
      });
    }
    const counts = new Map<string, { name: string; price: number; qty: number }>();
    for (const ticket of emailTickets) {
      const key = `${ticket.name}:${ticket.price}`;
      const row = counts.get(key) || { name: ticket.name, price: ticket.price, qty: 0 };
      row.qty += 1;
      counts.set(key, row);
    }
    const phone = maskPhone(payment.customer_phone || guest?.phone || profile?.phone || (meta.phone as string));
    const paid = methodLabel(payment.payment_method, {
      currency: payment.charge_currency,
      minor: payment.charge_amount_minor,
    });
    const input: TicketEmailInput = {
      buyerName: guest?.name || profile?.name || "",
      eventTitle: event.title,
      whenLong: when.long,
      whenShort: when.short,
      dateLabel: when.short.split("·")[0].trim(),
      timeLabel: clock(time) || "—",
      subjectDate: when.subject,
      timezoneLabel: "Heure de Ouagadougou",
      venueLine: venue,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`,
      posterUrl: event.image_url,
      tickets: emailTickets,
      lines: [...counts.values()].map((row) => ({ label: `${row.qty} × ${row.name}`, amount: row.price * row.qty })),
      total: Number(order.total || 0),
      orderRef: String(order.id).slice(0, 8).toUpperCase(),
      paymentRef: String(payment.id).slice(0, 8).toUpperCase(),
      paidBy: phone ? `${paid} · ${phone}` : paid,
      paidAt: formatPaidAt(payment.completed_at),
      ticketsUrl: order.user_id ? "https://tembas.com/profile/my-tickets" : "https://tembas.com/find-tickets",
      guestHint: !order.user_id,
      hidePayment: hidePayment(Number(order.total || 0), payment.payment_method),
    };
    const orderRef = String(order.id).slice(0, 8).toUpperCase();
    try {
      const pdf = await buildTicketPdf({
        eventTitle: event.title,
        dateLabel: input.dateLabel,
        timeLabel: input.timeLabel,
        venueLine: venue,
        buyerName: input.buyerName,
        orderRef,
        tickets: pdfTickets,
      }, await pdfAssets());
      attachments.push({
        filename: `Temba-billets-${orderRef}.pdf`,
        content: bytesToBase64(pdf),
      });
    } catch (pdfErr) {
      console.error("[ticket-email] PDF skipped:", pdfErr);
    }
    await sendResendEmail({
      to: email,
      subject: ticketEmailSubject({ eventTitle: event.title, subjectDate: when.subject }),
      html: ticketEmailHtml(input),
      attachments,
    });
  } catch (err) {
    console.error("[ticket-email] send failed, finalization kept:", err);
    const rolled = { ...meta };
    delete rolled.ticket_email_sent_at;
    await supabase.from("payments").update({ metadata: rolled }).eq("id", payment.id);
  }
}
