import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔥 Starting image cache warming...');

    // Get popular/recent events that need image warming
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        image_url,
        banner_images,
        gallery_images,
        created_at,
        updated_at
      `)
      .eq('status', 'PUBLISHED')
      .order('created_at', { ascending: false })
      .limit(50);

    if (eventsError) {
      throw eventsError;
    }

    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No events found for cache warming' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const imageOptimizerUrl = `${supabaseUrl}/functions/v1/image-optimizer`;
    const warmupResults = [];

    // Warm up main event images
    for (const event of events) {
      try {
        const imagesToWarm = [];

        // Main image
        if (event.image_url) {
          imagesToWarm.push({
            url: event.image_url,
            type: 'main',
            sizes: [
              { width: 400, height: 300 }, // Card size
              { width: 800, height: 600 }, // Detail size
              { width: 200, height: 150 }, // Thumbnail
            ]
          });
        }

        // Banner images
        if (event.banner_images && Array.isArray(event.banner_images)) {
          event.banner_images.forEach((bannerUrl: string) => {
            imagesToWarm.push({
              url: bannerUrl,
              type: 'banner',
              sizes: [{ width: 1200, height: 400 }]
            });
          });
        }

        // Gallery images
        if (event.gallery_images && Array.isArray(event.gallery_images)) {
          event.gallery_images.slice(0, 5).forEach((galleryUrl: string) => {
            imagesToWarm.push({
              url: galleryUrl,
              type: 'gallery',
              sizes: [
                { width: 600, height: 400 },
                { width: 300, height: 200 }
              ]
            });
          });
        }

        // Warm up each image in different sizes
        for (const image of imagesToWarm) {
          for (const size of image.sizes) {
            try {
              const optimizerUrl = `${imageOptimizerUrl}?url=${encodeURIComponent(image.url)}&width=${size.width}&height=${size.height}&quality=80&format=webp`;
              
              const warmupResponse = await fetch(optimizerUrl, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                },
              });

              if (warmupResponse.ok) {
                console.log(`✅ Warmed up: ${event.title} - ${image.type} (${size.width}x${size.height})`);
                warmupResults.push({
                  event_id: event.id,
                  event_title: event.title,
                  image_url: image.url,
                  image_type: image.type,
                  size: `${size.width}x${size.height}`,
                  status: 'success'
                });
              } else {
                console.warn(`⚠️ Failed to warm up: ${image.url} - ${warmupResponse.status}`);
                warmupResults.push({
                  event_id: event.id,
                  event_title: event.title,
                  image_url: image.url,
                  image_type: image.type,
                  size: `${size.width}x${size.height}`,
                  status: 'failed',
                  error: warmupResponse.statusText
                });
              }

              // Small delay to avoid overwhelming the optimizer
              await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
              console.error(`❌ Error warming up ${image.url}:`, error);
              warmupResults.push({
                event_id: event.id,
                event_title: event.title,
                image_url: image.url,
                image_type: image.type,
                size: `${size.width}x${size.height}`,
                status: 'error',
                error: error.message
              });
            }
          }
        }

      } catch (error) {
        console.error(`❌ Error processing event ${event.title}:`, error);
      }
    }

    // Log warmup statistics
    const successCount = warmupResults.filter(r => r.status === 'success').length;
    const failedCount = warmupResults.filter(r => r.status !== 'success').length;

    // Store warmup results in database
    try {
      await supabase
        .from('image_warmup_logs')
        .insert({
          warmup_date: new Date().toISOString(),
          events_processed: events.length,
          images_warmed: successCount,
          images_failed: failedCount,
          details: warmupResults,
        });
    } catch (logError) {
      console.error('Error logging warmup results:', logError);
    }

    const summary = {
      message: 'Image cache warming completed',
      events_processed: events.length,
      images_warmed: successCount,
      images_failed: failedCount,
      duration_ms: Date.now(),
    };

    console.log('🔥 Cache warming summary:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Cache warming error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Cache warming failed',
        message: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
