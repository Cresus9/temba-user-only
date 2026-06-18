-- ============================================================
-- Performance indexes — missing composites
--
-- All existing single-column indexes remain untouched.
-- These composites cover the exact WHERE/ORDER BY patterns
-- used by the app's hottest queries so Postgres can satisfy
-- them with an index-only scan instead of a seq-scan + filter.
-- ============================================================


-- ── 1. events: main list query ─────────────────────────────
-- Pattern:  WHERE status = 'PUBLISHED' AND date >= $today
--           ORDER BY date ASC
-- Used by:  EventContext.fetchEvents, CategoryEventsDisplay,
--           FeaturedEvents, UpcomingEvents
CREATE INDEX IF NOT EXISTS idx_events_status_date
  ON public.events (status, date ASC);


-- ── 2. events: featured carousel ──────────────────────────
-- Pattern:  WHERE status = 'PUBLISHED'
--           AND featured = true
--           AND date >= $today
-- Used by:  FeaturedEvents (admin-starred events)
CREATE INDEX IF NOT EXISTS idx_events_featured_status_date
  ON public.events (featured, status, date ASC)
  WHERE featured = true;          -- partial index: only indexes featured rows


-- ── 3. events: country + upcoming ─────────────────────────
-- Pattern:  WHERE status = 'PUBLISHED'
--           AND country_code = $code
--           AND date >= $today
-- Used by:  country-filtered queries, CountryPicker
CREATE INDEX IF NOT EXISTS idx_events_country_status_date
  ON public.events (country_code, status, date ASC);


-- ── 4. events: single event detail ────────────────────────
-- Pattern:  WHERE id = $id AND status = 'PUBLISHED'
-- Note:     id is already PK (unique B-tree).  Adding status
--           lets Postgres skip the heap fetch for status check.
CREATE INDEX IF NOT EXISTS idx_events_id_status
  ON public.events (id, status);


-- ── 5. tickets: my tickets page ───────────────────────────
-- Pattern:  WHERE user_id = $uid
--           ORDER BY created_at DESC
-- Used by:  MyTickets, profile dashboard
CREATE INDEX IF NOT EXISTS idx_tickets_user_created
  ON public.tickets (user_id, created_at DESC);


-- ── 6. orders: booking history ────────────────────────────
-- Pattern:  WHERE user_id = $uid
--           ORDER BY created_at DESC
-- Used by:  BookingHistory, Dashboard order list
CREATE INDEX IF NOT EXISTS idx_orders_user_created
  ON public.orders (user_id, created_at DESC);


-- ── 7. ticket_types: event join ───────────────────────────
-- Pattern:  WHERE event_id = $id
-- idx_ticket_types_event_id already exists; add status filter
-- because nearly every query also filters sales_enabled = true
CREATE INDEX IF NOT EXISTS idx_ticket_types_event_sales
  ON public.ticket_types (event_id, sales_enabled)
  WHERE sales_enabled = true;


-- ── 8. notifications: unread badge count ──────────────────
-- Pattern:  WHERE user_id = $uid AND read = false
-- notifications_user_read_idx exists but uses old column name;
-- add modern partial index covering the unread fast-path
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC)
  WHERE read = false;


-- ── 9. event_category_relations: composite ────────────────
-- Pattern:  JOIN WHERE event_id = $id (or category_id = $cid)
-- Both sides already indexed individually; composite covers
-- the common "give me all categories for this event" JOIN
CREATE INDEX IF NOT EXISTS idx_ecr_event_category
  ON public.event_category_relations (event_id, category_id);


-- ── 10. payments: status polling ──────────────────────────
-- Pattern:  WHERE order_id = $oid AND status = $s
-- Used by:  EnhancedBookingConfirmation polling loop
CREATE INDEX IF NOT EXISTS idx_payments_order_status
  ON public.payments (order_id, status);


SELECT 'Performance composite indexes created ✅' AS status;
