import type { Context } from "https://edge.netlify.com";

/**
 * Organizer share: tembas.com/w/SLUG → WhatsApp with prefilled text=SLUG.
 * Number from Netlify env WHATSAPP_WA_ME_NUMBER (digits, e.g. 2267…).
 * Do not add a meta-refresh. Humans hitting this URL should leave the site.
 */
export default async (request: Request, _context: Context) => {
  const slug = new URL(request.url).pathname
    .replace(/^\/w\//, "")
    .replace(/\/$/, "");
  const number = (
    Deno.env.get("WHATSAPP_WA_ME_NUMBER") ??
    Deno.env.get("VITE_WHATSAPP_WA_ME_NUMBER") ??
    ""
  ).replace(/\D/g, "");

  if (!slug || slug.includes("..") || slug.includes("/") || slug.length > 80) {
    return Response.redirect("https://tembas.com/events", 302);
  }

  if (!number) {
    return Response.redirect(
      `https://tembas.com/events?w=${encodeURIComponent(slug)}`,
      302,
    );
  }

  const target = `https://wa.me/${number}?text=${encodeURIComponent(slug)}`;
  return Response.redirect(target, 302);
};
