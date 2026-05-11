import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Eye,
  ChevronRight,
  ArrowLeft,
  ArrowUp,
  Tag as TagIcon,
} from 'lucide-react';
import {
  blogService,
  BlogPost as BlogPostType,
} from '../../services/blogService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import BlogPostContent, {
  extractBlogHeadings,
} from '../../components/blog/BlogPostContent';
import BlogCommentSection from '../../components/blog/BlogCommentSection';
import RelatedPostsSection from '../../components/blog/RelatedPostsSection';
import SocialShareButtons from '../../components/blog/SocialShareButtons';
import NewsletterSignupBox from '../../components/blog/NewsletterSignupBox';
import TableOfContents from '../../components/blog/TableOfContents';
import ReadingProgressBar from '../../components/blog/ReadingProgressBar';
import SEOHead from '../../components/blog/SEOHead';

const monoFamily =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const displayFamily = '"Plus Jakarta Sans", Inter, sans-serif';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user } = useAuth();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTopBtn, setShowTopBtn] = useState(false);

  const articleRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    loadPost();
    window.scrollTo({ top: 0, behavior: 'auto' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // "Back to top" visibility
  useEffect(() => {
    const onScroll = () => setShowTopBtn(window.scrollY > 720);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const loadPost = async () => {
    if (!slug) return;
    try {
      setLoading(true);
      const postData = await blogService.getPostBySlug(slug);
      if (!postData) {
        toast.error('Article introuvable');
        navigate('/blog');
        return;
      }
      if (postData.featured_image_url && !postData.featured_image) {
        postData.featured_image = postData.featured_image_url;
      }
      setPost(postData);
    } catch (error: any) {
      console.error('Error loading post:', error);
      toast.error("Erreur lors du chargement de l'article");
      navigate('/blog');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-paper">
        <div className="border-b border-line bg-cream/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="h-3 w-40 bg-cream-deep rounded animate-pulse" />
          </div>
        </div>
        <div className="bg-cream bg-grain">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 animate-pulse">
            <div className="h-3 w-24 bg-cream-deep rounded mb-4" />
            <div className="h-12 bg-cream-deep w-3/4 rounded mb-4" />
            <div className="h-12 bg-cream-deep w-1/2 rounded mb-6" />
            <div className="h-4 w-2/3 bg-cream-deep rounded" />
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-cream-deep rounded" />
            <div className="h-4 bg-cream-deep rounded" />
            <div className="h-4 bg-cream-deep w-5/6 rounded" />
            <div className="h-4 bg-cream-deep rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) return null;

  const featuredImage = post.featured_image || post.featured_image_url;
  const hasFeaturedImage = Boolean(featuredImage);
  const headingsCount = post.content ? extractBlogHeadings(post.content).length : 0;

  return (
    <div className="min-h-screen bg-paper">
      <ReadingProgressBar targetRef={articleRef} />
      <SEOHead
        title={post.meta_title || post.title}
        description={post.meta_description || post.excerpt || ''}
        image={post.featured_image}
        url={`/blog/post/${post.slug}`}
        type="article"
      />

      {/* ── Breadcrumb strip ── */}
      <div className="border-b border-line bg-cream/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav
            aria-label="Fil d'Ariane"
            className="flex items-center gap-1.5 text-[12px] text-ink-mute"
          >
            <Link to="/" className="hover:text-ink transition-colors">
              Accueil
            </Link>
            <ChevronRight className="w-3 h-3 text-ink-mute/50" />
            <Link to="/blog" className="hover:text-ink transition-colors">
              Blog
            </Link>
            <ChevronRight className="w-3 h-3 text-ink-mute/50" />
            <span className="text-ink font-semibold truncate max-w-[40ch]">
              {post.title}
            </span>
          </nav>
        </div>
      </div>

      {/* ── Hero ── */}
      {hasFeaturedImage ? (
        <CinematicHero
          post={post}
          formatDate={formatDate}
          imageUrl={featuredImage as string}
        />
      ) : (
        <CreamHero post={post} formatDate={formatDate} />
      )}

      {/* ── Body — magazine 3-col layout ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[60px_minmax(0,1fr)_280px] xl:grid-cols-[60px_minmax(0,1fr)_300px] gap-6 lg:gap-10">
          {/* ── Sticky share rail (desktop) ── */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <SocialShareButtons
                url={window.location.href}
                title={post.title}
                variant="rail"
              />
            </div>
          </aside>

          {/* ── Article column ── */}
          <article ref={articleRef} className="min-w-0">
            {/* Mobile-only TOC + share, before the prose */}
            {headingsCount > 0 && (
              <div className="lg:hidden mb-6">
                <TableOfContents
                  content={post.content}
                  variant="disclosure"
                />
              </div>
            )}

            {/* Back to blog */}
            <Link
              to="/blog"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-mute hover:text-brand transition-colors mb-6"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour au blog
            </Link>

            {/* Mobile share row (desktop has the rail) */}
            <div className="lg:hidden mb-6">
              <SocialShareButtons
                url={window.location.href}
                title={post.title}
                variant="inline"
              />
            </div>

            {/* Article body — wrapped to keep a comfortable measure */}
            <div className="max-w-[720px]">
              <BlogPostContent content={post.content} />

              {/* ── Mid/end of article: tags ── */}
              {post.tags && post.tags.length > 0 && (
                <div className="mt-12 pt-8 border-t border-line">
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-mute mb-3"
                    style={{ fontFamily: monoFamily }}
                  >
                    Étiquettes
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <Link
                        key={tag.id}
                        to={`/blog/tag/${tag.slug}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-paper border border-line text-[12px] text-ink hover:border-brand hover:text-brand hover:bg-brand-50 transition-colors"
                      >
                        <TagIcon className="w-3 h-3" strokeWidth={2.5} />
                        {tag.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Bottom share strip ── */}
              <div className="mt-10 pt-8 border-t border-line flex items-center justify-between flex-wrap gap-4">
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.22em] text-ink-mute"
                  style={{ fontFamily: monoFamily }}
                >
                  Vous avez aimé cet article ?
                </p>
                <SocialShareButtons
                  url={window.location.href}
                  title={post.title}
                  variant="inline"
                />
              </div>

              {/* ── Featured newsletter callout ── */}
              <div className="mt-12">
                <NewsletterSignupBox variant="featured" />
              </div>

              {/* ── Author bio ── */}
              {post.author?.bio && (
                <div className="mt-12 bg-cream rounded-xl2 border border-line shadow-card p-5 md:p-6">
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand mb-4"
                    style={{ fontFamily: monoFamily }}
                  >
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent align-middle mr-1.5" />
                    À propos de l'auteur
                  </p>
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-paper ring-1 ring-line grid place-items-center text-[18px] font-bold text-brand flex-shrink-0 overflow-hidden">
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
                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-[16px] font-bold text-ink mb-1.5 tracking-tight"
                        style={{ fontFamily: displayFamily }}
                      >
                        {post.author.name}
                      </h3>
                      <p className="text-[14px] text-ink-mute leading-relaxed mb-3">
                        {post.author.bio}
                      </p>
                      <Link
                        to={`/blog/author/${post.author.id}`}
                        className="inline-flex items-center gap-1 text-[12px] font-bold text-brand hover:text-brand-700 transition-colors"
                      >
                        Tous les articles
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </article>

          {/* ── Sticky aside (desktop) ── */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-5">
              {headingsCount > 0 && <TableOfContents content={post.content} />}
              <NewsletterSignupBox variant="compact" />
            </div>
          </aside>
        </div>
      </div>

      {/* ── Related posts ── */}
      <div className="bg-cream/60 border-t border-line py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RelatedPostsSection postId={post.id} />
        </div>
      </div>

      {/* ── Comments ── */}
      {post.allow_comments && (
        <div className="bg-paper border-t border-line py-12 md:py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <BlogCommentSection postId={post.id} />
          </div>
        </div>
      )}

      {/* ── Back to top floating action ── */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Remonter en haut"
        className={`fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-ink text-paper grid place-items-center shadow-pop hover:bg-brand transition-all ${
          showTopBtn
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Hero variants
   ────────────────────────────────────────────────────────────── */

interface HeroProps {
  post: BlogPostType;
  formatDate: (s: string) => string;
}

function MetaRow({ post, formatDate }: HeroProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em]"
      style={{ fontFamily: monoFamily }}
    >
      <span className="inline-flex items-center gap-1.5">
        <Calendar className="w-3 h-3" strokeWidth={2.5} />
        <span className="tabular-nums">
          {formatDate(post.published_at || post.created_at)}
        </span>
      </span>
      {post.read_time_minutes ? (
        <>
          <span className="opacity-50">·</span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3 h-3" strokeWidth={2.5} />
            <span className="tabular-nums">{post.read_time_minutes} min</span>
          </span>
        </>
      ) : null}
      <span className="opacity-50">·</span>
      <span className="inline-flex items-center gap-1.5">
        <Eye className="w-3 h-3" strokeWidth={2.5} />
        <span className="tabular-nums">{post.view_count || 0} vues</span>
      </span>
    </div>
  );
}

function CinematicHero({
  post,
  formatDate,
  imageUrl,
}: HeroProps & { imageUrl: string }) {
  return (
    <section className="relative bg-ink overflow-hidden">
      {/* Image */}
      <div className="absolute inset-0">
        <img
          src={imageUrl}
          alt={post.featured_image_alt || post.title}
          className="w-full h-full object-cover"
          crossOrigin="anonymous"
        />
        {/* Cinematic gradient scrim */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(20,23,42,0.45) 0%, rgba(20,23,42,0.30) 35%, rgba(20,23,42,0.78) 78%, rgba(20,23,42,0.96) 100%)',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-28 pb-12 md:pb-16 min-h-[420px] md:min-h-[560px] flex flex-col justify-end">
        {/* Eyebrow + category */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-paper/15 backdrop-blur ring-1 ring-paper/20 text-[10px] font-bold uppercase tracking-[0.22em] text-paper"
            style={{ fontFamily: monoFamily }}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
            Article
          </span>
          {post.category && (
            <Link
              to={`/blog/category/${post.category.slug}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-paper/15 backdrop-blur ring-1 ring-paper/20 text-[10px] font-bold uppercase tracking-[0.16em] text-paper hover:bg-paper/25 transition-colors"
              style={{ fontFamily: monoFamily }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: post.category.color || '#C68A1F' }}
              />
              {post.category.name}
            </Link>
          )}
        </div>

        {/* Title */}
        <h1
          className="text-[clamp(30px,5.2vw,56px)] font-bold text-paper leading-[1.04] tracking-tight mb-4 max-w-4xl"
          style={{
            fontFamily: displayFamily,
            textShadow: '0 2px 24px rgba(0,0,0,0.35)',
          }}
        >
          {post.title}
        </h1>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-[16px] sm:text-[18px] text-paper/85 leading-relaxed mb-6 max-w-2xl">
            {post.excerpt}
          </p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-paper/85">
          {post.author && (
            <Link
              to={`/blog/author/${post.author.id}`}
              className="flex items-center gap-2.5 group"
            >
              <div className="w-10 h-10 rounded-full bg-paper/15 backdrop-blur ring-1 ring-paper/25 grid place-items-center text-[13px] font-bold text-paper flex-shrink-0 overflow-hidden">
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
              <div className="leading-tight">
                <p className="text-[13px] font-bold text-paper group-hover:underline">
                  {post.author.name || 'Temba'}
                </p>
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.18em] text-paper/65"
                  style={{ fontFamily: monoFamily }}
                >
                  Auteur
                </p>
              </div>
            </Link>
          )}

          <span aria-hidden className="hidden sm:block w-px h-8 bg-paper/20" />

          <div className="text-paper/85">
            <MetaRow post={post} formatDate={formatDate} />
          </div>
        </div>
      </div>
    </section>
  );
}

function CreamHero({ post, formatDate }: HeroProps) {
  return (
    <section className="relative bg-cream bg-grain overflow-hidden border-b border-line">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 w-[480px] h-[480px] rounded-full bg-brand-50 blur-3xl opacity-70"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-32 -left-32 w-[340px] h-[340px] rounded-full bg-accent-50 blur-3xl opacity-60"
      />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span
            className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand"
            style={{ fontFamily: monoFamily }}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent align-middle mr-1.5" />
            Article
          </span>
          {post.category && (
            <>
              <span className="text-ink-mute/40">·</span>
              <Link
                to={`/blog/category/${post.category.slug}`}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ring-1 ring-line hover:ring-brand text-[10px] font-bold uppercase tracking-[0.16em] text-ink hover:text-brand transition-colors"
                style={{ fontFamily: monoFamily }}
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: post.category.color || '#3D3FE2' }}
                />
                {post.category.name}
              </Link>
            </>
          )}
        </div>

        <h1
          className="text-[clamp(30px,5vw,52px)] font-bold text-ink leading-[1.04] tracking-tight mb-5 max-w-4xl"
          style={{ fontFamily: displayFamily }}
        >
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="text-[16px] sm:text-[18px] text-ink-mute leading-relaxed mb-7 max-w-2xl">
            {post.excerpt}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {post.author && (
            <Link
              to={`/blog/author/${post.author.id}`}
              className="flex items-center gap-2.5 group"
            >
              <div className="w-10 h-10 rounded-full bg-brand-50 ring-1 ring-brand-100 grid place-items-center text-[13px] font-bold text-brand flex-shrink-0 overflow-hidden">
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
              <div className="leading-tight">
                <p className="text-[13px] font-bold text-ink group-hover:text-brand transition-colors">
                  {post.author.name || 'Temba'}
                </p>
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-mute"
                  style={{ fontFamily: monoFamily }}
                >
                  Auteur
                </p>
              </div>
            </Link>
          )}
          <span aria-hidden className="hidden sm:block w-px h-8 bg-line" />
          <div className="text-ink-mute">
            <MetaRow post={post} formatDate={formatDate} />
          </div>
        </div>
      </div>
    </section>
  );
}
