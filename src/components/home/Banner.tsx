import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../../lib/supabase-client';
import { queryCache, TTL } from '../../utils/queryCache';
import toast from 'react-hot-toast';

interface BannerData {
  id: string;
  title: string;
  image_url: string;
  link?: string;
  description?: string;
  event_id?: string;
}

const monoFamily = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const displayFamily = '"Plus Jakarta Sans", Inter, sans-serif';

export default function Banner() {
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBanners();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (banners.length > 1) {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const data = await queryCache.get('banners:active', TTL.BANNERS, async () => {
        const { data, error } = await supabase
          .from('banners')
          .select(`id, title, image_url, link, description, event_id`)
          .eq('active', true)
          .order('display_order', { ascending: true });
        if (error) throw error;
        return data || [];
      });
      setBanners(data);
    } catch (error) {
      console.error('Erreur lors du chargement des bannières:', error);
      toast.error('Échec du chargement des bannières');
    } finally {
      setLoading(false);
    }
  };

  const nextBanner = () =>
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  const prevBanner = () =>
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);

  const handleBannerClick = () => {
    const banner = banners[currentIndex];
    if (banner.event_id) navigate(`/events/${banner.event_id}`);
    else if (banner.link) navigate(banner.link);
  };

  if (loading || banners.length === 0) return null;

  const currentBanner = banners[currentIndex];
  const isClickable = !!(currentBanner.event_id || currentBanner.link);

  return (
    <section className="relative">
      {/* Outer card */}
      <div className="relative rounded-[20px] overflow-hidden border border-line bg-paper shadow-card">
        <div className="grid md:grid-cols-[1fr_1.4fr] min-h-[260px] md:min-h-[300px]">
          {/* ── Left: text card ── */}
          <div
            className={`relative flex flex-col justify-between p-5 sm:p-6 md:p-7 bg-cream bg-grain ${
              isClickable ? 'cursor-pointer' : ''
            }`}
            onClick={isClickable ? handleBannerClick : undefined}
          >
            {/* Top: eyebrow + counter */}
            <div className="flex items-center justify-between">
              <p
                className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-brand"
                style={{ fontFamily: monoFamily }}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
                À l'affiche
              </p>
              {banners.length > 1 && (
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-mute tabular-nums"
                  style={{ fontFamily: monoFamily }}
                >
                  {String(currentIndex + 1).padStart(2, '0')} /{' '}
                  {String(banners.length).padStart(2, '0')}
                </p>
              )}
            </div>

            {/* Middle: title + description — animate on slide change */}
            <div className="my-5 overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentBanner.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h2
                    className="text-[22px] sm:text-[26px] md:text-[28px] font-bold text-ink leading-[1.12] tracking-tight line-clamp-3"
                    style={{ fontFamily: displayFamily }}
                  >
                    {currentBanner.title}
                  </h2>
                  {currentBanner.description && (
                    <p className="mt-2 text-[13.5px] sm:text-[14px] text-ink-mute leading-relaxed line-clamp-3">
                      {currentBanner.description}
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Bottom: CTA + slide dots */}
            <div className="flex items-center justify-between gap-3">
              {isClickable ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBannerClick();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand text-paper text-[13px] font-bold rounded-xl2 hover:bg-brand-700 active:bg-brand-800 transition-colors shadow-card"
                >
                  Obtenir des billets
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <span />
              )}

              {banners.length > 1 && (
                <div className="flex items-center gap-1.5">
                  {banners.map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentIndex(index);
                      }}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        index === currentIndex
                          ? 'bg-brand w-6'
                          : 'bg-line-strong w-1.5 hover:bg-ink-mute/60'
                      }`}
                      aria-label={`Bannière ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right: image (clean, no overlay) ── */}
          <div
            className={`relative bg-ink overflow-hidden ${
              isClickable ? 'cursor-pointer' : ''
            }`}
            onClick={isClickable ? handleBannerClick : undefined}
            style={{ minHeight: '180px' }}
          >
            {/* Blurred backdrop — fills the letterbox space when the image
                aspect ratio doesn't match the container. */}
            <div
              aria-hidden
              className="absolute inset-0 scale-110"
              style={{
                backgroundImage: `url(${currentBanner.image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(28px) saturate(140%)',
              }}
            />
            <div aria-hidden className="absolute inset-0 bg-ink/35" />

            {/* Foreground image — animated crossfade on slide change */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.img
                key={currentBanner.id}
                src={currentBanner.image_url}
                alt={currentBanner.title}
                className="absolute inset-0 w-full h-full object-contain object-center"
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                loading="lazy"
              />
            </AnimatePresence>

            {/* Vertical seam — soft connection between text card & image */}
            <div
              aria-hidden
              className="hidden md:block absolute left-0 inset-y-0 w-6 pointer-events-none"
              style={{
                background:
                  'linear-gradient(90deg, rgba(250,247,242,0.95) 0%, rgba(250,247,242,0) 100%)',
              }}
            />

            {/* Carousel arrows — only when multiple banners */}
            {banners.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevBanner();
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 grid place-items-center w-9 h-9 rounded-full bg-paper/90 text-ink hover:bg-paper hover:scale-105 active:scale-95 transition-all shadow-card backdrop-blur-md"
                  aria-label="Bannière précédente"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextBanner();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center w-9 h-9 rounded-full bg-paper/90 text-ink hover:bg-paper hover:scale-105 active:scale-95 transition-all shadow-card backdrop-blur-md"
                  aria-label="Bannière suivante"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}

            {/* Mini "Admit one" tag — subtle brand stamp */}
            <span
              className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ink/85 backdrop-blur text-paper text-[10px] font-bold uppercase tracking-[0.18em] ring-1 ring-paper/15"
              style={{ fontFamily: monoFamily }}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
              Temba · live
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
