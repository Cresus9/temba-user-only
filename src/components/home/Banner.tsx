import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import toast from 'react-hot-toast';

interface BannerData {
  id: string;
  title: string;
  image_url: string;
  link?: string;
  description?: string;
  event_id?: string;
}

export default function Banner() {
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBanners();
  }, []);

  useEffect(() => {
    // Auto-advance banner every 5 seconds
    const interval = setInterval(() => {
      if (banners.length > 1) {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [banners.length]);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('banners')
        .select(`
          id,
          title,
          image_url,
          link,
          description,
          event_id
        `)
        .eq('active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des bannières:', error);
      toast.error('Échec du chargement des bannières');
    } finally {
      setLoading(false);
    }
  };

  const nextBanner = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const prevBanner = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleBannerClick = () => {
    const banner = banners[currentIndex];
    if (banner.event_id) {
      navigate(`/events/${banner.event_id}`);
    } else if (banner.link) {
      navigate(banner.link);
    }
  };

  if (loading || banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];
  const isClickable = currentBanner.event_id || currentBanner.link;

  return (
    <div className="relative w-full h-[220px] md:h-[280px] bg-ink overflow-hidden">
      {/* Banner Image */}
      <div
        className={`absolute inset-0 ${isClickable ? 'cursor-pointer' : ''}`}
        onClick={isClickable ? handleBannerClick : undefined}
      >
        <img
          src={currentBanner.image_url}
          alt={currentBanner.title}
          className="w-full h-full object-cover transition-opacity duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div
        className={`absolute inset-0 flex items-end ${isClickable ? 'cursor-pointer' : ''}`}
        onClick={isClickable ? handleBannerClick : undefined}
      >
        <div className="max-w-7xl mx-auto w-full px-4 lg:px-6 py-6 md:py-8">
          <div className="max-w-xl">
            <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-accent mb-2">
              À l'affiche
            </p>
            <h2 className="text-paper mb-2 !text-[20px] md:!text-[26px] !leading-tight" style={{ fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}>
              {currentBanner.title}
            </h2>
            {currentBanner.description && (
              <p className="text-[14px] md:text-[15px] text-paper/80 mb-4 line-clamp-2">{currentBanner.description}</p>
            )}
            {isClickable && (
              <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand text-paper text-[13px] font-semibold rounded-xl hover:bg-brand-700 transition-colors shadow-card">
                Obtenir des billets
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prevBanner(); }}
            className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 grid place-items-center w-9 h-9 rounded-full bg-paper/15 backdrop-blur-md text-paper hover:bg-paper hover:text-ink transition-colors"
            aria-label="Bannière précédente"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); nextBanner(); }}
            className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 grid place-items-center w-9 h-9 rounded-full bg-paper/15 backdrop-blur-md text-paper hover:bg-paper hover:text-ink transition-colors"
            aria-label="Bannière suivante"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 right-4 md:right-6 flex gap-1.5">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentIndex ? 'bg-accent w-6' : 'bg-paper/40 w-1.5 hover:bg-paper/60'
              }`}
              aria-label={`Aller à la bannière ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}