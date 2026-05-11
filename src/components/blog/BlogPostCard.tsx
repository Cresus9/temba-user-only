import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { BlogPost } from '../../services/blogService';

interface BlogPostCardProps {
  post: BlogPost;
}

const monoFamily = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const displayFamily = '"Plus Jakarta Sans", Inter, sans-serif';

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date
    .toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    .replace('.', '');
};

export default function BlogPostCard({ post }: BlogPostCardProps) {
  // Normalize featured image (support both column names)
  const featuredImage = post.featured_image || post.featured_image_url;

  return (
    <Link
      to={`/blog/post/${post.slug}`}
      className="group block bg-paper rounded-xl2 border border-line overflow-hidden shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
    >
      <article className="h-full flex flex-col">
        {/* Featured image */}
        <div className="relative overflow-hidden bg-cream">
          {featuredImage ? (
            <img
              src={featuredImage}
              alt={post.featured_image_alt || post.title}
              className="w-full aspect-[16/10] object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              loading="lazy"
            />
          ) : (
            <div className="w-full aspect-[16/10] flex items-center justify-center bg-cream-deep">
              <span
                className="text-7xl font-bold text-brand/25"
                style={{ fontFamily: displayFamily }}
              >
                {post.title.charAt(0)}
              </span>
            </div>
          )}

          {/* Category badge — paper-stamped style */}
          {post.category && (
            <div className="absolute top-3 left-3">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-paper/95 backdrop-blur ring-1 ring-line text-[10px] font-bold uppercase tracking-[0.16em] text-ink shadow-card"
                style={{ fontFamily: monoFamily }}
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: post.category.color || '#3D3FE2' }}
                />
                {post.category.name}
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 p-5">
          {/* Meta row */}
          <div
            className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-mute mb-3"
            style={{ fontFamily: monoFamily }}
          >
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3 h-3 text-brand" strokeWidth={2.5} />
              <span className="tabular-nums">
                {formatDate(post.published_at || post.created_at)}
              </span>
            </span>
            {post.read_time_minutes && (
              <>
                <span className="text-ink-mute/40">·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-brand" strokeWidth={2.5} />
                  <span className="tabular-nums">{post.read_time_minutes} min</span>
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <h3
            className="text-[18px] font-bold text-ink leading-[1.25] tracking-tight line-clamp-2 mb-2 group-hover:text-brand transition-colors"
            style={{ fontFamily: displayFamily }}
          >
            {post.title}
          </h3>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-[14px] text-ink-mute leading-relaxed line-clamp-2 mb-4">
              {post.excerpt}
            </p>
          )}

          {/* Footer — author + read more */}
          <div className="mt-auto flex items-center justify-between pt-3 border-t border-line">
            {post.author ? (
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-brand-50 ring-1 ring-brand-100 grid place-items-center text-[11px] font-bold text-brand flex-shrink-0">
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
                <span className="text-[12px] font-semibold text-ink truncate">
                  {post.author.name || 'Temba'}
                </span>
              </div>
            ) : (
              <span />
            )}

            <span className="inline-flex items-center gap-1 text-[12px] font-bold text-brand opacity-0 group-hover:opacity-100 transition-opacity">
              Lire
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
