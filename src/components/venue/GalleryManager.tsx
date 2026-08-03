import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Trash2, ArrowUp, ArrowDown, Edit2, Check, X, Images, Loader } from 'lucide-react';
import {
  getGalleryImages,
  uploadGalleryImage,
  updateImageCaption,
  reorderImages,
  deleteGalleryImage,
  type GalleryImage,
} from '../../services/galleryService';
import toast from 'react-hot-toast';

const mono = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';
const MAX_IMAGES = 20;

interface GalleryManagerProps {
  eventId: string;
}

export default function GalleryManager({ eventId }: GalleryManagerProps) {
  const [images,    setImages]    = useState<GalleryImage[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [dragOver,  setDragOver]  = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getGalleryImages(eventId);
    setImages(data);
    setLoading(false);
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  // ── Upload ──────────────────────────────────────────────────────────────
  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    let succeeded = 0;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} n'est pas une image.`);
        continue;
      }
      try {
        const img = await uploadGalleryImage(eventId, file);
        if (img) {
          setImages(prev => [...prev, img]);
          succeeded++;
        }
      } catch (err: any) {
        toast.error(err?.message ?? `Échec de l'upload de ${file.name}`);
      }
    }

    if (succeeded) toast.success(`${succeeded} photo${succeeded > 1 ? 's' : ''} ajoutée${succeeded > 1 ? 's' : ''}`);
    setUploading(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  // ── Reorder ──────────────────────────────────────────────────────────────
  const move = async (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= images.length) return;

    const reordered = [...images];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];

    // Assign fresh display_order values
    const updated = reordered.map((img, i) => ({ ...img, display_order: i }));
    setImages(updated);
    await reorderImages(updated.map(({ id, display_order }) => ({ id, display_order })));
  };

  // ── Edit caption ─────────────────────────────────────────────────────────
  const startEdit = (img: GalleryImage) => {
    setEditingId(img.id);
    setEditCaption(img.caption ?? '');
  };

  const saveCaption = async (id: string) => {
    const ok = await updateImageCaption(id, editCaption);
    if (ok) {
      setImages(prev => prev.map(i => i.id === id ? { ...i, caption: editCaption } : i));
      toast.success('Légende mise à jour');
    } else {
      toast.error('Impossible de mettre à jour la légende');
    }
    setEditingId(null);
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (img: GalleryImage) => {
    if (!window.confirm('Supprimer cette photo ? Cette action est irréversible.')) return;
    const ok = await deleteGalleryImage(img);
    if (ok) {
      setImages(prev => prev.filter(i => i.id !== img.id));
      toast.success('Photo supprimée');
    } else {
      toast.error('Impossible de supprimer la photo');
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Images className="w-4 h-4 text-brand" />
          <p className="text-[13px] font-bold text-ink">
            Galerie photos
          </p>
          <span
            className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-brand/10 text-brand"
            style={{ fontFamily: mono }}
          >
            {images.length}/{MAX_IMAGES}
          </span>
        </div>
      </div>

      {/* ── Upload zone ── */}
      {images.length < MAX_IMAGES && (
        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-all ${
            dragOver
              ? 'border-brand bg-brand/5'
              : 'border-line hover:border-brand/40 hover:bg-cream'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-ink-mute">
              <Loader className="w-5 h-5 animate-spin text-brand" />
              <p className="text-[12px]">Upload en cours…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-5 h-5 text-ink-mute" />
              <p className="text-[13px] font-semibold text-ink">
                Glisser des photos ici ou cliquer pour choisir
              </p>
              <p className="text-[11px] text-ink-mute">
                JPG, PNG, WebP · max 5 Mo par photo · {MAX_IMAGES - images.length} emplacements restants
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Image grid ── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] bg-cream-deep rounded-xl animate-pulse" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <p className="text-[13px] text-ink-mute text-center py-4">
          Aucune photo pour l'instant. Ajoutez-en pour enrichir votre page attraction.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img, idx) => (
            <div
              key={img.id}
              className="relative group rounded-xl overflow-hidden border border-line bg-cream-deep"
            >
              {/* Photo */}
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={img.image_url}
                  alt={img.caption ?? `Photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Order badge */}
              <span
                className="absolute top-1.5 left-1.5 w-5 h-5 grid place-items-center rounded-full bg-ink/70 text-paper text-[9px] font-bold"
                style={{ fontFamily: mono }}
              >
                {idx + 1}
              </span>

              {/* Action overlay */}
              <div className="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                <button
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="w-7 h-7 grid place-items-center bg-paper/90 rounded-lg text-ink hover:bg-paper disabled:opacity-30 transition-colors"
                  title="Monter"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => move(idx, 1)}
                  disabled={idx === images.length - 1}
                  className="w-7 h-7 grid place-items-center bg-paper/90 rounded-lg text-ink hover:bg-paper disabled:opacity-30 transition-colors"
                  title="Descendre"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => startEdit(img)}
                  className="w-7 h-7 grid place-items-center bg-paper/90 rounded-lg text-ink hover:bg-paper transition-colors"
                  title="Modifier la légende"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(img)}
                  className="w-7 h-7 grid place-items-center bg-red-500 rounded-lg text-paper hover:bg-red-600 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Caption editor */}
              <div className="p-2">
                {editingId === img.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={editCaption}
                      onChange={e => setEditCaption(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveCaption(img.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      placeholder="Légende…"
                      autoFocus
                      className="flex-1 min-w-0 text-[11px] bg-cream border border-line rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                    <button
                      onClick={() => saveCaption(img.id)}
                      className="w-6 h-6 grid place-items-center rounded bg-brand text-paper hover:bg-brand/90 transition-colors flex-shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="w-6 h-6 grid place-items-center rounded bg-cream border border-line text-ink-mute hover:text-ink transition-colors flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <p
                    className="text-[10px] text-ink-mute truncate cursor-pointer hover:text-ink transition-colors"
                    onClick={() => startEdit(img)}
                  >
                    {img.caption || <span className="italic">Ajouter une légende…</span>}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
