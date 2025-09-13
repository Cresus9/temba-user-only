import React, { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { generateQRData } from '../../utils/ticketService';

interface PDFOptimizedQRCodeProps {
  ticketId: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
  fgColor?: string;
  bgColor?: string;
  className?: string;
}

/**
 * QR code component optimized for PDF generation
 * Always uses a large size to ensure scannability in printed/downloaded tickets
 */
export default function PDFOptimizedQRCode({
  ticketId,
  size = 300, // Large default size for PDF
  level = 'H',
  includeMargin = false,
  fgColor = '#000000',
  bgColor = '#ffffff',
  className = ''
}: PDFOptimizedQRCodeProps) {
  
  const qrData = useMemo(() => {
    try {
      return generateQRData(ticketId);
    } catch (error) {
      console.error('Error generating QR data:', error);
      return ticketId;
    }
  }, [ticketId]);

  return (
    <div className={`flex justify-center ${className}`}>
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
