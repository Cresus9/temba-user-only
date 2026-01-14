import React from 'react';
import { Helmet } from 'react-helmet-async';
import { BlogPost } from '../../services/blogService';

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  post?: BlogPost;
}

export default function SEOHead({ title, description, image, url, type = 'article', post }: SEOHeadProps) {
  // Use individual props if provided, otherwise use post object
  const pageTitle = title || post?.meta_title || post?.title || 'Temba Blog';
  const pageDescription = description || post?.meta_description || post?.excerpt || post?.title || '';
  const pageImage = image || post?.featured_image || '';
  const pageUrl = url ? `${window.location.origin}${url}` : post ? `${window.location.origin}/blog/post/${post.slug}` : window.location.href;
  const keywords = post?.meta_keywords || '';

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="title" content={pageTitle} />
      <meta name="description" content={pageDescription} />
      {keywords && <meta name="keywords" content={keywords} />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      {pageImage && <meta property="og:image" content={pageImage} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={pageUrl} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      {pageImage && <meta name="twitter:image" content={pageImage} />}

      {/* Article Meta (only if post is provided) */}
      {post?.published_at && (
        <meta property="article:published_time" content={post.published_at} />
      )}
      {post?.updated_at && (
        <meta property="article:modified_time" content={post.updated_at} />
      )}
      {post?.author && (
        <meta property="article:author" content={post.author.name} />
      )}
      {post?.category && (
        <meta property="article:section" content={post.category.name} />
      )}
      {post?.tags && post.tags.length > 0 && (
        <>
          {post.tags.map((tag) => (
            <meta key={tag.id} property="article:tag" content={tag.name} />
          ))}
        </>
      )}

      {/* Canonical URL */}
      <link rel="canonical" href={pageUrl} />

      {/* JSON-LD Structured Data (only if post is provided) */}
      {post && (
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.title,
            description: pageDescription,
            image: pageImage,
            datePublished: post.published_at,
            dateModified: post.updated_at,
            author: post.author
              ? {
                  '@type': 'Person',
                  name: post.author.name,
                  email: post.author.email
                }
              : undefined,
            publisher: {
              '@type': 'Organization',
              name: 'Temba'
            },
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': pageUrl
            }
          })}
        </script>
      )}
    </Helmet>
  );
}
