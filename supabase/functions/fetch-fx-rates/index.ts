// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// FX Rate sources with fallback order
const FX_SOURCES = [
  {
    name: "XE",
    url: "https://xecdapi.xe.com/v1/convert_from.json",
    parser: (data: any) => {
      // XE API response structure
      if (data.to && data.to.length > 0) {
        return parseFloat(data.to[0].mid);
      }
      return null;
    },
    requiresAuth: true,
  },
  {
    name: "ExchangeRate-API",
    url: "https://api.exchangerate-api.com/v4/latest/USD",
    parser: (data: any) => {
      // ExchangeRate-API response structure
      if (data.rates && data.rates.XOF) {
        return 1 / parseFloat(data.rates.XOF); // Convert from USD/XOF to XOF/USD
      }
      return null;
    },
    requiresAuth: false,
  },
  {
    name: "Fixer.io",
    url: "https://api.fixer.io/latest?base=USD&symbols=XOF",
    parser: (data: any) => {
      // Fixer.io response structure
      if (data.rates && data.rates.XOF) {
        return 1 / parseFloat(data.rates.XOF); // Convert from USD/XOF to XOF/USD
      }
      return null;
    },
    requiresAuth: false,
  },
];

interface FXRate {
  from_currency: string; // 'USD'
  to_currency: string;   // 'XOF' 
  rate_decimal: number;  // 566.00 (meaning 1 USD = 566 XOF)
  source: string;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  metadata?: any;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    console.log("🔄 Starting FX rate fetch process...");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if we have a recent rate (within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentRate } = await supabase
      .from("fx_rates")
      .select("*")
      .eq("from_currency", "USD")
      .eq("to_currency", "XOF")
      .eq("is_active", true)
      .gte("valid_from", oneHourAgo)
      .order("valid_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentRate) {
      console.log("✅ Recent rate found, skipping fetch:", {
        rate: recentRate.rate_decimal,
        source: recentRate.source,
        age_minutes: Math.round((Date.now() - new Date(recentRate.valid_from).getTime()) / 60000)
      });
      
      return new Response(
        JSON.stringify({ 
          message: "Rate already up to date",
          rate: recentRate.rate_decimal,
          source: recentRate.source,
          cached: true
        }), 
        { headers: cors }
      );
    }

    // Fetch fresh rate from sources
    let fetchedRate: number | null = null;
    let sourceUsed = "";

    for (const source of FX_SOURCES) {
      try {
        console.log(`🔍 Trying source: ${source.name}`);
        
        const response = await fetch(source.url, {
          method: "GET",
          headers: {
            "User-Agent": "Temba-FX-Fetcher/1.0",
            ...(source.requiresAuth && {
              "Authorization": `Bearer ${Deno.env.get("XE_API_KEY")}`,
            }),
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (!response.ok) {
          console.warn(`⚠️ ${source.name} returned ${response.status}`);
          continue;
        }

        const data = await response.json();
        const rate = source.parser(data);

        if (rate && rate > 300 && rate < 1000) { // Sanity check
          fetchedRate = Math.round(rate * 100) / 100; // Round to 2 decimal places
          sourceUsed = source.name;
          console.log(`✅ ${source.name} returned rate: ${fetchedRate} (1 USD = ${fetchedRate} XOF)`);
          break;
        } else {
          console.warn(`⚠️ ${source.name} returned invalid rate: ${rate}`);
        }
      } catch (error) {
        console.warn(`⚠️ ${source.name} failed:`, error.message);
        continue;
      }
    }

    // Fallback to hardcoded rate if all sources fail
    if (!fetchedRate) {
      console.warn("⚠️ All sources failed, using fallback rate");
      fetchedRate = 566; // Current market rate as of 2024
      sourceUsed = "fallback";
    }

    // Validate rate is reasonable
    if (fetchedRate < 300 || fetchedRate > 1000) {
      throw new Error(`Fetched rate ${fetchedRate} is outside reasonable bounds [300, 1000]`);
    }

    // Deactivate old rates
    await supabase
      .from("fx_rates")
      .update({ is_active: false })
      .eq("from_currency", "USD")
      .eq("to_currency", "XOF");

    // Insert new rate
    const now = new Date();
    const validUntil = new Date(now.getTime() + 2 * 60 * 60 * 1000); // Valid for 2 hours

    const newRate: FXRate = {
      from_currency: "USD",
      to_currency: "XOF",
      rate_decimal: fetchedRate,
      source: sourceUsed,
      valid_from: now.toISOString(),
      valid_until: validUntil.toISOString(),
      is_active: true,
      metadata: {
        fetched_at: now.toISOString(),
        sources_attempted: FX_SOURCES.length,
        note: `1 USD = ${fetchedRate} XOF`,
      },
    };

    const { data: insertedRate, error: insertError } = await supabase
      .from("fx_rates")
      .insert(newRate)
      .select("*")
      .single();

    if (insertError) {
      console.error("❌ Failed to insert FX rate:", insertError);
      throw new Error(`Database insert failed: ${insertError.message}`);
    }

    console.log("✅ FX rate successfully updated:", {
      rate: fetchedRate,
      source: sourceUsed,
      id: insertedRate.id,
    });

    return new Response(
      JSON.stringify({
        message: "FX rate updated successfully",
        rate: fetchedRate,
        source: sourceUsed,
        valid_from: insertedRate.valid_from,
        valid_until: insertedRate.valid_until,
        cached: false,
      }),
      { headers: cors }
    );

  } catch (e: any) {
    console.error("❌ FX fetch error:", e);
    return new Response(
      JSON.stringify({ 
        error: e?.message ?? "Internal error",
        timestamp: new Date().toISOString(),
      }), 
      { status: 500, headers: cors }
    );
  }
});
