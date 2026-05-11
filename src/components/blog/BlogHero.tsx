import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { BlogPost } from '../../services/blogService';

interface BlogHeroProps {
  post: BlogPost;
}

const monoFamily = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const displayFamily = '"Plus Jakarta Sans", Inter, sans-serif';

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export default function BlogHero({ post }: BlogHeroProps) {
  const featuredImage = post.featured_image || post.featured_image_url;

  return (
    <section className="relative bg-cream bg-grain overflow-hidden border-b border-line">
      {/* Brand glow halos */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 w-[480px] h-[480px] rounded-full bg-brand-50 blur-3xl opacity-70"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-32 -left-32 w-[340px] h-[340px] rounded-full bg-accent-50 blur-3xl opacity-60"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-8 lg:gap-12 items-center">
          {/* ── Copy ── */}
          <div className="order-2 lg:order-1">
            {/* Featured eyebrow */}
            <p
              className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-paper border border-line shadow-card text-[10px] font-bold uppercase tracking-[0.22em] text-brand mb-4"
              style={{ fontFamily: monoFamily }}
            >
              <Sparkles className="h-3 w-3 text-accent" strokeWidth={2.5} />
              Article à la une
            </p>

            {/* Category */}
            {post.category && (
              <Link
                to={`/blog/category/${post.category.slug}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-paper ring-1 ring-line text-[10px] font-bold uppercase tracking-[0.16em] text-ink hover:text-brand hover:ring-brand transition-colors mb-5"
                style={{ fontFamily: monoFamily }}
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: post.category.color || '#3D3FE2' }}
                />
                {post.category.name}
              </Link>
            )}

            {/* Title */}
            <h1
              className="text-[clamp(28px,4.4vw,44px)] font-bold text-ink leading-[1.06] tracking-tight mb-4"
              style={{ fontFamily: displayFamily }}
            >
              {post.title}
            </h1>

            {/* Excerpt */}
            {post.excerpt && (
              <p className="text-[16px] sm:text-[17px] text-ink-mute leading-relaxed mb-6 max-w-xl">
                {post.excerpt}
              </p>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-4 mb-7">
              {post.author && (
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-brand-50 ring-1 ring-brand-100 grid place-items-center text-[12px] font-bold text-brand flex-shrink-0">
                    {post.author.avatar_url ? (
                      <img
                        src={post.author.avatar_url}
                        alt={post.author.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      (post.author.name?.charAt(0) || 'T').toUpperCase()
                    )}
                  </div>
                  <span className="text-[13px] font-semibold text-ink">
                    {post.author.name || 'Temba'}
                  </span>
                </div>
              )}

              <span aria-hidden className="hidden sm:block w-px h-5 bg-line" />

              <div
                className="flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-mute"
                style={{ fontFamily: monoFamily }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-brand" strokeWidth={2.5} />
                  <span className="tabular-nums">
                    {formatDate(post.published_at || post.created_at)}
                  </span>
                </span>

                {post.read_time_minutes && (
                  <>
                    <span className="text-ink-mute/40">·</span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-brand" strokeWidth={2.5} />
                      <span className="tabular-nums">
                        {post.read_time_minutes} min de lecture
                      </span>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* CTA */}
            <Link
              to={`/blog/post/${post.slug}`}
              className="inline-flex items-center gap-2 px-5 py-3 bg-brand text-paper text-[14px] font-bold rounded-xl2 hover:bg-brand-700 active:bg-brand-800 transition-colors shadow-card group"
            >
              Lire l'article
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* ── Image ── */}
          <Link
            to={`/blog/post/${post.slug}`}
            className="order-1 lg:order-2 group block"
          >
            <div className="relative overflow-hidden rounded-[20px] border border-line shadow-card bg-cream">
              {featuredImage ? (
                <img
                  src={featuredImage}
                  alt={post.featured_image_alt || post.title}
                  className="w-full aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="w-full aspect-[4/3] bg-cream-deep grid place-items-center">
                  <span
                    className="text-[120px] font-bold text-brand/20"
                    style={{ fontFamily: displayFamily }}
                  >
                    {post.title.charAt(0)}
                  </span>
                </div>
              )}

              {/* Tiny "Admit one" stamp at top-right */}
              <span
                className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ink/85 backdrop-blur text-paper text-[10px] font-bold uppercase tracking-[0.18em] ring-1 ring-paper/15"
                style={{ fontFamily: monoFamily }}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
                Temba · Blog
              </span>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
