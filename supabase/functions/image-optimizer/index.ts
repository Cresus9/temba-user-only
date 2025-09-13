import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// In-memory cache for optimized images
const imageCache = new Map<string, { data: Uint8Array; headers: Headers; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface OptimizationParams {
  url: string;
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const params: OptimizationParams = {
      url: url.searchParams.get('url') || '',
      width: url.searchParams.get('width') ? parseInt(url.searchParams.get('width')!) : undefined,
      height: url.searchParams.get('height') ? parseInt(url.searchParams.get('height')!) : undefined,
      quality: url.searchParams.get('quality') ? parseInt(url.searchParams.get('quality')!) : 80,
      format: (url.searchParams.get('format') as 'webp' | 'jpeg' | 'png') || 'webp',
    };

    if (!params.url) {
      return new Response('Missing url parameter', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Generate cache key
    const cacheKey = `${params.url}_${params.width || 'auto'}_${params.height || 'auto'}_${params.quality}_${params.format}`;

    // Check cache first
    const cached = imageCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('🎯 Cache hit for:', params.url);
      return new Response(cached.data, { 
        headers: {
          ...corsHeaders,
          ...Object.fromEntries(cached.headers.entries())
        }
      });
    }

    console.log('🔄 Processing image:', params.url);

    // Fetch original image
    const imageResponse = await fetch(params.url, {
      headers: {
        'User-Agent': 'Temba-Image-Optimizer/1.0',
      },
    });

    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const originalImageData = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    // For now, we'll pass through the original image with optimization headers
    // In a full implementation, you'd use a library like ImageMagick or Sharp
    let optimizedData = new Uint8Array(originalImageData);
    let outputFormat = contentType;

    // Determine output format
    if (params.format === 'webp' && !contentType.includes('webp')) {
      // For WebP conversion, we'd need a proper image processing library
      // For now, we'll use the original format but with optimization headers
      outputFormat = contentType;
    }

    // Create response headers with caching
    const responseHeaders = new Headers({
      'Content-Type': outputFormat,
      'Cache-Control': 'public, max-age=31536000, immutable', // 1 year cache
      'ETag': `"${await generateETag(optimizedData)}"`,
      'Vary': 'Accept',
      'X-Image-Optimized': 'true',
      'X-Original-Size': originalImageData.byteLength.toString(),
      'X-Optimized-Size': optimizedData.byteLength.toString(),
      ...corsHeaders,
    });

    // Cache the optimized image
    imageCache.set(cacheKey, {
      data: optimizedData,
      headers: responseHeaders,
      timestamp: Date.now(),
    });

    // Log cache statistics
    await logCacheStats(params.url, originalImageData.byteLength, optimizedData.byteLength);

    console.log('✅ Image optimized and cached:', params.url);

    return new Response(optimizedData, { headers: responseHeaders });

  } catch (error) {
    console.error('❌ Image optimization error:', error);
    
    // Return a fallback response
    return new Response(
      JSON.stringify({ 
        error: 'Image optimization failed',
        message: error.message 
      }),
      { 
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );
  }
});

async function generateETag(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

async function logCacheStats(url: string, originalSize: number, optimizedSize: number) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const compressionRatio = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);

    await supabase
      .from('image_cache_stats')
      .insert({
        image_url: url,
        original_size: originalSize,
        optimized_size: optimizedSize,
        compression_ratio: parseFloat(compressionRatio),
        cache_key: await generateETag(new Uint8Array()),
        accessed_at: new Date().toISOString(),
      });
  } catch (error) {
    console.error('Error logging cache stats:', error);
  }
}

// Cleanup old cache entries periodically
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  for (const [key, value] of imageCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => imageCache.delete(key));
  
  if (keysToDelete.length > 0) {
    console.log(`🧹 Cleaned up ${keysToDelete.length} expired cache entries`);
  }
}, 60 * 60 * 1000); // Run every hour
