# Temba Logo - Canvas Implementation Guide

Based on the codebase, the Temba logo consists of:
1. **Icon**: A rounded square with gradient (orange-500 to red-500) containing the letter "T"
2. **Text**: "TEMBA" in bold white text
3. **Colors**: Orange (#f97316) to Red (#ef4444) gradient, white text

## Complete Canvas Implementation

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Temba Logo - Canvas</title>
</head>
<body>
    <canvas id="temba-logo" width="200" height="60"></canvas>
    
    <script>
        const canvas = document.getElementById('temba-logo');
        const ctx = canvas.getContext('2d');
        
        // Logo dimensions
        const logoWidth = 200;
        const logoHeight = 60;
        const iconSize = 48;
        const iconPadding = 6;
        const gap = 8; // Gap between icon and text
        
        // Colors (Tailwind: orange-500 to red-500)
        const orangeColor = '#f97316'; // orange-500
        const redColor = '#ef4444';    // red-500
        const textColor = '#ffffff';   // white
        
        // Clear canvas
        ctx.clearRect(0, 0, logoWidth, logoHeight);
        
        // ============================================
        // STEP 1: Draw the Icon (Rounded Square with "T")
        // ============================================
        
        const iconX = 0;
        const iconY = (logoHeight - iconSize) / 2;
        const cornerRadius = 8; // Rounded corners
        
        // Create gradient for icon background
        const iconGradient = ctx.createLinearGradient(
            iconX, iconY,
            iconX + iconSize, iconY + iconSize
        );
        iconGradient.addColorStop(0, orangeColor);
        iconGradient.addColorStop(1, redColor);
        
        // Draw rounded rectangle (icon background)
        ctx.fillStyle = iconGradient;
        ctx.beginPath();
        ctx.roundRect(iconX, iconY, iconSize, iconSize, cornerRadius);
        ctx.fill();
        
        // Add shadow for depth (optional)
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
        
        // Draw the letter "T" in the icon
        ctx.fillStyle = textColor;
        ctx.font = `bold ${iconSize * 0.6}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'transparent'; // Remove shadow for text
        
        const textX = iconX + iconSize / 2;
        const textY = iconY + iconSize / 2;
        ctx.fillText('T', textX, textY);
        
        // ============================================
        // STEP 2: Draw the "TEMBA" Text
        // ============================================
        
        const textXStart = iconX + iconSize + gap;
        const textYCenter = logoHeight / 2;
        
        ctx.fillStyle = textColor;
        ctx.font = `bold ${iconSize * 0.5}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('TEMBA', textXStart, textYCenter);
        
        // ============================================
        // Alternative: More Detailed Version with Shadow
        // ============================================
        
        function drawTembaLogoDetailed(ctx, x, y, scale = 1) {
            const iconSize = 48 * scale;
            const gap = 8 * scale;
            const cornerRadius = 8 * scale;
            const fontSize = 24 * scale;
            
            // Save context
            ctx.save();
            
            // Translate to position
            ctx.translate(x, y);
            
            // 1. Draw icon with gradient
            const iconGradient = ctx.createLinearGradient(0, 0, iconSize, iconSize);
            iconGradient.addColorStop(0, '#f97316'); // orange-500
            iconGradient.addColorStop(1, '#ef4444'); // red-500
            
            // Rounded rectangle path
            ctx.beginPath();
            ctx.roundRect(0, 0, iconSize, iconSize, cornerRadius);
            ctx.fillStyle = iconGradient;
            
            // Add shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 6;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 3;
            ctx.fill();
            
            // 2. Draw "T" letter
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${iconSize * 0.6}px Inter, system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('T', iconSize / 2, iconSize / 2);
            
            // 3. Draw "TEMBA" text
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText('TEMBA', iconSize + gap, iconSize / 2);
            
            // Restore context
            ctx.restore();
        }
        
        // ============================================
        // High-Quality Version with Better Rendering
        // ============================================
        
        function drawHighQualityTembaLogo(canvas, scale = 2) {
            // Set canvas size with scaling for retina displays
            const baseWidth = 200;
            const baseHeight = 60;
            canvas.width = baseWidth * scale;
            canvas.height = baseHeight * scale;
            canvas.style.width = baseWidth + 'px';
            canvas.style.height = baseHeight + 'px';
            
            const ctx = canvas.getContext('2d');
            
            // Scale context for high DPI
            ctx.scale(scale, scale);
            
            // Enable text rendering improvements
            ctx.textRenderingOptimization = 'optimizeQuality';
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Draw logo
            drawTembaLogoDetailed(ctx, 0, 6, 1);
        }
        
        // ============================================
        // Usage Examples
        // ============================================
        
        // Example 1: Basic logo
        drawTembaLogoDetailed(ctx, 0, 6, 1);
        
        // Example 2: High-quality version
        // drawHighQualityTembaLogo(canvas, 2);
        
        // Example 3: Different sizes
        // drawTembaLogoDetailed(ctx, 0, 0, 0.5); // Small
        // drawTembaLogoDetailed(ctx, 0, 0, 1);   // Normal
        // drawTembaLogoDetailed(ctx, 0, 0, 2);   // Large
    </script>
</body>
</html>
```

## Simplified Version (Step-by-Step)

```javascript
function createTembaLogo(canvas) {
    const ctx = canvas.getContext('2d');
    const width = 200;
    const height = 60;
    
    canvas.width = width;
    canvas.height = height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // ============================================
    // 1. DRAW ICON (Rounded Square with Gradient)
    // ============================================
    
    const iconSize = 48;
    const iconX = 0;
    const iconY = (height - iconSize) / 2; // Center vertically
    
    // Create gradient
    const gradient = ctx.createLinearGradient(
        iconX, iconY,
        iconX + iconSize, iconY + iconSize
    );
    gradient.addColorStop(0, '#f97316'); // Orange
    gradient.addColorStop(1, '#ef4444'); // Red
    
    // Draw rounded rectangle
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(iconX, iconY, iconSize, iconSize, 8);
    ctx.fill();
    
    // ============================================
    // 2. DRAW LETTER "T" IN ICON
    // ============================================
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('T', iconX + iconSize / 2, iconY + iconSize / 2);
    
    // ============================================
    // 3. DRAW "TEMBA" TEXT
    // ============================================
    
    const textX = iconX + iconSize + 8; // 8px gap
    const textY = height / 2; // Center vertically
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('TEMBA', textX, textY);
}

// Usage
const canvas = document.getElementById('temba-logo');
createTembaLogo(canvas);
```

## Color Specifications

```javascript
const TEMBA_COLORS = {
    // Primary gradient
    orange: '#f97316',  // orange-500
    red: '#ef4444',     // red-500
    
    // Alternative (if you want more vibrant)
    orangeAlt: '#ea580c', // orange-600
    redAlt: '#dc2626',     // red-600
    
    // Text
    text: '#ffffff',       // white
    
    // Background (for dark mode)
    darkBg: '#1f2937',     // gray-800
};
```

## Responsive Sizes

```javascript
const LOGO_SIZES = {
    small: {
        iconSize: 24,
        fontSize: 12,
        gap: 4,
        height: 30
    },
    medium: {
        iconSize: 48,
        fontSize: 24,
        gap: 8,
        height: 60
    },
    large: {
        iconSize: 72,
        fontSize: 36,
        gap: 12,
        height: 90
    },
    xlarge: {
        iconSize: 96,
        fontSize: 48,
        gap: 16,
        height: 120
    }
};
```

## Complete Reusable Function

```javascript
/**
 * Draws the Temba logo on a canvas
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {Object} options - Configuration options
 * @param {number} options.size - Size scale (default: 1)
 * @param {boolean} options.shadow - Add shadow effect (default: true)
 * @param {string} options.textColor - Text color (default: '#ffffff')
 */
function drawTembaLogo(canvas, options = {}) {
    const {
        size = 1,
        shadow = true,
        textColor = '#ffffff'
    } = options;
    
    const ctx = canvas.getContext('2d');
    const iconSize = 48 * size;
    const fontSize = 24 * size;
    const gap = 8 * size;
    const cornerRadius = 8 * size;
    const height = 60 * size;
    const width = (iconSize + gap + fontSize * 2.5) * size; // Approximate
    
    // Set canvas size
    canvas.width = width;
    canvas.height = height;
    
    // Enable high-quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Clear
    ctx.clearRect(0, 0, width, height);
    
    // 1. Icon background (gradient)
    const iconX = 0;
    const iconY = (height - iconSize) / 2;
    
    const gradient = ctx.createLinearGradient(
        iconX, iconY,
        iconX + iconSize, iconY + iconSize
    );
    gradient.addColorStop(0, '#f97316');
    gradient.addColorStop(1, '#ef4444');
    
    if (shadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 6 * size;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 3 * size;
    }
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(iconX, iconY, iconSize, iconSize, cornerRadius);
    ctx.fill();
    
    // 2. Letter "T"
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = textColor;
    ctx.font = `bold ${iconSize * 0.6}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('T', iconX + iconSize / 2, iconY + iconSize / 2);
    
    // 3. "TEMBA" text
    ctx.fillStyle = textColor;
    ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('TEMBA', iconX + iconSize + gap, height / 2);
}

// Usage
const canvas = document.getElementById('logo');
drawTembaLogo(canvas, { size: 2, shadow: true });
```

## Export as Image

```javascript
function exportLogoAsImage(canvas, filename = 'temba-logo.png') {
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    });
}

// Usage
const canvas = document.getElementById('logo');
drawTembaLogo(canvas);
exportLogoAsImage(canvas, 'temba-logo.png');
```

## Notes

1. **roundRect()**: Modern browsers support `ctx.roundRect()`. For older browsers, use a custom function or polyfill.
2. **Font**: Uses "Inter" font family, falls back to system fonts.
3. **Colors**: Matches Tailwind CSS classes `orange-500` and `red-500`.
4. **Proportions**: Icon is 48px, text is 24px, with 8px gap between them.
5. **High DPI**: Use `scale` parameter for retina displays (multiply canvas size by 2).

This will create the exact Temba logo as used in the application!

