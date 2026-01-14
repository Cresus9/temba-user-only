# Blog Route Not Working in Production - Fix Guide

## Issue
`https://tembas.com/blog` returns 404 or doesn't load properly in production.

## Root Causes & Solutions

### ✅ Solution 1: Clear Netlify Cache & Redeploy

The most common issue is cached deployment. Here's how to fix:

1. **Clear Build Cache:**
   - Go to Netlify Dashboard
   - Select your site
   - Go to **Site settings** → **Build & deploy** → **Build settings**
   - Click **Clear build cache**

2. **Trigger New Deploy:**
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Clear cache and deploy site**

3. **Wait for deployment** to complete

### ✅ Solution 2: Verify Build Output

Check that blog routes are included in build:

```bash
npm run build
```

Check `dist/` folder - ensure it contains:
- `index.html`
- JavaScript bundles
- Assets

### ✅ Solution 3: Update Netlify Configuration

Your current `_redirects` is correct, but let's ensure it's comprehensive:

**File: `/public/_redirects`**
```
# API routes (if any) - exclude from SPA redirect
/api/* https://your-api.com/:splat 200

# Blog static files
/blog-sitemap.xml /blog-sitemap.xml 200
/blog-rss.xml /blog-rss.xml 200

# SPA fallback - MUST be last
/* /index.html 200
```

### ✅ Solution 4: Check Environment Variables

Ensure all required env vars are set in Netlify:

1. Go to **Site settings** → **Environment variables**
2. Verify these exist:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - Any other `VITE_*` variables

### ✅ Solution 5: Test Build Locally

```bash
# Build locally
npm run build

# Preview production build
npm run preview

# Visit http://localhost:4173/blog
# Should work if build is correct
```

### ✅ Solution 6: Check Browser Console

If page loads but shows errors:

1. Open browser DevTools (F12)
2. Check **Console** tab for JavaScript errors
3. Check **Network** tab for failed requests

Common issues:
- CORS errors → Check Supabase settings
- CSP errors → Update Netlify headers
- 404 on assets → Build/deploy issue

### ✅ Solution 7: Update Content Security Policy

If you see CSP errors, update `netlify.toml`:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self' https://uwmlagvsivxqocklxbbo.supabase.co https://images.unsplash.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data: blob:; connect-src 'self' https://uwmlagvsivxqocklxbbo.supabase.co wss://uwmlagvsivxqocklxbbo.supabase.co https://api.stripe.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; frame-src https://js.stripe.com;"
```

### ✅ Solution 8: Verify Routes Are Registered

Check `src/routes/index.tsx` includes blog routes:

```tsx
<Route path="/blog" element={<BlogHome />} />
<Route path="/blog/post/:slug" element={<BlogPost />} />
// ... other blog routes
```

## 🚀 Quick Fix Steps

1. **Push latest code:**
   ```bash
   git add .
   git commit -m "fix: ensure blog routes in production"
   git push
   ```

2. **In Netlify Dashboard:**
   - Deploys → Trigger deploy → **Clear cache and deploy site**

3. **Wait 2-3 minutes** for deployment

4. **Test:** Visit `https://tembas.com/blog`

## 🔍 Debugging Checklist

- [ ] Latest code is pushed to Git
- [ ] Netlify build succeeded (no errors)
- [ ] `_redirects` file exists in `public/` folder
- [ ] Environment variables are set in Netlify
- [ ] Build cache is cleared
- [ ] Browser cache is cleared (Ctrl+Shift+R)
- [ ] No console errors in browser DevTools
- [ ] Blog routes work locally (`npm run build && npm run preview`)

## 📞 Still Not Working?

If blog still doesn't work after all steps:

1. **Check Netlify Deploy Log:**
   - Deploys → Click latest deploy → View deploy log
   - Look for errors during build

2. **Check Function Logs** (if using Netlify Functions)

3. **Test with Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   netlify dev
   ```

4. **Contact Support:**
   - Provide deploy log
   - Provide browser console errors
   - Provide steps you've tried

## 🎯 Expected Result

After fix:
- ✅ `https://tembas.com/blog` → Shows blog home
- ✅ `https://tembas.com/blog/post/[slug]` → Shows blog post
- ✅ `https://tembas.com/blog/category/[slug]` → Shows category
- ✅ No 404 errors
- ✅ No console errors

---

**Last Updated:** January 14, 2026
