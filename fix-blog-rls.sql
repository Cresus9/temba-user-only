-- Quick fix for blog RLS policies
-- Run this in Supabase SQL Editor

-- Enable RLS on all blog tables
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_tags ENABLE ROW LEVEL SECURITY;

-- Drop any existing restrictive policies
DROP POLICY IF EXISTS "Public users can view published blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Authenticated users can view all blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Admins can manage blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Public users can view blog categories" ON blog_categories;
DROP POLICY IF EXISTS "Public users can view blog tags" ON blog_tags;
DROP POLICY IF EXISTS "Public users can view blog_post_tags" ON blog_post_tags;

-- Allow public (anon) users to SELECT published posts
CREATE POLICY "anon_select_published_posts" ON blog_posts
  FOR SELECT TO anon
  USING (status = 'PUBLISHED');

-- Allow authenticated users to SELECT all posts
CREATE POLICY "auth_select_all_posts" ON blog_posts
  FOR SELECT TO authenticated
  USING (true);

-- Allow public to view categories
CREATE POLICY "public_select_categories" ON blog_categories
  FOR SELECT TO anon, authenticated
  USING (true);

-- Allow public to view tags
CREATE POLICY "public_select_tags" ON blog_tags
  FOR SELECT TO anon, authenticated
  USING (true);

-- Allow public to view post-tag relationships
CREATE POLICY "public_select_post_tags" ON blog_post_tags
  FOR SELECT TO anon, authenticated
  USING (true);

-- Admins can do everything (if you have admin role)
CREATE POLICY "admin_all_blog_posts" ON blog_posts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );
