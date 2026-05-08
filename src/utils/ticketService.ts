import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Use a simple secret key - in production this should be an environment variable
const SECRET_KEY = import.meta.env.VITE_TICKET_SECRET_KEY || 'default-secret-key';

/**
 * Renders the ticket DOM at a controlled "phone" width (forced mobile layout)
 * and captures it to a high-resolution canvas. The narrow stage keeps every
 * Tailwind `sm:` / `md:` utility inactive, so the export uses the compact
 * stacked layout (poster on top, info, then centered QR stub) — readable on
 * phones, easy to share, and consistent across devices.
 */
const captureTicketCanvas = async (element: HTMLElement): Promise<HTMLCanvasElement> => {
  if (!element) {
    throw new Error('Aucun élément fourni pour la génération du billet');
  }

  // Stage width MUST stay below Tailwind's `sm` breakpoint (640px) so the
  // ticket renders in its mobile layout. 480px ≈ a modern phone viewport.
  const STAGE_WIDTH = 480;
  const stage = document.createElement('div');
  stage.style.position = 'fixed';
  stage.style.top = '-100000px';
  stage.style.left = '0';
  stage.style.width = `${STAGE_WIDTH}px`;
  stage.style.padding = '16px';
  stage.style.background = '#FAF7F2';
  stage.style.zIndex = '-1';
  stage.style.pointerEvents = 'none';

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.transform = 'none';
  clone.style.maxWidth = 'none';
  clone.style.width = '100%';
  stage.appendChild(clone);
  document.body.appendChild(stage);

  // Force the mobile QR variant to render (the desktop one is hidden via
  // `hidden sm:block` which html2canvas may not evaluate reliably).
  const qrCodeContainers = clone.querySelectorAll('[data-qr-code="true"]');
  qrCodeContainers.forEach((container) => {
    const mobileQR = container.querySelector('.block.sm\\:hidden') as HTMLElement | null;
    const desktopQR = container.querySelector('.hidden.sm\\:block') as HTMLElement | null;
    if (mobileQR) mobileQR.style.display = 'block';
    if (desktopQR) desktopQR.style.display = 'none';
  });

  // Wait for images so the poster doesn't render blank
  const images = Array.from(clone.getElementsByTagName('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = () => resolve(null);
        img.onerror = () => resolve(null);
        setTimeout(() => resolve(null), 5000);
      });
    })
  );

  // Small paint delay so layout settles
  await new Promise((r) => setTimeout(r, 60));

  try {
    const canvas = await html2canvas(clone, {
      // Higher scale because the stage is narrow — keeps the export retina-sharp.
      scale: 3,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: null,
      windowWidth: STAGE_WIDTH,
      width: clone.scrollWidth,
      height: clone.scrollHeight,
    });
    return canvas;
  } finally {
    document.body.removeChild(stage);
  }
};

/**
 * Generates a high-quality PNG image of the ticket — the recommended download
 * format. Opens natively on phones, easy to share, no page-size mismatch.
 */
export const generateTicketPNG = async (element: HTMLElement): Promise<Blob> => {
  const canvas = await captureTicketCanvas(element);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Échec de la création du PNG'));
      },
      'image/png',
      1.0
    );
  });
};

/**
 * Legacy PDF download — kept available for users who want to print.
 * Now uses portrait orientation and fits the ticket cleanly on the page.
 */
export const generatePDF = async (element: HTMLElement): Promise<Blob> => {
  try {
    const canvas = await captureTicketCanvas(element);

    // The ticket is taller than wide → portrait fits much better than landscape.
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 8; // mm — small breathing space on every edge
    const usableWidth = pdfWidth - margin * 2;
    const usableHeight = pdfHeight - margin * 2;

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(usableWidth / imgWidth, usableHeight / imgHeight);

    const renderW = imgWidth * ratio;
    const renderH = imgHeight * ratio;
    const imgX = (pdfWidth - renderW) / 2;
    const imgY = (pdfHeight - renderH) / 2;

    pdf.addImage(
      canvas.toDataURL('image/jpeg', 0.92),
      'JPEG',
      imgX,
      imgY,
      renderW,
      renderH,
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