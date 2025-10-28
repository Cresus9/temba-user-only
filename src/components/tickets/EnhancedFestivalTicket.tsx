import React, { useState } from 'react';
import { Calendar, MapPin, Clock, User, Ticket, Star, Shield, Send } from 'lucide-react';
import ResponsiveQRCode from './ResponsiveQRCode';
import TransferTicketModal from './TransferTicketModal';

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
  ticketStatus?: string; // NEW: Add ticket status prop
  scannedAt?: string; // NEW: Add scan timestamp
  scannedBy?: string; // NEW: Add scanner name
  scanLocation?: string; // NEW: Add scan location
  onTransferComplete?: () => void;
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
  specialInstructions,
  ticketStatus = 'VALID', // NEW: Default to VALID
  scannedAt, // NEW: Add scan timestamp
  scannedBy, // NEW: Add scanner name
  scanLocation, // NEW: Add scan location
  onTransferComplete
}: EnhancedFestivalTicketProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);


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
    <div className={`relative max-w-4xl mx-auto px-2 sm:px-4 ${className}`}>
      {/* Ticket Status Banner - Show for all tickets */}
      <div className={`mb-4 p-4 rounded-xl border ${
        ticketStatus === 'USED' 
          ? 'bg-green-50 border-green-200' 
          : ticketStatus === 'VALID'
          ? 'bg-blue-50 border-blue-200'
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              ticketStatus === 'USED' 
                ? 'bg-green-500' 
                : ticketStatus === 'VALID'
                ? 'bg-blue-500'
                : 'bg-yellow-500'
            }`}>
              {ticketStatus === 'USED' ? (
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : ticketStatus === 'VALID' ? (
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className={`font-medium ${
              ticketStatus === 'USED' 
                ? 'text-green-800' 
                : ticketStatus === 'VALID'
                ? 'text-blue-800'
                : 'text-yellow-800'
            }`}>
              {ticketStatus === 'USED' 
                ? 'Billet utilisé' 
                : ticketStatus === 'VALID'
                ? 'Billet valide'
                : 'Billet non valide'}
            </span>
          </div>
          <div className={`text-right text-sm ${
            ticketStatus === 'USED' 
              ? 'text-green-700' 
              : ticketStatus === 'VALID'
              ? 'text-blue-700'
              : 'text-yellow-700'
          }`}>
            {ticketStatus === 'USED' ? (
              <>
                {scanLocation ? (
                  <div>Scanné à {scanLocation}</div>
                ) : (
                  <div>Scanné à Ticket Scanner</div>
                )}
                {scannedAt ? (
                  <div>
                    {new Date(scannedAt).toLocaleDateString('fr-FR')}, {new Date(scannedAt).toLocaleTimeString('fr-FR')}
                    {scannedBy && ` par ${scannedBy}`}
                  </div>
                ) : (
                  <div>Date de scan non disponible</div>
                )}
              </>
            ) : ticketStatus === 'VALID' ? (
              <div>Prêt à être utilisé</div>
            ) : (
              <div>Statut: {ticketStatus}</div>
            )}
          </div>
        </div>
      </div>


      {/* Ticket Container */}
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        {/* Header with Event Image */}
        <div className="relative h-48 sm:h-56 md:h-64 lg:h-72 overflow-hidden">
          {eventImage && (
            <>
              <img
                src={eventImage}
                alt={eventTitle}
                className={`w-full h-full object-cover object-center transition-all duration-700 ${
                  imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                } sm:scale-100 scale-90`}
                onLoad={() => setImageLoaded(true)}
                loading="lazy"
              />
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 animate-pulse" />
              )}
            </>
          )}
          
          {/* Enhanced Gradient Overlay */}
          <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-80`} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          
          {/* Ticket Type Badge */}
          <div className="absolute top-3 sm:top-6 left-3 sm:left-6">
            <div className={`inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 ${colors.badge} rounded-lg text-xs sm:text-sm font-semibold shadow-lg backdrop-blur-sm border border-white/20 max-w-[calc(50%-0.75rem)] sm:max-w-none`}>
              {ticketType.toLowerCase().includes('vip') && <Star className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />}
              <Ticket className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate sm:truncate-none text-xs sm:text-sm">{ticketType}</span>
            </div>
          </div>

          {/* Price Badge */}
          {price && (
            <div className="absolute top-3 sm:top-6 right-3 sm:right-6">
              <div className="bg-white/95 backdrop-blur-md px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold text-gray-900 shadow-lg border border-white/30 max-w-[calc(50%-0.75rem)] sm:max-w-none">
                <span className="truncate sm:truncate-none block text-xs sm:text-sm">{formatPrice(price, currency)}</span>
              </div>
            </div>
          )}

          {/* Event Title */}
          <div className="absolute bottom-3 sm:bottom-6 left-3 sm:left-6 right-3 sm:right-6">
            <div className="backdrop-blur-sm bg-black/25 rounded-xl p-3 sm:p-4 border border-white/15">
              <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white mb-2 leading-tight break-words drop-shadow-lg line-clamp-2 sm:line-clamp-none">
                {eventTitle}
              </h1>
              <div className="flex flex-col gap-2 text-white/95">
                <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-1.5 backdrop-blur-sm">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium truncate sm:truncate-none">{formatDate(eventDate)}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-1.5 backdrop-blur-sm">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium truncate sm:truncate-none">{eventTime}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ticket Body */}
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {/* Left Column - Essential Info */}
            <div className="space-y-4 sm:space-y-6">
              {/* Ticket Holder */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 sm:h-7 sm:w-7 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-500 font-medium">Détenteur du billet</p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900 capitalize break-words">{ticketHolder}</p>
                  </div>
                </div>
              </div>

              {/* Event Location */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 sm:h-7 sm:w-7 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-500 font-medium mb-2">Lieu de l'événement</p>
                    <p className="text-sm sm:text-base font-semibold text-gray-900 leading-relaxed break-words hyphens-auto line-clamp-3">{eventLocation}</p>
                  </div>
                </div>
              </div>

              {/* Event Date & Time */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 sm:h-7 sm:w-7 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-500 font-medium">Date & Heure</p>
                    <p className="text-sm sm:text-lg font-semibold text-gray-900 break-words">{formatDate(eventDate)}</p>
                    <p className="text-sm sm:text-lg font-semibold text-gray-900 break-words">{eventTime}</p>
                  </div>
                </div>
              </div>

              {/* Ticket ID */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Ticket className="h-5 w-5 sm:h-7 sm:w-7 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-gray-500 font-medium">ID du billet</p>
                      <p className="text-lg sm:text-xl font-mono font-bold text-gray-900 break-all">#{ticketId.slice(0, 8).toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-green-600 flex-shrink-0">
                    <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-xs sm:text-sm font-semibold">Vérifié</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - QR Code */}
            <div className="flex flex-col justify-center h-full">
              <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 lg:p-8 h-full flex flex-col justify-center">
                <div className="text-center mb-4 sm:mb-6 lg:mb-8">
                  <h4 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 mb-2 break-words leading-tight">SCANNER POUR VÉRIFIER</h4>
                  <p className="text-xs sm:text-sm text-gray-600 break-words leading-relaxed">Valable pour une entrée unique</p>
                </div>
                
                <div className="flex-1 flex items-center justify-center">
                  <div 
                    className="bg-gray-50 p-4 sm:p-6 lg:p-8 rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors group relative max-w-full"
                    onClick={() => setShowQRModal(true)}
                    title="Cliquez pour agrandir le QR code"
                  >
                    <ResponsiveQRCode
                      ticketId={ticketId}
                      baseSize={180}
                      level="H"
                      includeMargin={false}
                      fgColor="#000000"
                      bgColor="#ffffff"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/5 rounded-xl">
                      <div className="bg-black/70 text-white px-2 py-1 rounded-full text-xs font-medium">
                        Cliquez pour agrandir
                      </div>
                    </div>
                  </div>
                </div>


                <div className="mt-4 sm:mt-6 lg:mt-8 text-center space-y-3 sm:space-y-4">
                  <p className="text-xs sm:text-sm text-gray-500 font-mono break-all leading-tight">
                    ID: {ticketId.slice(0, 8).toUpperCase()}
                  </p>
                  <div className="inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-green-50 text-green-700 rounded-full text-xs sm:text-sm font-semibold">
                    <Shield className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="break-words leading-tight">Sécurisé & Authentique</span>
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
                <div className={`w-2 h-2 rounded-full ${
                  ticketStatus === 'USED' 
                    ? 'bg-red-400' 
                    : ticketStatus === 'VALID' 
                    ? 'bg-green-400 animate-pulse' 
                    : 'bg-yellow-400'
                }`}></div>
                <span className={`text-sm font-medium ${
                  ticketStatus === 'USED' 
                    ? 'text-red-600' 
                    : ticketStatus === 'VALID' 
                    ? 'text-green-600' 
                    : 'text-yellow-600'
                }`}>
                  {ticketStatus === 'USED' 
                    ? 'Ticket Utilisé' 
                    : ticketStatus === 'VALID' 
                    ? 'Ticket Valide' 
                    : 'Ticket Non Valide'}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Subtle Shadow Effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl opacity-20 blur-xl -z-10"></div>
      
      {/* QR Code Enlargement Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9998] p-4">
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

      {/* Transfer Ticket Modal */}
      <TransferTicketModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        ticketId={ticketId}
        ticketTitle={eventTitle}
        onTransferComplete={() => {
          setShowTransferModal(false);
          onTransferComplete?.();
        }}
      />
    </div>
  );
}
