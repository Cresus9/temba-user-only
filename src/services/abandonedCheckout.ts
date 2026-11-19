import { supabase } from '../lib/supabase-client';
import { eventPublicPath } from '../utils/eventPath';

/** Record a started checkout for a signed-in buyer. No-op for guests; never throws. */
export async function recordCheckoutStart(input: {
  eventId?: string | null;
  eventSlug?: string | null;
  eventDateId?: string | null;
  tickets?: Record<string, number> | Array<{ ticketTypeId: string; quantity: number }>;
  totalAmount?: number | null;
  source?: string;
}): Promise<void> {
  const eventId = input.eventId?.trim();
  if (!eventId) return;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    const resumePath = eventPublicPath({ id: eventId, slug: input.eventSlug });
    const { error } = await supabase.rpc('notif_record_checkout_start', {
      p_event_id: eventId,
      p_event_date_id: input.eventDateId || null,
      p_ticket_selections: input.tickets ?? {},
      p_total_amount: input.totalAmount ?? null,
      p_resume_path: resumePath,
      p_source: input.source ?? 'web',
    });
    if (error) {
      console.warn('Checkout reminder not recorded:', error.message);
    }
  } catch (err) {
    console.warn('Checkout reminder not recorded:', err);
  }
}
