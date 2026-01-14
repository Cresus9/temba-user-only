#!/usr/bin/env node
/**
 * Generate sitemap entries for blog posts
 * Run this script to update sitemap.xml with latest blog posts
 * 
 * Usage: node scripts/generate-blog-sitemap.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
const envPath = join(__dirname, '../.env');
if (existsSync(envPath)) {
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      process.env[key.trim()] = value;
    }
  });
}

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://uwmlagvsivxqocklxbbo.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3bWxhZ3ZzaXZ4cW9ja2x4YmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIyNzE5NzUsImV4cCI6MjA0Nzg0Nzk3NX0.kHJUJlrNMtemNOE_KI-S_l_XEo9KPMeCVjTqb1lUQ2E';

console.log('🔑 Using Supabase URL:', SUPABASE_URL);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SITE_URL = 'https://tembas.com';

async function generateBlogSitemap() {
  console.log('🔍 Fetching published blog posts...');

  try {
    // Fetch all published blog posts
    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select('slug, updated_at, created_at, published_at')
      .eq('status', 'PUBLISHED')
      .order('published_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching blog posts:', error);
      throw error;
    }

    if (!posts || posts.length === 0) {
      console.log('⚠️  No published blog posts found.');
      return;
    }

    console.log(`✅ Found ${posts.length} published blog posts`);

    // Fetch all categories
    const { data: categories, error: catError } = await supabase
      .from('blog_categories')
      .select('slug, updated_at');

    if (catError) {
      console.error('⚠️  Error fetching categories:', catError);
    }

    // Fetch all tags
    const { data: tags, error: tagError } = await supabase
      .from('blog_tags')
      .select('slug, updated_at');

    if (tagError) {
      console.error('⚠️  Error fetching tags:', tagError);
    }

    // Read existing sitemap
    const sitemapPath = join(__dirname, '../public/sitemap.xml');
    let sitemap = readFileSync(sitemapPath, 'utf-8');

    // Remove old blog entries
    sitemap = sitemap.replace(/\s*<!-- Blog Section Start -->[\s\S]*?<!-- Blog Section End -->/g, '');
    sitemap = sitemap.replace(/\s*<!-- Blog Posts Start -->[\s\S]*?<!-- Blog Posts End -->/g, '');

    // Generate blog post entries
    let blogEntries = '\n  <!-- Blog Section Start -->\n';
    
    // Add blog home
    blogEntries += `  <url>
    <loc>${SITE_URL}/blog</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>\n`;

    // Add categories
    if (categories && categories.length > 0) {
      categories.forEach(cat => {
        blogEntries += `  <url>
    <loc>${SITE_URL}/blog/category/${cat.slug}</loc>
    <lastmod>${cat.updated_at || new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>\n`;
      });
    }

    // Add tags
    if (tags && tags.length > 0) {
      tags.forEach(tag => {
        blogEntries += `  <url>
    <loc>${SITE_URL}/blog/tag/${tag.slug}</loc>
    <lastmod>${tag.updated_at || new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>\n`;
      });
    }

    blogEntries += '  <!-- Blog Section End -->\n';
    blogEntries += '  <!-- Blog Posts Start -->\n';

    // Add individual blog posts
    posts.forEach(post => {
      const lastmod = post.updated_at || post.published_at || post.created_at;
      blogEntries += `  <url>
    <loc>${SITE_URL}/blog/post/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>\n`;
    });

    blogEntries += '  <!-- Blog Posts End -->\n';

    // Insert before closing </urlset>
    sitemap = sitemap.replace('</urlset>', `${blogEntries}</urlset>`);

    // Write updated sitemap
    writeFileSync(sitemapPath, sitemap, 'utf-8');

    console.log('✅ Sitemap updated successfully!');
    console.log(`📊 Added ${posts.length} blog posts`);
    console.log(`📁 Added ${categories?.length || 0} categories`);
    console.log(`🏷️  Added ${tags?.length || 0} tags`);
    console.log(`📍 Sitemap location: ${sitemapPath}`);

  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    process.exit(1);
  }
}

// Run the script
generateBlogSitemap();
