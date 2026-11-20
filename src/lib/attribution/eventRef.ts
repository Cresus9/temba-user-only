import { supabase } from "../supabase-client";
import type { AttributionEventRef } from "../../utils/referralStorage";

/** Resolve an event id to the slug stored with an event-specific ?r= click. */
export async function resolveEventRef(eventId: string): Promise<AttributionEventRef> {
  if (!eventId) return {};
  try {
    const { data } = await supabase.from("events").select("id, slug").eq("id", eventId).maybeSingle();
    const row = data as { id?: string; slug?: string | null } | null;
    return { id: eventId, slug: row?.slug ?? null };
  } catch {
    return { id: eventId };
  }
}
