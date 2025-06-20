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
    <div className="relative w-full h-[400px] bg-gray-900">
      {/* Banner Image */}
      <div 
        className={`absolute inset-0 ${isClickable ? 'cursor-pointer' : ''}`}
        onClick={isClickable ? handleBannerClick : undefined}
      >
        <img
          src={currentBanner.image_url}
          alt={currentBanner.title}
          className="w-full h-full object-cover opacity-70 transition-opacity duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
      </div>

      {/* Banner Content */}
      <div 
        className={`absolute inset-0 flex items-end ${isClickable ? 'cursor-pointer' : ''}`}
        onClick={isClickable ? handleBannerClick : undefined}
      >
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold text-white mb-4">{currentBanner.title}</h2>
            {currentBanner.description && (
              <p className="text-lg text-gray-200 mb-6">{currentBanner.description}</p>
            )}
            {isClickable && (
              <button
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Obtenir des billets
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      {banners.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevBanner();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/75 transition-colors"
            aria-label="Bannière précédente"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextBanner();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/75 transition-colors"
            aria-label="Bannière suivante"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Dots Navigation */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? 'bg-white w-4' : 'bg-white/50'
              }`}
              aria-label={`Aller à la bannière ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}