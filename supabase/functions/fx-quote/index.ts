// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

interface FXQuoteRequest {
  xof_amount_minor: number;  // XOF amount (no decimals, so this is whole XOF)
  margin_bps?: number;        // Optional margin in basis points (default: 150 = 1.5%)
}

interface FXQuoteResponse {
  usd_cents: number;
  fx_num: number;
  fx_den: number;
  fx_locked_at: string;
  margin_bps: number;
  base_xof_per_usd: number;
  effective_xof_per_usd: number;
  display_amount: string;     // e.g., "5 000 XOF"
  charge_amount: string;      // e.g., "$3.03 USD"
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body: FXQuoteRequest = await req.json();
    const { xof_amount_minor, margin_bps = 150 } = body;

    // Validate input
    if (!Number.isFinite(xof_amount_minor) || xof_amount_minor <= 0) {
      return new Response(
        JSON.stringify({ error: "xof_amount_minor must be a positive number" }), 
        { status: 400, headers: cors }
      );
    }

    if (margin_bps < 0 || margin_bps > 500) {
      return new Response(
        JSON.stringify({ error: "margin_bps must be between 0 and 500" }), 
        { status: 400, headers: cors }
      );
    }

    console.log("📊 FX Quote Request:", { xof_amount_minor, margin_bps });

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch current active FX rate from cache
    const { data: fxRate, error: fxError } = await supabase
      .from("fx_rates")
      .select("*")
      .eq("from_currency", "USD")
      .eq("to_currency", "XOF")
      .eq("is_active", true)
      .lte("valid_from", new Date().toISOString())
      .order("valid_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fxError || !fxRate) {
      console.error("❌ Failed to fetch FX rate:", fxError);
      // Fallback to hardcoded rate if DB fetch fails
      const fallbackRate = 566; // 1 USD = 566 XOF (current market rate as of 2024)
      console.warn("⚠️ Using fallback rate:", fallbackRate);
      
      return createQuoteResponse(
        xof_amount_minor, 
        fallbackRate, 
        margin_bps, 
        "fallback"
      );
    }

    console.log("✅ FX Rate found:", {
      rate: fxRate.rate_decimal,
      source: fxRate.source,
      valid_from: fxRate.valid_from,
      meaning: `1 USD = ${fxRate.rate_decimal} XOF`
    });

    // Use the cached rate (fxRate.rate_decimal is already "XOF per USD")
    const baseXofPerUsd = Math.round(fxRate.rate_decimal);
    
    return createQuoteResponse(
      xof_amount_minor, 
      baseXofPerUsd, 
      margin_bps, 
      fxRate.source
    );

  } catch (e: any) {
    console.error("❌ FX Quote error:", e);
    return new Response(
      JSON.stringify({ error: e?.message ?? "Internal error" }), 
      { status: 500, headers: cors }
    );
  }
});

function createQuoteResponse(
  xof_amount_minor: number,
  baseXofPerUsd: number,
  margin_bps: number,
  source: string
): Response {
  // Apply margin
  const marginMultiplier = 1 + (margin_bps / 10000); // 150 bps → 1.015
  const effectiveXofPerUsd = Math.round(baseXofPerUsd * marginMultiplier);

  // Convert: USD = XOF / effectiveXofPerUsd
  // USD cents = (XOF * 100) / effectiveXofPerUsd
  const usd_cents = Math.max(1, Math.round((xof_amount_minor * 100) / effectiveXofPerUsd));

  const fx_locked_at = new Date().toISOString();

  // Format for display
  const display_amount = `${xof_amount_minor.toLocaleString('fr-FR')} FCFA`;
  const charge_amount = `$${(usd_cents / 100).toFixed(2)} USD`;

  const response: FXQuoteResponse = {
    usd_cents,
    fx_num: 100,                    // numerator
    fx_den: effectiveXofPerUsd,     // denominator (XOF per USD with margin)
    fx_locked_at,
    margin_bps,
    base_xof_per_usd: baseXofPerUsd,
    effective_xof_per_usd: effectiveXofPerUsd,
    display_amount,
    charge_amount,
  };

  console.log("💱 Quote generated:", {
    xof: xof_amount_minor,
    usd_cents,
    rate: `1 USD = ${effectiveXofPerUsd} XOF`,
    source,
  });

  return new Response(
    JSON.stringify(response), 
    { headers: { ...cors, "Content-Type": "application/json" } }
  );
}

