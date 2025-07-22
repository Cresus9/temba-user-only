import React, { useState, useEffect } from 'react';
import { QrScanner } from '@yudiel/react-qr-scanner';
import { Send, X, RotateCcw, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { decodeQRData } from '../../utils/ticketService';
import useSound from 'use-sound';
import toast from 'react-hot-toast';

interface ScanResult {
  success: boolean;
  message: string;
  ticket?: {
    eventTitle: string;
    ticketType: string;
    userName: string;
  };
}

interface TicketScannerProps {
  onScan?: (success: boolean) => void;
  hardwareMode?: boolean;
}

export default function TicketScanner({ onScan, hardwareMode = false }: TicketScannerProps) {
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [inputCode, setInputCode] = useState('');

  // Use the use-sound hook for better audio handling
  const [playSuccessSound] = useSound('/success.mp3', { volume: 0.5 });
  const [playErrorSound] = useSound('/error.mp3', { volume: 0.5 });

  useEffect(() => {
    // Focus input when in hardware mode
    if (hardwareMode) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [hardwareMode]);

  const handleKeyDown = (e: KeyboardEvent) => {
    // Handle hardware scanner input
    if (e.key === 'Enter' && inputCode) {
      handleScan(inputCode);
      setInputCode('');
    } else if (e.key !== 'Enter') {
      setInputCode(prev => prev + e.key);
    }
  };

  const handleScan = async (code: string) => {
    if (!scanning || !code) return;
    
    setScanning(false);
    setLoading(true);

    try {
      // First try to decode the QR code
      let decodedData;
      try {
        decodedData = decodeQRData(code);
      } catch (error) {
        console.error('Error decoding QR data:', error);
        throw new Error('Invalid QR code format');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Call the scan_ticket function
      const { data, error } = await supabase.rpc('validate_ticket', {
        p_ticket_id: decodedData.id,
        p_scanned_by: user.id,
        p_scan_location: 'Ticket Scanner'
      });

      if (error) throw error;

      setResult(data);
      
      // Play appropriate sound
      if (data.success) {
        playSuccessSound();
        toast.success(data.message || 'Ticket validated successfully');
      } else {
        playErrorSound();
        toast.error(data.message || 'Invalid ticket');
      }
      
      onScan?.(data.success);
    } catch (error: any) {
      console.error('Error validating ticket:', error);
      setResult({
        success: false,
        message: error.message || 'Error validating ticket'
      });
      playErrorSound();
      toast.error(error.message || 'Failed to validate ticket');
      onScan?.(false);
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setResult(null);
    setScanning(true);
    setLoading(false);
    setInputCode('');
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="relative">
        {scanning ? (
          hardwareMode ? (
            // Hidden input for hardware scanner
            <div className="aspect-square bg-gray-900 rounded-xl flex items-center justify-center text-white">
              <div className="text-center p-6">
                <h3 className="text-xl font-semibold mb-4">Ready to Scan</h3>
                <p className="text-gray-300">
                  Use your barcode scanner to scan a ticket QR code
                </p>
                <input
                  type="text"
                  className="opacity-0 absolute"
                  value={inputCode}
                  onChange={() => {}} // Handle through keydown event
                  autoFocus
                />
              </div>
            </div>
          ) : (
            // Camera-based scanning
            <div className="aspect-square">
              <QrScanner
                onDecode={handleScan}
                onError={(error) => {
                  // Ignore media-related errors as they're expected
                  if (error.name === 'NotSupportedError' && error.message.includes('supported sources')) {
                    return;
                  }
                  console.error('Scanner error:', error);
                  toast.error('Scanner error: ' + error.message);
                }}
                containerStyle={{ 
                  borderRadius: '0.75rem',
                  overflow: 'hidden',
                  height: '100%'
                }}
                videoStyle={{ 
                  objectFit: 'cover',
                  width: '100%',
                  height: '100%'
                }}
              />
            </div>
          )
        ) : (
          <div className="aspect-square bg-gray-900 rounded-xl flex items-center justify-center">
            {loading ? (
              <Loader className="h-12 w-12 animate-spin text-white" />
            ) : result && (
              <div className={`text-center p-6 ${
                result.success ? 'text-green-500' : 'text-red-500'
              }`}>
                {result.success ? (
                  <Send className="h-16 w-16 mx-auto mb-4" />
                ) : (
                  <X className="h-16 w-16 mx-auto mb-4" />
                )}
                <p className="text-lg font-medium text-white mb-4" data-testid="scan-result">
                  {result.message}
                </p>
                {result.ticket && (
                  <div className="text-sm text-gray-300 space-y-2">
                    <p><strong>Event:</strong> {result.ticket.eventTitle}</p>
                    <p><strong>Ticket:</strong> {result.ticket.ticketType}</p>
                    <p><strong>Name:</strong> {result.ticket.userName}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <button
          onClick={resetScanner}
          className="absolute bottom-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
          aria-label="Reset scanner"
        >
          <RotateCcw className="h-6 w-6 text-gray-700" />
        </button>
      </div>

      <div className="text-center text-[var(--gray-600)] mt-4">
        {scanning ? (
          hardwareMode ? 
            'Ready to scan tickets' :
            'Position the QR code within the frame to scan'
        ) : (
          <button
            onClick={resetScanner}
            className="px-6 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)]"
          >
            Scan Another Ticket
          </button>
        )}
      </div>
    </div>
  );
}
