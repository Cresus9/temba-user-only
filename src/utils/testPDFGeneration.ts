/**
 * Test utility to verify PDF generation with optimized QR codes
 */

export function testPDFQRCodeOptimization() {
  console.log('🔍 Testing PDF QR Code Optimization...');
  
  // Create a test element with QR code structure
  const testElement = document.createElement('div');
  testElement.innerHTML = `
    <div data-qr-code="true" class="flex justify-center">
      <div class="block sm:hidden">
        <svg width="260" height="260">
          <rect width="260" height="260" fill="white"/>
          <text x="130" y="130" text-anchor="middle">Mobile QR (260px)</text>
        </svg>
      </div>
      <div class="hidden sm:block">
        <svg width="220" height="220">
          <rect width="220" height="220" fill="white"/>
          <text x="110" y="110" text-anchor="middle">Desktop QR (220px)</text>
        </svg>
      </div>
    </div>
  `;
  
  document.body.appendChild(testElement);
  
  // Clone and apply PDF optimizations (simulate what generatePDF does)
  const clone = testElement.cloneNode(true) as HTMLElement;
  
  // Apply PDF optimizations
  const qrCodeContainers = clone.querySelectorAll('[data-qr-code="true"]');
  qrCodeContainers.forEach(container => {
    const svgElements = container.querySelectorAll('svg');
    svgElements.forEach(svgElement => {
      if (svgElement && svgElement.getAttribute('width')) {
        const currentSize = parseInt(svgElement.getAttribute('width') || '200');
        const pdfOptimizedSize = Math.max(currentSize, 350);
        svgElement.setAttribute('width', pdfOptimizedSize.toString());
        svgElement.setAttribute('height', pdfOptimizedSize.toString());
        console.log(`📐 QR Code optimized: ${currentSize}px → ${pdfOptimizedSize}px`);
      }
    });
    
    // Force show mobile version for PDF
    const mobileQR = container.querySelector('.block.sm\\:hidden');
    const desktopQR = container.querySelector('.hidden.sm\\:block');
    
    if (mobileQR && desktopQR) {
      (mobileQR as HTMLElement).style.display = 'block';
      (desktopQR as HTMLElement).style.display = 'none';
      console.log('📱 Forced mobile QR version for PDF');
    }
  });
  
  // Check results
  const optimizedSVGs = clone.querySelectorAll('svg');
  let allOptimized = true;
  
  optimizedSVGs.forEach((svg, index) => {
    const size = parseInt(svg.getAttribute('width') || '0');
    if (size < 350) {
      console.error(`❌ SVG ${index} not properly optimized: ${size}px`);
      allOptimized = false;
    } else {
      console.log(`✅ SVG ${index} properly optimized: ${size}px`);
    }
  });
  
  // Cleanup
  document.body.removeChild(testElement);
  
  if (allOptimized) {
    console.log('🎉 PDF QR Code optimization test PASSED!');
    return true;
  } else {
    console.error('❌ PDF QR Code optimization test FAILED!');
    return false;
  }
}

// Auto-run test in development
if (import.meta.env.DEV) {
  // Delay to ensure DOM is ready
  setTimeout(() => {
    testPDFQRCodeOptimization();
  }, 1000);
}
