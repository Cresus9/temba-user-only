import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, Share2, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase-client';
import { useAuth } from '../context/AuthContext';
import BookingForm from '../components/booking/BookingForm';
import EventMap from '../components/events/EventMap';
import { geocodeAddress } from '../utils/geocoding';
import toast from 'react-hot-toast';
import { Event } from '../types/event';
import PageSEO from '../components/SEO/PageSEO';

interface EventLocation {
  latitude: number;
  longitude: number;
}

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<EventLocation | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        if (!id) return;
        setLoading(true);
        
        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            ticket_types (
              id,
              name,
              description,
              price,
              quantity,
              available,
              max_per_order,
              sales_enabled
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        
        if (data.status !== 'PUBLISHED' && !user) {
          navigate('/events');
          return;
        }
        
        setEvent(data);

        const coordinates = await geocodeAddress(data.location);
        setLocation(coordinates);
      } catch (error) {
        console.error('Erreur lors du chargement de l\'événement:', error);
        toast.error('Échec du chargement des détails de l\'événement');
        navigate('/events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, user, navigate]);

  const eventUrl = useMemo(
    () => (event?.id ? `https://tembas.com/events/${event.id}` : undefined),
    [event?.id]
  );

  const ogImage = useMemo(() => {
    if (!event?.image_url) return undefined;
    return event.image_url.startsWith('http')
      ? event.image_url
      : `https://tembas.com${event.image_url}`;
  }, [event?.image_url]);

  const eventSchema = useMemo(() => {
    if (!event || !eventUrl) return undefined;

    return {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: event.title,
      description: event.description,
      startDate: event.time ? `${event.date}T${event.time}` : event.date,
      eventStatus: 'https://schema.org/EventScheduled',
      image: ogImage ? [ogImage] : undefined,
      location: {
        '@type': 'Place',
        name: event.location,
        address: event.location,
      },
      organizer: {
        '@type': 'Organization',
        name: 'Temba',
        url: 'https://tembas.com/',
      },
      offers: (event.ticket_types || []).map((ticketType) => ({
        '@type': 'Offer',
        url: eventUrl,
        price: ticketType.price,
        priceCurrency: event.currency,
        availability:
          ticketType.available && ticketType.available > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/SoldOut',
      })),
    };
  }, [
    event?.title,
    event?.description,
    event?.time,
    event?.date,
    event?.location,
    event?.ticket_types,
    event?.currency,
    eventUrl,
    ogImage,
  ]);

  const breadcrumbSchema = useMemo(() => {
    if (!eventUrl || !event?.title) return undefined;

    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Accueil',
          item: 'https://tembas.com/',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Événements',
          item: 'https://tembas.com/events',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: event.title,
          item: eventUrl,
        },
      ],
    };
  }, [event?.title, eventUrl]);

  const structuredData = useMemo(() => {
    const data = [];
    if (breadcrumbSchema) data.push(breadcrumbSchema);
    if (eventSchema) data.push(eventSchema);
    return data.length ? data : undefined;
  }, [breadcrumbSchema, eventSchema]);

  const description = useMemo(() => {
    if (!event) return undefined;
    return (
      event.description?.replace(/\s+/g, ' ').trim().slice(0, 160) ||
      `Achetez vos billets pour ${event.title} à ${event.location}.`
    );
  }, [event?.description, event?.title, event?.location]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Événement non trouvé</h2>
      </div>
    );
  }

  return (
    <>
      {eventUrl && (
        <PageSEO
          title={event.title}
          description={description}
          canonicalUrl={eventUrl}
          ogType="event"
          ogImage={ogImage}
          keywords={[
            event.title,
            event.location,
            'billets',
            'événement Burkina Faso',
            'sortir à Ouagadougou',
          ]}
          structuredData={structuredData}
        />
      )}
      <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Event Header */}
      <div className="relative h-[400px] rounded-xl overflow-hidden mb-8">
        <img
          src={event.image_url}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-4">{event.title}</h1>
              <div className="flex items-center gap-6 text-white/90">
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {new Date(event.date).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {event.time}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {event.location}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 bg-white/10 rounded-full hover:bg-white/20">
                <Share2 className="h-6 w-6 text-white" />
              </button>
              <button className="p-2 bg-white/10 rounded-full hover:bg-white/20">
                <Heart className="h-6 w-6 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Mobile Booking Form - Shown right after image on mobile */}
        <div className="lg:hidden">
          <div className="bg-white rounded-xl shadow-sm p-6">
            {event.status === 'PUBLISHED' ? (
              <BookingForm
                eventId={event.id}
                ticketTypes={event.ticket_types || []}
                currency={event.currency}
                onReviewOpen={() => setIsReviewModalOpen(true)}
                onReviewClose={() => setIsReviewModalOpen(false)}
              />
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-600">
                  Cet événement n'est actuellement pas disponible pour la réservation.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Event Details */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">À propos de cet événement</h2>
            <p className="text-gray-600 whitespace-pre-line mb-8">{event.description}</p>

            {/* Location Map */}
            {location && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Lieu de l'événement</h3>
                <EventMap
                  latitude={location.latitude}
                  longitude={location.longitude}
                  title={event.title}
                  address={event.location}
                  className="h-[300px] mb-4"
                  isDisabled={isReviewModalOpen}
                  isModalOpen={isReviewModalOpen}
                />
                <p className="text-gray-600 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  {event.location}
                  {/* Google Maps Button */}
                  <a
                    href={location
                      ? `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 inline-flex items-center px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors"
                  >
                    Voir sur Google Maps
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Booking Form - Hidden on mobile */}
        <div className="hidden lg:block lg:sticky lg:top-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            {event.status === 'PUBLISHED' ? (
              <BookingForm
                eventId={event.id}
                ticketTypes={event.ticket_types || []}
                currency={event.currency}
                onReviewOpen={() => setIsReviewModalOpen(true)}
                onReviewClose={() => setIsReviewModalOpen(false)}
              />
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-600">
                  Cet événement n'est actuellement pas disponible pour la réservation.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}