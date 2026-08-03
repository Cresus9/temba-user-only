import { supabase } from '../lib/supabase-client';

export interface GalleryImage {
  id: string;
  event_id: string;
  image_url: string;
  caption: string | null;
  display_order: number;
  created_at: string;
}

const BUCKET = 'event-images';
const MAX_IMAGES = 20;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// ── Read ─────────────────────────────────────────────────────────────────────

export async function getGalleryImages(eventId: string): Promise<GalleryImage[]> {
  // Try with display_order first; fall back to created_at if that column doesn't exist
  let { data, error } = await supabase
    .from('event_images')
    .select('*')
    .eq('event_id', eventId)
    .order('display_order', { ascending: true });

  if (error?.code === '42703') {
    // Column doesn't exist — retry without ordering
    console.warn('[galleryService] display_order column missing, retrying without order');
    ({ data, error } = await supabase
      .from('event_images')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true }));
  }

  if (error) {
    console.error('[galleryService] getGalleryImages error:', error.code, error.message);
    return [];
  }

  console.log(`[galleryService] ${data?.length ?? 0} image(s) for event ${eventId}`, data);

  // Normalise column names — handle both image_url and url variants
  const normalised = (data ?? []).map((row: any) => ({
    id:            row.id,
    event_id:      row.event_id,
    image_url:     row.image_url ?? row.url ?? row.src ?? '',
    caption:       row.caption  ?? row.alt ?? row.description ?? null,
    display_order: row.display_order ?? row.sort_order ?? row.order ?? 0,
    created_at:    row.created_at ?? '',
  }));

  return normalised as GalleryImage[];
}

// ── Upload ────────────────────────────────────────────────────────────────────

export async function uploadGalleryImage(
  eventId: string,
  file: File,
  caption?: string,
): Promise<GalleryImage | null> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Le fichier est trop volumineux (max 5 Mo).`);
  }

  // Get current count to enforce limit
  const existing = await getGalleryImages(eventId);
  if (existing.length >= MAX_IMAGES) {
    throw new Error(`Maximum ${MAX_IMAGES} photos par attraction.`);
  }

  const ext      = file.name.split('.').pop() ?? 'jpg';
  const path     = `gallery/${eventId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });

  if (uploadError) throw new Error(uploadError.message);

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);

  const nextOrder = existing.length > 0
    ? Math.max(...existing.map(i => i.display_order)) + 1
    : 0;

  const { data, error: insertError } = await supabase
    .from('event_images')
    .insert({
      event_id:      eventId,
      image_url:     publicUrl,
      caption:       caption ?? null,
      display_order: nextOrder,
    })
    .select('*')
    .single();

  if (insertError) throw new Error(insertError.message);
  return data as GalleryImage;
}

// ── Update caption ────────────────────────────────────────────────────────────

export async function updateImageCaption(id: string, caption: string): Promise<boolean> {
  const { error } = await supabase
    .from('event_images')
    .update({ caption })
    .eq('id', id);

  if (error) console.error('[galleryService] updateImageCaption:', error);
  return !error;
}

// ── Reorder ───────────────────────────────────────────────────────────────────

export async function reorderImages(
  images: Pick<GalleryImage, 'id' | 'display_order'>[],
): Promise<boolean> {
  const updates = images.map(({ id, display_order }) =>
    supabase.from('event_images').update({ display_order }).eq('id', id)
  );
  const results = await Promise.all(updates);
  return results.every(r => !r.error);
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteGalleryImage(image: GalleryImage): Promise<boolean> {
  // Extract storage path from public URL
  const url    = new URL(image.image_url);
  const parts  = url.pathname.split(`/object/public/${BUCKET}/`);
  const storagePath = parts[1] ?? null;

  // Delete DB row first
  const { error: dbErr } = await supabase
    .from('event_images')
    .delete()
    .eq('id', image.id);

  if (dbErr) {
    console.error('[galleryService] deleteGalleryImage (db):', dbErr);
    return false;
  }

  // Then clean up storage (best-effort)
  if (storagePath) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
  }

  return true;
}
