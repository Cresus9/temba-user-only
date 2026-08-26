import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-application-name",
};

function digits(phone?: string | null): string {
  return (phone || "").replace(/\D/g, "");
}

function phonesMatch(a?: string | null, b?: string | null): boolean {
  const da = digits(a);
  const db = digits(b);
  if (!da || !db) return false;
  if (da === db) return true;
  const tailA = da.slice(-8);
  const tailB = db.slice(-8);
  return tailA.length === 8 && tailA === tailB;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ success: false, error: "Authorization required" }, 401);
    }

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      return json({ success: false, error: "Invalid session" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const extraTokens: string[] = Array.isArray(body.tokens)
      ? body.tokens.filter((t: unknown) => typeof t === "string" && t.length > 0)
      : [];

    const { data: profile } = await supabase
      .from("profiles")
      .select("phone, email, name")
      .eq("user_id", user.id)
      .maybeSingle();

    const email = (profile?.email || user.email || "").trim().toLowerCase();
    const phone = profile?.phone || user.phone || "";

    const chunks: any[] = [];

    if (email) {
      const { data } = await supabase
        .from("guest_orders")
        .select("id, order_id, email, phone, token")
        .ilike("email", email);
      if (data) chunks.push(...data);
    }

    if (phone) {
      const d = digits(phone);
      const variants = [...new Set([phone, `+${d}`, d, d.slice(-8)].filter(Boolean))];
      const { data } = await supabase
        .from("guest_orders")
        .select("id, order_id, email, phone, token")
        .or(variants.map((v) => `phone.eq.${v}`).join(","));
      if (data) chunks.push(...data);
    }

    if (extraTokens.length) {
      const { data } = await supabase
        .from("guest_orders")
        .select("id, order_id, email, phone, token")
        .in("token", extraTokens);
      if (data) chunks.push(...data);
    }

    if (email) {
      const { data: orphanOrders } = await supabase
        .from("orders")
        .select("id, guest_email")
        .is("user_id", null)
        .ilike("guest_email", email);
      for (const order of orphanOrders || []) {
        chunks.push({
          order_id: order.id,
          email: order.guest_email,
          phone: null,
          token: null,
        });
      }
    }

    const seen = new Set<string>();
    const matches = chunks.filter((row) => {
      if (!row.order_id || seen.has(row.order_id)) return false;
      const emailMatch = email && (row.email || "").trim().toLowerCase() === email;
      const phoneMatch = phone && phonesMatch(row.phone, phone);
      const tokenMatch = row.token && extraTokens.includes(row.token);
      if (!(emailMatch || phoneMatch || tokenMatch)) return false;
      seen.add(row.order_id);
      return true;
    });

    if (!matches.length) {
      return json({ success: true, claimed: 0 });
    }

    const orderIds = [...new Set(matches.map((m) => m.order_id).filter(Boolean))];
    let claimed = 0;

    for (const orderId of orderIds) {
      const { data: order } = await supabase
        .from("orders")
        .select("id, user_id")
        .eq("id", orderId)
        .maybeSingle();

      if (!order) continue;
      if (order.user_id && order.user_id !== user.id) continue;

      let attached = false;
      if (!order.user_id) {
        await supabase.from("orders").update({ user_id: user.id }).eq("id", orderId);
        attached = true;
      }

      const { data: tickets } = await supabase
        .from("tickets")
        .select("id, user_id")
        .eq("order_id", orderId);

      for (const ticket of tickets || []) {
        if (ticket.user_id && ticket.user_id !== user.id) continue;
        if (!ticket.user_id) {
          await supabase.from("tickets").update({ user_id: user.id }).eq("id", ticket.id);
          attached = true;
        }
      }
      if (attached) claimed += 1;
    }

    return json({ success: true, claimed });
  } catch (error) {
    console.error("claim-guest-orders:", error);
    return json({ success: false, error: (error as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
