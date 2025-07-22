import React from 'react';
import { Calendar, MapPin, Clock, User, Send } from 'lucide-react';
import DynamicQRCode from './DynamicQRCode';

interface FestivalTicketProps {
  ticketHolder: string;
  ticketType: string;
  ticketId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventImage?: string;
  qrCode: string;
  onTransfer?: () => void;
  status?: string;
}

export default function FestivalTicket({
  ticketHolder,
  ticketType,
  ticketId,
  eventTitle,
  eventDate,
  eventTime,
  eventLocation,
  eventImage = 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea',
  qrCode,
  onTransfer,
  status = 'VALID'
}: FestivalTicketProps) {
  const canTransfer = status === 'VALID' && onTransfer;

  return (
    <div className="bg-white rounded-lg overflow-hidden">
      {/* Event Banner */}
      <div className="relative h-40 bg-gradient-to-r from-red-800 to-red-600">
        <img
          src={eventImage}
          alt={eventTitle}
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">{eventTitle}</h1>
          <p className="text-lg opacity-90">{eventDate}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Ticket Details */}
        <div className="flex-1 p-6 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500">Type de billet</p>
              <p className="text-xl font-bold">{ticketType}</p>
            </div>
            <div className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-medium">
              #{ticketId.slice(-8).toUpperCase()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-[var(--gray-400)]" />
              <div>
                <p className="text-gray-500">Date</p>
                <p className="font-medium">{eventDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-[var(--gray-400)]" />
              <div>
                <p className="text-gray-500">Heure</p>
                <p className="font-medium">{eventTime}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-[var(--gray-400)]" />
              <div>
                <p className="text-gray-500">Lieu</p>
                <p className="font-medium">{eventLocation}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-[var(--gray-400)]" />
              <div>
                <p className="text-gray-500">Détenteur du billet</p>
                <p className="font-medium">{ticketHolder || 'Non assigné'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="w-full md:w-72 p-6 bg-gray-50 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-[var(--gray-200)]">
          <DynamicQRCode
            ticketId={ticketId}
            size={200}
          />
          <div className="text-center mt-4">
            <p className="font-medium text-[var(--gray-900)]">SCANNER POUR VÉRIFIER</p>
            <p className="text-sm text-gray-500">Valable pour une entrée unique</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--gray-200)]">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-gray-500">Ce billet est non transférable et doit être présenté à l'entrée</p>
            {canTransfer && (
              <button
                onClick={onTransfer}
                className="flex items-center gap-2 px-4 py-2 text-[var(--primary-600)] hover:bg-[var(--primary-50)] rounded-lg transition-colors"
              >
                <Send className="h-5 w-5" />
                Transférer le billet
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
