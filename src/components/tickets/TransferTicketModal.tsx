import React, { useState } from 'react';
import { X, Send, User, Mail, Phone, MessageSquare, AlertCircle } from 'lucide-react';
import { ticketTransferService, TransferTicketRequest } from '../../services/ticketTransferService';
import { normalizePhone, isValidPhone } from '../../utils/phoneValidation';
import toast from 'react-hot-toast';

interface TransferTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  ticketTitle: string;
  onTransferComplete: () => void;
}

export default function TransferTicketModal({
  isOpen,
  onClose,
  ticketId,
  ticketTitle,
  onTransferComplete
}: TransferTicketModalProps) {
  const [formData, setFormData] = useState({
    recipientEmail: '',
    recipientPhone: '',
    recipientName: '',
    message: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [transferMethod, setTransferMethod] = useState<'email' | 'phone'>('email');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedData, setConfirmedData] = useState<{
    recipient: string;
    method: 'email' | 'phone';
    name: string;
    message: string;
  } | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateForm = () => {
    if (transferMethod === 'email') {
      if (!formData.recipientEmail) {
        setError('L\'email est requis');
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.recipientEmail)) {
        setError('Veuillez entrer une adresse email valide');
        return false;
      }
    } else {
      if (!formData.recipientPhone) {
        setError('Le numéro de téléphone est requis');
        return false;
      }
      // Normalize and validate phone using the utility
      const normalizedPhone = normalizePhone(formData.recipientPhone);
      if (!isValidPhone(normalizedPhone)) {
        setError('Veuillez entrer un numéro de téléphone valide (format: +226XXXXXXXX)');
        return false;
      }
      // Update form data with normalized phone
      setFormData(prev => ({ ...prev, recipientPhone: normalizedPhone }));
    }
    return true;
  };

  const handleTransfer = () => {
    if (!validateForm()) return;

    // Show confirmation step
    setConfirmedData({
      recipient: transferMethod === 'email' ? formData.recipientEmail : formData.recipientPhone,
      method: transferMethod,
      name: formData.recipientName,
      message: formData.message
    });
    setShowConfirmation(true);
  };

  const handleConfirmTransfer = async () => {
    if (!confirmedData) return;

    setIsLoading(true);
    setError('');

    try {
      const request: TransferTicketRequest = {
        ticketId,
        recipientEmail: confirmedData.method === 'email' ? confirmedData.recipient : undefined,
        recipientPhone: confirmedData.method === 'phone' ? normalizePhone(confirmedData.recipient) : undefined,
        recipientName: confirmedData.name,
        message: confirmedData.message
      };

      const response = await ticketTransferService.transferTicket(request);

      if (response.success) {
        if (response.instantTransfer) {
          toast.success('Billet transféré avec succès!');
        } else {
          toast.success('Transfert en attente - le destinataire recevra le billet lors de son inscription!');
        }
        onTransferComplete();
        onClose();
        // Reset form
        setFormData({
          recipientEmail: '',
          recipientPhone: '',
          recipientName: '',
          message: ''
        });
      } else {
        setError(response.error || 'Échec du transfert');
      }
    } catch (error) {
      console.error('Transfer error:', error);
      setError('Une erreur inattendue s\'est produite');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToForm = () => {
    setShowConfirmation(false);
    setConfirmedData(null);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Transfer Ticket</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Confirmation Step */}
          {showConfirmation && confirmedData ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Confirmer le transfert
                </h3>
                <p className="text-gray-600">
                  Veuillez vérifier les informations avant de confirmer le transfert
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Billet à transférer:</span>
                  <p className="text-gray-900 font-medium">{ticketTitle}</p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    {confirmedData.method === 'email' ? 'Email du destinataire:' : 'Téléphone du destinataire:'}
                  </span>
                  <p className="text-gray-900 font-medium">{confirmedData.recipient}</p>
                </div>

                {confirmedData.name && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Nom du destinataire:</span>
                    <p className="text-gray-900 font-medium">{confirmedData.name}</p>
                  </div>
                )}

                {confirmedData.message && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Message:</span>
                    <p className="text-gray-900 font-medium">{confirmedData.message}</p>
                  </div>
                )}
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-800">Important</p>
                    <p className="text-sm text-orange-700 mt-1">
                      Cette action est irréversible. Le billet sera transféré immédiatement au destinataire.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleBackToForm}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  disabled={isLoading}
                >
                  Retour
                </button>
                <button
                  onClick={handleConfirmTransfer}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Transfert...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Confirmer le transfert
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Ticket Info */}
              <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-1">Transferring:</h3>
            <p className="text-gray-700">{ticketTitle}</p>
          </div>

          {/* Transfer Method Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Transfer Method
            </label>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setTransferMethod('email')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  transferMethod === 'email'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Mail className="h-4 w-4" />
                Email
              </button>
              <button
                type="button"
                onClick={() => setTransferMethod('phone')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  transferMethod === 'phone'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Phone className="h-4 w-4" />
                Phone
              </button>
            </div>
          </div>

          {/* Recipient Details */}
          <div className="space-y-4">
            {/* Email or Phone Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {transferMethod === 'email' ? 'Recipient Email' : 'Recipient Phone'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {transferMethod === 'email' ? (
                    <Mail className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Phone className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <input
                  type={transferMethod === 'email' ? 'email' : 'tel'}
                  value={transferMethod === 'email' ? formData.recipientEmail : formData.recipientPhone}
                  onChange={(e) => handleInputChange(
                    transferMethod === 'email' ? 'recipientEmail' : 'recipientPhone',
                    e.target.value
                  )}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder={transferMethod === 'email' ? 'user@example.com' : '+226 70 12 34 56'}
                />
              </div>
            </div>

            {/* Recipient Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Name (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={formData.recipientName}
                  onChange={(e) => handleInputChange('recipientName', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="John Doe"
                />
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message (Optional)
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none">
                  <MessageSquare className="h-5 w-5 text-gray-400" />
                </div>
                <textarea
                  value={formData.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  rows={3}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                  placeholder="Add a personal message..."
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Important</p>
                <p className="text-sm text-amber-700 mt-1">
                  The recipient must have a Temba account. This transfer is instant and cannot be undone.
                </p>
              </div>
            </div>
          </div>
            </>
          )}
        </div>

        {/* Footer - Only show when not in confirmation mode */}
        {!showConfirmation && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleTransfer}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Transfert...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Transférer le billet
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}