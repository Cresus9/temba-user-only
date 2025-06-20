import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Use a simple secret key - in production this should be an environment variable
const SECRET_KEY = import.meta.env.VITE_TICKET_SECRET_KEY || 'default-secret-key';

export const generatePDF = async (element: HTMLElement): Promise<Blob> => {
  if (!element) {
    throw new Error('Aucun élément fourni pour la génération du PDF');
  }

  try {
    // Create a clone of the element to avoid modifying the original
    const clone = element.cloneNode(true) as HTMLElement;
    document.body.appendChild(clone);
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.transform = 'none';

    // Wait for all images to load - but don't fail if some images can't load
    const images = Array.from(clone.getElementsByTagName('img'));
    await Promise.all(
      images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = () => resolve(null);
          // If image fails to load or times out, continue anyway
          img.onerror = () => resolve(null);
          // Set timeout to avoid hanging - resolve instead of reject
          setTimeout(() => resolve(null), 5000);
        });
      })
    );

    // Generate canvas
    const canvas = await html2canvas(clone, {
      scale: 2, // Higher quality
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    // Remove clone after canvas generation
    document.body.removeChild(clone);

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = (pdfHeight - imgHeight * ratio) / 2;

    pdf.addImage(
      canvas.toDataURL('image/png', 1.0),
      'PNG',
      imgX,
      imgY,
      imgWidth * ratio,
      imgHeight * ratio,
      undefined,
      'FAST'
    );

    return pdf.output('blob');
  } catch (error) {
    console.error('Erreur de génération PDF:', error);
    throw new Error('Échec de la génération du PDF du billet');
  }
};

/**
 * Generates a simple HMAC-based QR code payload that works across all platforms
 * This approach avoids platform-specific encryption issues
 */
export const generateQRData = (ticketId: string): string => {
  try {
    // Create a payload with ticket ID and timestamp
    const payload = {
      id: ticketId,
      timestamp: Date.now(),
      version: '1.0' // Adding version for future compatibility
    };
    
    // Convert to JSON string
    const jsonData = JSON.stringify(payload);
    
    // Create a simple signature using the ticket ID and timestamp
    // This is a basic implementation - in production use a proper HMAC
    const signature = createSignature(jsonData, SECRET_KEY);
    
    // Combine the payload and signature
    const result = {
      data: payload,
      sig: signature
    };
    
    // Return as base64 encoded string for QR code
    return btoa(JSON.stringify(result));
  } catch (error) {
    console.error('Erreur de génération de données QR:', error);
    throw new Error('Échec de la génération du code QR');
  }
};

/**
 * Decodes and validates the QR data
 */
export const decodeQRData = (encodedData: string): { id: string; timestamp: number } => {
  try {
    // Decode the base64 string
    const jsonString = atob(encodedData);
    const data = JSON.parse(jsonString);
    
    // Extract payload and signature
    const { data: payload, sig } = data;
    
    // Verify the signature
    const calculatedSignature = createSignature(JSON.stringify(payload), SECRET_KEY);
    if (sig !== calculatedSignature) {
      throw new Error('Signature invalide');
    }
    
    // Check if the ticket has expired (24 hour validity)
    const now = Date.now();
    if (now - payload.timestamp > 24 * 60 * 60 * 1000) {
      throw new Error('Le code QR du billet a expiré');
    }

    return {
      id: payload.id,
      timestamp: payload.timestamp
    };
  } catch (error) {
    console.error('Erreur de décodage des données QR:', error);
    throw new Error('Code QR invalide');
  }
};

/**
 * Creates a simple signature for the payload
 * This is a basic implementation - in production use a proper HMAC library
 */
function createSignature(data: string, secret: string): string {
  // Simple hash function for demo purposes
  // In production, use a proper HMAC library
  let hash = 0;
  const combinedString = data + secret;
  
  for (let i = 0; i < combinedString.length; i++) {
    const char = combinedString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to hex string and ensure it's always positive
  return Math.abs(hash).toString(16);
}