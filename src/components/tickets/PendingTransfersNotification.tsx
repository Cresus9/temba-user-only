import React, { useState, useEffect } from 'react';
import { Gift, X, CheckCircle, Clock, User, Calendar, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { EnhancedFestivalTicket } from './EnhancedFestivalTicket';

interface PendingTransfer {
  id: string;
  ticket_id: string;
  sender_id: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  recipient_name: string | null;
  message: string | null;
  status: string;
  created_at: string;
  sender: {
    name: string;
    email: string;
  };
  ticket: {
    id: string;
    event_id: string;
    ticket_type_id: string;
    status: string;
    event: {
      title: string;
      date: string;
      venue: string;
    };
  } | null;
}

export default function PendingTransfersNotification() {
  const { pendingTransfers, claimPendingTransfer, checkPendingTransfers } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [claimingTransfer, setClaimingTransfer] = useState<string | null>(null);

  useEffect(() => {
    // Check for pending transfers when component mounts
    checkPendingTransfers();
  }, [checkPendingTransfers]);

  const handleClaimTransfer = async (transferId: string) => {
    setClaimingTransfer(transferId);
    try {
      const success = await claimPendingTransfer(transferId);
      if (success) {
        setIsOpen(false);
      }
    } finally {
      setClaimingTransfer(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!pendingTransfers || pendingTransfers.length === 0) {
    return null;
  }

  return (
    <>
      {/* Notification Badge */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="relative bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
        >
          <Gift className="w-6 h-6" />
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
            {pendingTransfers.length}
          </span>
        </button>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                  <Gift className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Billets en attente
                  </h2>
                  <p className="text-sm text-gray-600">
                    {pendingTransfers.length} billet{pendingTransfers.length > 1 ? 's' : ''} vous attendent
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-6">
                {pendingTransfers.map((transfer: PendingTransfer) => (
                  <div
                    key={transfer.id}
                    className="border border-gray-200 rounded-xl p-6 bg-gradient-to-r from-purple-50 to-pink-50"
                  >
                    {/* Transfer Info */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            De {transfer.sender.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatDate(transfer.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-purple-600">
                        <Clock className="w-4 h-4" />
                        <span>En attente</span>
                      </div>
                    </div>

                    {/* Message */}
                    {transfer.message && (
                      <div className="mb-4 p-3 bg-white rounded-lg border border-purple-200">
                        <p className="text-sm text-gray-700 italic">
                          "{transfer.message}"
                        </p>
                      </div>
                    )}

                    {/* Ticket Preview */}
                    <div className="mb-4">
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        {transfer.ticket?.event ? (
                          <>
                            <div className="flex items-center gap-3 mb-3">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span className="font-semibold text-gray-900">
                                {transfer.ticket.event.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mb-2">
                              <MapPin className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-600">
                                {transfer.ticket.event.venue}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                                {transfer.ticket.ticket_type_id}
                              </span>
                              <span className="text-sm text-gray-500">
                                {transfer.ticket.event.date ? new Date(transfer.ticket.event.date).toLocaleDateString('fr-FR') : 'Date non disponible'}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-4">
                            <div className="text-sm text-gray-500 italic">
                              Détails du billet en cours de chargement...
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              Ticket ID: {transfer.ticket_id}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleClaimTransfer(transfer.id)}
                        disabled={claimingTransfer === transfer.id}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        {claimingTransfer === transfer.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Récupération...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Récupérer le billet
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600 text-center">
                Ces billets vous ont été transférés et sont prêts à être récupérés
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
