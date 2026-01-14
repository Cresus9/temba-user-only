# Blog SEO Configuration

This document explains how the blog is optimized for search engines (Google, Bing, etc.).

## 📋 What's Configured

### 1. **Sitemap Files**

- **`/public/sitemap.xml`** - Main sitemap with core pages
- **`/public/blog-sitemap.xml`** - Dedicated blog sitemap (auto-generated)
- **`/public/blog-rss.xml`** - RSS feed for blog posts

### 2. **Robots.txt**

Located at `/public/robots.txt`, tells search engines:
- ✅ Allow all pages to be crawled
- 📍 Points to main sitemap
- 📍 Points to blog sitemap
- ⏱️ Crawl delay: 1 second (prevents server overload)

### 3. **Meta Tags (Automatic)**

Every blog post automatically includes:
- **Title tag** - Optimized for search
- **Meta description** - From post excerpt
- **Meta keywords** - From admin-defined keywords
- **Open Graph tags** - For social media sharing
- **Twitter Card tags** - For Twitter previews
- **Canonical URL** - Prevents duplicate content
- **JSON-LD structured data** - Rich snippets in search results

### 4. **Structured Data**

Blog posts include JSON-LD markup for:
- Article type
- Author information
- Publication date
- Featured image
- Publisher (Temba)

## 🚀 Usage

### Generate Blog Sitemap

Run this command to update the sitemap with latest blog posts:

```bash
npm run generate:blog-sitemap
```

**When to run:**
- After publishing new blog posts
- After updating existing posts
- Before deploying to production
- Weekly (as a scheduled task)

### Verify SEO Setup

1. **Check robots.txt:**
   ```
   https://tembas.com/robots.txt
   ```

2. **Check main sitemap:**
   ```
   https://tembas.com/sitemap.xml
   ```

3. **Check blog sitemap:**
   ```
   https://tembas.com/blog-sitemap.xml
   ```

4. **Check RSS feed:**
   ```
   https://tembas.com/blog-rss.xml
   ```

### Submit to Search Engines

#### Google Search Console
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property: `https://tembas.com`
3. Submit sitemap: `https://tembas.com/sitemap.xml`
4. Submit blog sitemap: `https://tembas.com/blog-sitemap.xml`

#### Bing Webmaster Tools
1. Go to [Bing Webmaster](https://www.bing.com/webmasters)
2. Add site: `https://tembas.com`
3. Submit sitemaps (same as Google)

## 📊 SEO Best Practices

### For Blog Posts

1. **Title (60 characters max)**
   - Include main keyword
   - Make it compelling
   - Unique for each post

2. **Meta Description (160 characters max)**
   - Summarize the post
   - Include keywords naturally
   - Call to action

3. **Keywords**
   - 5-10 relevant keywords
   - Mix of broad and specific
   - Location-based (Ouagadougou, Burkina Faso)

4. **Featured Image**
   - Always add one
   - Optimized size (< 200KB)
   - Descriptive alt text

5. **URL (Slug)**
   - Short and descriptive
   - Include main keyword
   - Use hyphens, not underscores

6. **Content**
   - Minimum 300 words
   - Use headings (H2, H3)
   - Include internal links
   - Add external authoritative links

### Internal Linking

Link to:
- Related blog posts
- Relevant event pages
- Category/tag pages

### Performance

- Images optimized
- Lazy loading enabled
- Fast page load (< 3s)

## 🔍 Monitoring

### Track These Metrics

1. **Google Search Console**
   - Impressions
   - Clicks
   - Average position
   - Click-through rate (CTR)

2. **Google Analytics**
   - Organic traffic
   - Bounce rate
   - Time on page
   - Pages per session

### Tools

- [Google Search Console](https://search.google.com/search-console)
- [Google Analytics](https://analytics.google.com)
- [Bing Webmaster Tools](https://www.bing.com/webmasters)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Schema Markup Validator](https://validator.schema.org/)

## 🐛 Troubleshooting

### Posts Not Appearing in Search

1. **Run sitemap generator:**
   ```bash
   npm run generate:blog-sitemap
   ```

2. **Submit to Search Console**

3. **Check robots.txt** - Make sure blog is allowed

4. **Verify post status** - Must be "PUBLISHED"

5. **Wait 1-2 weeks** - Google needs time to crawl

### Checking Indexation

In Google:
```
site:tembas.com/blog
```

For specific post:
```
site:tembas.com/blog/post/your-slug
```

## 📝 Checklist for New Posts

- [ ] Title optimized (60 chars)
- [ ] Meta description added (160 chars)
- [ ] 5-10 keywords added
- [ ] Featured image uploaded with alt text
- [ ] Slug is SEO-friendly
- [ ] Content is 300+ words
- [ ] Headings used (H2, H3)
- [ ] Internal links added
- [ ] Published (not draft)
- [ ] Run `npm run generate:blog-sitemap`
- [ ] Submit to Search Console

## 🚀 Automation

### Scheduled Sitemap Generation

Add to CI/CD pipeline:

```yaml
# .github/workflows/update-sitemap.yml
name: Update Sitemap
on:
  schedule:
    - cron: '0 0 * * 0' # Weekly on Sunday
  workflow_dispatch: # Manual trigger

jobs:
  update-sitemap:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run generate:blog-sitemap
      - name: Commit sitemap
        run: |
          git config user.name "Bot"
          git config user.email "bot@tembas.com"
          git add public/blog-sitemap.xml
          git commit -m "chore: update blog sitemap" || true
          git push
```

## 📚 Resources

- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Schema.org Article](https://schema.org/Article)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)

---

**Last Updated:** January 14, 2026
**Maintained by:** Temba Development Team
