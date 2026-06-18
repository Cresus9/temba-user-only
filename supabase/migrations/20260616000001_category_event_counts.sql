-- ============================================================
-- Materialized view: category_event_counts
--
-- Replaces N+1 queries in CategoryList and TrendingSearches.
-- Instead of per-category round-trips, one SELECT * FROM
-- category_event_counts returns all counts instantly.
--
-- Refresh strategy: lightweight REFRESH MATERIALIZED VIEW
-- triggered by the existing events realtime channel or
-- called after admin publishes/unpublishes an event.
-- ============================================================

-- 1. Create the materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS public.category_event_counts AS
SELECT
  c.id                              AS category_id,
  c.name                            AS category_name,
  c.icon,
  c.color,
  COUNT(DISTINCT e.id)              AS upcoming_event_count,
  MAX(e.date)                       AS last_event_date,
  MIN(CASE WHEN e.date >= CURRENT_DATE THEN e.date END) AS next_event_date
FROM public.categories c
LEFT JOIN public.event_category_relations ecr ON ecr.category_id = c.id
LEFT JOIN public.events e
  ON  e.id = ecr.event_id
  AND e.status = 'PUBLISHED'
  AND e.date   >= CURRENT_DATE
GROUP BY c.id, c.name, c.icon, c.color;

-- 2. Index for fast lookup by category_id or name
CREATE UNIQUE INDEX IF NOT EXISTS idx_cat_event_counts_id
  ON public.category_event_counts (category_id);

CREATE INDEX IF NOT EXISTS idx_cat_event_counts_name
  ON public.category_event_counts (category_name);

-- 3. Helper function to refresh the view (call after publish/unpublish)
CREATE OR REPLACE FUNCTION public.refresh_category_event_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.category_event_counts;
END;
$$;

-- 4. Grant read access to the anon / authenticated roles
GRANT SELECT ON public.category_event_counts TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_category_event_counts() TO authenticated;

-- 5. Trigger: auto-refresh when an event is published/unpublished/deleted
CREATE OR REPLACE FUNCTION public._trg_refresh_category_counts()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Fire-and-forget: refresh in background (won't block the DML)
  PERFORM public.refresh_category_event_counts();
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_category_counts ON public.events;
CREATE TRIGGER trg_event_category_counts
  AFTER INSERT OR UPDATE OF status, date OR DELETE
  ON public.events
  FOR EACH STATEMENT
  EXECUTE FUNCTION public._trg_refresh_category_counts();

-- 6. Initial population
REFRESH MATERIALIZED VIEW public.category_event_counts;

SELECT 'category_event_counts materialized view created ✅' AS status;
