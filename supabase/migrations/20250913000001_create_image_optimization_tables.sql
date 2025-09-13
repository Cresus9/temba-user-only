-- Create tables for image optimization and caching system

-- Table to track image cache statistics
CREATE TABLE IF NOT EXISTS image_cache_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  original_size bigint NOT NULL,
  optimized_size bigint NOT NULL,
  compression_ratio decimal(5,2) NOT NULL,
  cache_key text NOT NULL,
  accessed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Table to log image warmup activities
CREATE TABLE IF NOT EXISTS image_warmup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warmup_date timestamptz NOT NULL,
  events_processed integer NOT NULL DEFAULT 0,
  images_warmed integer NOT NULL DEFAULT 0,
  images_failed integer NOT NULL DEFAULT 0,
  details jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- Table to track popular images for prioritized caching
CREATE TABLE IF NOT EXISTS popular_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL UNIQUE,
  access_count integer DEFAULT 1,
  last_accessed timestamptz DEFAULT now(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  image_type text CHECK (image_type IN ('main', 'banner', 'gallery', 'thumbnail')),
  priority_score decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_image_cache_stats_url ON image_cache_stats(image_url);
CREATE INDEX IF NOT EXISTS idx_image_cache_stats_accessed_at ON image_cache_stats(accessed_at);

CREATE INDEX IF NOT EXISTS idx_image_warmup_logs_date ON image_warmup_logs(warmup_date);

CREATE INDEX IF NOT EXISTS idx_popular_images_url ON popular_images(image_url);
CREATE INDEX IF NOT EXISTS idx_popular_images_access_count ON popular_images(access_count DESC);
CREATE INDEX IF NOT EXISTS idx_popular_images_priority ON popular_images(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_popular_images_event_id ON popular_images(event_id);

-- Function to update popular images tracking
CREATE OR REPLACE FUNCTION track_image_access(p_image_url text, p_event_id uuid DEFAULT NULL, p_image_type text DEFAULT 'main')
RETURNS void AS $$
BEGIN
  INSERT INTO popular_images (image_url, access_count, event_id, image_type, last_accessed, priority_score)
  VALUES (p_image_url, 1, p_event_id, p_image_type, now(), 1.0)
  ON CONFLICT (image_url) 
  DO UPDATE SET
    access_count = popular_images.access_count + 1,
    last_accessed = now(),
    priority_score = (popular_images.access_count + 1) * 
      CASE 
        WHEN now() - popular_images.last_accessed < interval '1 day' THEN 2.0
        WHEN now() - popular_images.last_accessed < interval '7 days' THEN 1.5
        ELSE 1.0
      END,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top priority images for cache warming
CREATE OR REPLACE FUNCTION get_priority_images(limit_count integer DEFAULT 100)
RETURNS TABLE (
  image_url text,
  event_id uuid,
  image_type text,
  access_count integer,
  priority_score decimal,
  last_accessed timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pi.image_url,
    pi.event_id,
    pi.image_type,
    pi.access_count,
    pi.priority_score,
    pi.last_accessed
  FROM popular_images pi
  LEFT JOIN events e ON pi.event_id = e.id
  WHERE e.status = 'PUBLISHED' OR pi.event_id IS NULL
  ORDER BY pi.priority_score DESC, pi.access_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old cache statistics
CREATE OR REPLACE FUNCTION cleanup_old_cache_stats()
RETURNS void AS $$
BEGIN
  -- Delete cache stats older than 30 days
  DELETE FROM image_cache_stats 
  WHERE created_at < now() - interval '30 days';
  
  -- Delete warmup logs older than 90 days
  DELETE FROM image_warmup_logs 
  WHERE created_at < now() - interval '90 days';
  
  -- Reset priority scores for images not accessed in 30 days
  UPDATE popular_images 
  SET priority_score = priority_score * 0.5
  WHERE last_accessed < now() - interval '30 days'
  AND priority_score > 0.1;
  
  -- Delete very old unpopular images
  DELETE FROM popular_images 
  WHERE last_accessed < now() - interval '90 days'
  AND access_count < 5;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE image_cache_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_warmup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE popular_images ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access
CREATE POLICY "service_role_all_image_cache_stats"
  ON image_cache_stats FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_image_warmup_logs"
  ON image_warmup_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_popular_images"
  ON popular_images FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create policies for authenticated users (read-only access to stats)
CREATE POLICY "authenticated_read_image_cache_stats"
  ON image_cache_stats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_read_popular_images"
  ON popular_images FOR SELECT
  TO authenticated
  USING (true);

-- Grant permissions
GRANT ALL ON image_cache_stats TO service_role;
GRANT ALL ON image_warmup_logs TO service_role;
GRANT ALL ON popular_images TO service_role;

GRANT SELECT ON image_cache_stats TO authenticated;
GRANT SELECT ON popular_images TO authenticated;

-- Create a cron job to run cache warming every 2 hours (if pg_cron is available)
-- This would typically be set up separately in production
-- SELECT cron.schedule('warm-image-cache', '0 */2 * * *', 'SELECT net.http_post(url:=''https://your-project.supabase.co/functions/v1/image-cache-warmer'', headers:=jsonb_build_object(''Authorization'', ''Bearer '' || current_setting(''app.settings.service_role_key'')))');

COMMIT;
