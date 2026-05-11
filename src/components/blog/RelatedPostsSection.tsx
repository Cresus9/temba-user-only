import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { blogService, BlogPost } from '../../services/blogService';
import BlogPostCard from './BlogPostCard';

interface RelatedPostsSectionProps {
  postId: string;
}

const monoFamily =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const displayFamily = '"Plus Jakarta Sans", Inter, sans-serif';

export default function RelatedPostsSection({ postId }: RelatedPostsSectionProps) {
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRelatedPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const loadRelatedPosts = async () => {
    try {
      setLoading(true);
      const posts = await blogService.getRelatedPosts(postId, 3);
      setRelatedPosts(posts);
    } catch (error: any) {
      console.error('Error loading related posts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <div className="h-3 w-24 bg-cream-deep rounded mb-2 animate-pulse" />
            <div className="h-7 w-72 bg-cream-deep rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-paper rounded-xl2 border border-line overflow-hidden animate-pulse"
            >
              <div className="aspect-[16/10] bg-cream-deep" />
              <div className="p-5 space-y-3">
                <div className="h-3 bg-cream-deep w-1/3 rounded" />
                <div className="h-5 bg-cream-deep w-5/6 rounded" />
                <div className="h-4 bg-cream-deep w-full rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (relatedPosts.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand mb-2"
            style={{ fontFamily: monoFamily }}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent align-middle mr-1.5" />
            À lire aussi
          </p>
          <h2
            className="text-[clamp(22px,3.2vw,30px)] font-bold text-ink leading-[1.15] tracking-tight"
            style={{ fontFamily: displayFamily }}
          >
            Continuez votre lecture
          </h2>
        </div>
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-[13px] font-bold text-ink hover:text-brand transition-colors group"
        >
          Tous les articles
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {relatedPosts.map((post) => (
          <BlogPostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
