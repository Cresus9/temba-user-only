import { generateQRData, decodeQRData } from './ticketService';

/**
 * Test function to verify QR code generation and validation
 */
export function testQRCodeGeneration(ticketId: string) {
  try {
    console.log('Testing QR code generation for ticket:', ticketId);
    
    // Generate QR data
    const qrData = generateQRData(ticketId);
    console.log('Generated QR data:', qrData);
    
    // Try to decode it
    const decoded = decodeQRData(qrData);
    console.log('Decoded data:', decoded);
    
    // Verify the ticket ID matches
    if (decoded.id === ticketId) {
      console.log('✅ QR code generation and validation successful!');
      return true;
    } else {
      console.error('❌ Ticket ID mismatch:', { expected: ticketId, actual: decoded.id });
      return false;
    }
  } catch (error) {
    console.error('❌ QR code test failed:', error);
    return false;
  }
}

/**
 * Test with a sample ticket ID
 */
export function runQRCodeTest() {
  const sampleTicketId = '123e4567-e89b-12d3-a456-426614174000';
  return testQRCodeGeneration(sampleTicketId);
}
