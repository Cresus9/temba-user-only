import React, { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { generateQRData } from '../../utils/ticketService';

interface ResponsiveQRCodeProps {
  ticketId: string;
  baseSize?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
  fgColor?: string;
  bgColor?: string;
  className?: string;
}

/**
 * Responsive QR code component that adapts size based on screen size
 * Ensures QR codes are always large enough to scan easily
 */
export default function ResponsiveQRCode({
  ticketId,
  baseSize = 200,
  level = 'H',
  includeMargin = false,
  fgColor = '#000000',
  bgColor = '#ffffff',
  className = ''
}: ResponsiveQRCodeProps) {
  
  const qrData = useMemo(() => {
    try {
      return generateQRData(ticketId);
    } catch (error) {
      console.error('Error generating QR data:', error);
      return ticketId;
    }
  }, [ticketId]);

  return (
    <div className={`flex justify-center ${className}`} data-qr-code="true">
      {/* Mobile: Responsive QR code */}
      <div className="block sm:hidden">
        <QRCodeSVG
          value={qrData}
          size={Math.min(Math.max(baseSize, 200), 280)} // Between 200-280px on mobile
          level={level}
          includeMargin={includeMargin}
          fgColor={fgColor}
          bgColor={bgColor}
        />
      </div>
      
      {/* Tablet and up: Standard size */}
      <div className="hidden sm:block">
        <QRCodeSVG
          value={qrData}
          size={baseSize}
          level={level}
          includeMargin={includeMargin}
          fgColor={fgColor}
          bgColor={bgColor}
        />
      </div>
    </div>
  );
}
