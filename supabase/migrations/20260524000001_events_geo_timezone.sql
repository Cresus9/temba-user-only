/*
  # Geo & Timezone fields on events

  Adds five columns to `events` — all nullable/with safe defaults so existing rows and
  queries are never broken.  The admin portal can populate the new fields going forward;
  existing Burkina Faso events get the default values automatically.

  Columns added
  ─────────────
  country_code  TEXT   — ISO 3166-1 alpha-2  (BF, FR, US, GB, …)
  city          TEXT   — Display city name   (Ouagadougou, Paris, …)
  timezone      TEXT   — IANA tz identifier  (Africa/Ouagadougou, Europe/Paris, …)
  address       TEXT   — Street / venue address for geocoding and display
  region        TEXT   — State / département / province (optional, free-text)

  Indexes are added on country_code and city so geo-filtered queries stay fast even
  at tens-of-thousands of events.
*/

-- 1. Add columns (safe, non-locking on Postgres 14+)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'BF',
  ADD COLUMN IF NOT EXISTS city         TEXT,
  ADD COLUMN IF NOT EXISTS timezone     TEXT NOT NULL DEFAULT 'Africa/Ouagadougou',
  ADD COLUMN IF NOT EXISTS address      TEXT,
  ADD COLUMN IF NOT EXISTS region       TEXT;

-- 2. Comments
COMMENT ON COLUMN events.country_code IS 'ISO 3166-1 alpha-2 country code, e.g. BF, FR, US';
COMMENT ON COLUMN events.city         IS 'Display city name, e.g. Ouagadougou, Paris, New York';
COMMENT ON COLUMN events.timezone     IS 'IANA timezone identifier, e.g. Africa/Ouagadougou, Europe/Paris';
COMMENT ON COLUMN events.address      IS 'Street / venue address used for geocoding and display';
COMMENT ON COLUMN events.region       IS 'State, département or province (optional)';

-- 3. Backfill existing rows with Burkina Faso defaults
--    (country_code already has DEFAULT 'BF', but timezone needs an explicit update for
--     any row that was inserted before this migration if the column was nullable)
UPDATE public.events
SET
  city     = COALESCE(city, 'Ouagadougou'),
  timezone = COALESCE(timezone, 'Africa/Ouagadougou')
WHERE country_code = 'BF';

-- 4. Indexes for geo-scoped queries
CREATE INDEX IF NOT EXISTS idx_events_country_code ON public.events (country_code);
CREATE INDEX IF NOT EXISTS idx_events_city         ON public.events (city);
CREATE INDEX IF NOT EXISTS idx_events_country_city ON public.events (country_code, city);

-- 5. Expose new columns in the public read view (if one exists; safe no-op otherwise)
--    Nothing to do — SELECT * already picks up new columns.

-- Done
SELECT 'Geo & timezone columns added to events ✅' AS status;
