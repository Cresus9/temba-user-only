-- =====================================================
-- Fix Blog Posts RLS Policies
-- Ensures public users can read published blog posts
-- =====================================================

-- Enable RLS if not already enabled
ALTER TABLE IF EXISTS blog_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public users can view published blog posts" ON blog_posts;
DROP POLICY IF EXISTS "blog_posts_select_policy" ON blog_posts;
DROP POLICY IF EXISTS "blog_posts_public_select" ON blog_posts;

-- Create policy for public users to view published posts
CREATE POLICY "Public users can view published blog posts"
  ON blog_posts FOR SELECT
  USING (status = 'PUBLISHED');

-- Allow authenticated users (including admins) to view all posts
CREATE POLICY "Authenticated users can view all blog posts"
  ON blog_posts FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to manage all blog posts
CREATE POLICY "Admins can manage blog posts"
  ON blog_posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Also ensure blog_categories, blog_tags, and blog_post_tags are accessible
ALTER TABLE IF EXISTS blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS blog_post_tags ENABLE ROW LEVEL SECURITY;

-- Public can view all categories
DROP POLICY IF EXISTS "Public users can view blog categories" ON blog_categories;
CREATE POLICY "Public users can view blog categories"
  ON blog_categories FOR SELECT
  USING (true);

-- Public can view all tags
DROP POLICY IF EXISTS "Public users can view blog tags" ON blog_tags;
CREATE POLICY "Public users can view blog tags"
  ON blog_tags FOR SELECT
  USING (true);

-- Public can view blog_post_tags relationships
DROP POLICY IF EXISTS "Public users can view blog_post_tags" ON blog_post_tags;
CREATE POLICY "Public users can view blog_post_tags"
  ON blog_post_tags FOR SELECT
  USING (true);
