import React, { useState } from 'react';
import { Calendar, MapPin, Clock, User, Ticket, Star, Shield } from 'lucide-react';
import ResponsiveQRCode from './ResponsiveQRCode';

interface EnhancedFestivalTicketProps {
  ticketHolder: string;
  ticketType: string;
  ticketId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  qrCode: string;
  eventImage?: string;
  price?: number;
  currency?: string;
  className?: string;
  orderNumber?: string;
  purchaseDate?: string;
  eventCategory?: string;
  specialInstructions?: string;
}

export default function EnhancedFestivalTicket({
  ticketHolder,
  ticketType,
  ticketId,
  eventTitle,
  eventDate,
  eventTime,
  eventLocation,
  qrCode,
  eventImage,
  price,
  currency = 'XOF',
  className = '',
  orderNumber,
  purchaseDate,
  eventCategory,
  specialInstructions
}: EnhancedFestivalTicketProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPrice = (amount: number, curr: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getTicketTypeColor = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('vip') || lowerType.includes('premium')) {
      return {
        bg: 'from-amber-400 to-yellow-500',
        text: 'text-amber-900',
        badge: 'bg-amber-100 text-amber-800'
      };
    }
    if (lowerType.includes('standard') || lowerType.includes('général')) {
      return {
        bg: 'from-blue-400 to-indigo-500',
        text: 'text-blue-900',
        badge: 'bg-blue-100 text-blue-800'
      };
    }
    return {
      bg: 'from-purple-400 to-pink-500',
      text: 'text-purple-900',
      badge: 'bg-purple-100 text-purple-800'
    };
  };

  const colors = getTicketTypeColor(ticketType);

  return (
    <div className={`relative max-w-4xl mx-auto ${className}`}>
      {/* Ticket Container */}
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        {/* Header with Event Image */}
        <div className="relative h-48 md:h-56 overflow-hidden">
          {eventImage && (
            <>
              <img
                src={eventImage}
                alt={eventTitle}
                className={`w-full h-full object-cover transition-opacity duration-500 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
              />
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
              )}
            </>
          )}
          
          {/* Gradient Overlay */}
          <div className={`absolute inset-0 bg-gradient-to-r ${colors.bg} opacity-85`} />
          
          {/* Ticket Type Badge */}
          <div className="absolute top-6 left-6">
            <div className={`inline-flex items-center gap-2 px-4 py-2 ${colors.badge} rounded-full text-sm font-semibold shadow-lg`}>
              {ticketType.toLowerCase().includes('vip') && <Star className="h-4 w-4" />}
              <Ticket className="h-4 w-4" />
              {ticketType}
            </div>
          </div>

          {/* Price Badge */}
          {price && (
            <div className="absolute top-6 right-6">
              <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-lg font-bold text-gray-900 shadow-lg">
                {formatPrice(price, currency)}
              </div>
            </div>
          )}

          {/* Event Title */}
          <div className="absolute bottom-6 left-6 right-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
              {eventTitle}
            </h1>
            <div className="flex items-center gap-4 text-white/90">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">{formatDate(eventDate)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">{eventTime}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ticket Body */}
        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Essential Info */}
            <div className="space-y-6">
              {/* Ticket Holder */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center">
                    <User className="h-7 w-7 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Détenteur du billet</p>
                    <p className="text-xl font-bold text-gray-900 capitalize">{ticketHolder}</p>
                  </div>
                </div>
              </div>

              {/* Event Location */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                    <MapPin className="h-7 w-7 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 font-medium mb-1">Lieu de l'événement</p>
                    <p className="text-lg font-semibold text-gray-900 leading-relaxed">{eventLocation}</p>
                  </div>
                </div>
              </div>

              {/* Event Date & Time */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calendar className="h-7 w-7 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Date & Heure</p>
                    <p className="text-lg font-semibold text-gray-900">{formatDate(eventDate)}</p>
                    <p className="text-lg font-semibold text-gray-900">{eventTime}</p>
                  </div>
                </div>
              </div>

              {/* Ticket ID */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                      <Ticket className="h-7 w-7 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">ID du billet</p>
                      <p className="text-xl font-mono font-bold text-gray-900">#{ticketId.slice(0, 8).toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <Shield className="h-5 w-5" />
                    <span className="text-sm font-semibold">Vérifié</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - QR Code */}
            <div className="flex flex-col justify-center h-full">
              <div className="bg-white border border-gray-200 rounded-xl p-8 h-full flex flex-col justify-center">
                <div className="text-center mb-8">
                  <h4 className="text-lg font-bold text-gray-900 mb-2">SCANNER POUR VÉRIFIER</h4>
                  <p className="text-sm text-gray-600">Valable pour une entrée unique</p>
                </div>
                
                <div className="flex-1 flex items-center justify-center">
                  <div 
                    className="bg-gray-50 p-8 rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors group relative"
                    onClick={() => setShowQRModal(true)}
                    title="Cliquez pour agrandir le QR code"
                  >
                    <ResponsiveQRCode
                      ticketId={ticketId}
                      baseSize={220}
                      level="H"
                      includeMargin={false}
                      fgColor="#000000"
                      bgColor="#ffffff"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/5 rounded-xl">
                      <div className="bg-black/70 text-white px-3 py-1 rounded-full text-xs font-medium">
                        Cliquez pour agrandir
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 text-center space-y-4">
                  <p className="text-sm text-gray-500 font-mono">
                    ID: {ticketId.slice(0, 8).toUpperCase()}
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-semibold">
                    <Shield className="h-4 w-4" />
                    Sécurisé & Authentique
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 md:px-8 pb-6">
          <div className="border-t border-gray-200 pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="text-sm text-gray-600">
                <p className="font-medium">Ce billet est non transférable et doit être présenté à l'entrée</p>
                <p>Powered by <span className="font-semibold text-indigo-600">Temba</span></p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-600">Ticket Valide</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Subtle Shadow Effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl opacity-20 blur-xl -z-10"></div>
      
      {/* QR Code Enlargement Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Code QR du billet</h3>
              <p className="text-sm text-gray-600">Présentez ce code à l'entrée</p>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-xl flex justify-center">
              <ResponsiveQRCode
                ticketId={ticketId}
                baseSize={300}
                level="H"
                includeMargin={false}
                fgColor="#000000"
                bgColor="#ffffff"
              />
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500 font-mono mb-4">
                ID: {ticketId.slice(0, 8).toUpperCase()}
              </p>
              <button
                onClick={() => setShowQRModal(false)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
