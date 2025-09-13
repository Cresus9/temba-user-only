import React, { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { generateQRData } from '../../utils/ticketService';

interface TicketQRCodeProps {
  ticketId: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
  fgColor?: string;
  bgColor?: string;
  className?: string;
}

/**
 * Component that generates a proper QR code for ticket validation
 * Creates structured data that can be validated by the scanner
 */
export default function TicketQRCode({
  ticketId,
  size = 140,
  level = 'H',
  includeMargin = true,
  fgColor = '#000000',
  bgColor = '#ffffff',
  className = ''
}: TicketQRCodeProps) {
  
  const qrData = useMemo(() => {
    try {
      return generateQRData(ticketId);
    } catch (error) {
      console.error('Error generating QR data:', error);
      // Fallback to ticket ID if generation fails
      return ticketId;
    }
  }, [ticketId]);

  return (
    <div className={className} data-qr-code="true">
      <QRCodeSVG
        value={qrData}
        size={size}
        level={level}
        includeMargin={includeMargin}
        fgColor={fgColor}
        bgColor={bgColor}
      />
    </div>
  );
}

