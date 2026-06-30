import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, CheckCheck, Search, Calendar, Tag, Ticket, Loader, ChevronDown } from 'lucide-react';
import { notificationService, Notification } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/TranslationContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const display = '"Plus Jakarta Sans", Inter, sans-serif';
const mono    = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

type FilterType = 'all' | 'unread' | 'read';
type SortType   = 'newest' | 'oldest';

const TYPE_META: Record<string, { label: string; bgClass: string; textClass: string; Icon: React.ComponentType<any> }> = {
  ORDER_CONFIRMATION: { label: 'Commande',      bgClass: 'bg-emerald-50', textClass: 'text-emerald-700', Icon: Ticket   },
  EVENT_REMINDER:     { label: 'Rappel',         bgClass: 'bg-brand-50',   textClass: 'text-brand',       Icon: Calendar },
  TICKET_TRANSFER:    { label: 'Transfert',      bgClass: 'bg-accent/10',  textClass: 'text-accent',      Icon: Tag      },
  SUPPORT_REPLY:      { label: 'Support',        bgClass: 'bg-amber-50',   textClass: 'text-amber-700',   Icon: Bell     },
  ACCOUNT_UPDATE:     { label: 'Compte',         bgClass: 'bg-cream',      textClass: 'text-ink-mute',    Icon: Bell     },
  SYSTEM:             { label: 'Système',        bgClass: 'bg-cream',      textClass: 'text-ink-mute',    Icon: Bell     },
};

const ITEMS_PER_PAGE = 20;

// ── Tiny custom select (avoids OS-dark native dropdown) ─────────────────────
function InlineSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);
  const selected        = options.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 h-10 px-3.5 rounded-xl border border-line bg-paper text-[13px] font-medium text-ink hover:bg-cream transition-colors"
      >
        {selected?.label}
        <ChevronDown className={`w-3.5 h-3.5 text-ink-mute transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-44 bg-paper border border-line rounded-xl shadow-pop z-50 py-1.5 overflow-hidden">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2 text-[13px] transition-colors ${
                value === opt.value
                  ? 'font-semibold text-brand bg-brand-50'
                  : 'text-ink hover:bg-cream'
              }`}
            >
              {opt.label}
              {value === opt.value && <Check className="w-3 h-3 text-brand" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Notifications() {
  const [notifications, setNotifications]   = useState<Notification[]>([]);
  const [loading, setLoading]               = useState(true);
  const [filter, setFilter]                 = useState<FilterType>('all');
  const [sort, setSort]                     = useState<SortType>('newest');
  const [searchTerm, setSearchTerm]         = useState('');
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set());
  const [processingIds, setProcessingIds]   = useState<Set<string>>(new Set());
  const [page, setPage]                     = useState(1);
  const [hasMore, setHasMore]               = useState(true);
  const { isAuthenticated }                 = useAuth();
  const { t }                               = useTranslation();

  useEffect(() => {
    if (!isAuthenticated) return;
    loadNotifications(true);
  }, [isAuthenticated, filter, sort]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const sub = notificationService.subscribeToNotifications(n => {
      setNotifications(prev => [n, ...prev]);
    });
    return () => sub.unsubscribe();
  }, [isAuthenticated]);

  const loadNotifications = async (reset = false) => {
    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;
      let data = await notificationService.getUserNotifications(ITEMS_PER_PAGE * currentPage);
      if (filter === 'unread') data = data.filter(n => !n.read_at);
      if (filter === 'read')   data = data.filter(n =>  n.read_at);
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        data = data.filter(n =>
          n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q)
        );
      }
      data.sort((a, b) => {
        const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return sort === 'newest' ? diff : -diff;
      });
      if (reset) { setNotifications(data); setPage(1); }
      else        setNotifications(prev => [...prev, ...data.slice(prev.length)]);
      setHasMore(data.length >= ITEMS_PER_PAGE * currentPage);
    } catch {
      toast.error('Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    if (processingIds.has(id)) return;
    try {
      setProcessingIds(prev => new Set([...prev, id]));
      await notificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
      );
    } catch { toast.error('Erreur'); }
    finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      toast.success('Toutes les notifications ont été marquées comme lues');
    } catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  };

  const handleBulkMarkAsRead = async () => {
    if (!selectedIds.size) return;
    try {
      setLoading(true);
      await Promise.all(Array.from(selectedIds).map(id => notificationService.markAsRead(id)));
      setNotifications(prev =>
        prev.map(n => selectedIds.has(n.id) ? { ...n, read_at: new Date().toISOString() } : n)
      );
      toast.success(`${selectedIds.size} notifications marquées comme lues`);
      setSelectedIds(new Set());
    } catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  };

  const toggleSelection   = (id: string) => setSelectedIds(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s;
  });
  const selectAll         = () => setSelectedIds(new Set(filteredNotifications.map(n => n.id)));
  const clearSelection    = () => setSelectedIds(new Set());

  const handleNotificationClick = (n: Notification) => {
    if (!n.read_at) handleMarkAsRead(n.id);
    if (n.data?.action_url)  window.location.href = n.data.action_url;
    else if (n.data?.order_id)  window.location.href = `/booking/confirmation/${n.data.order_id}`;
    else if (n.data?.event_id)  window.location.href = `/events/${n.data.event_id}`;
  };

  const formatTimeAgo = (ds: string) => {
    const m = Math.floor((Date.now() - new Date(ds).getTime()) / 60000);
    if (m < 1)    return "À l'instant";
    if (m < 60)   return `Il y a ${m}min`;
    const h = Math.floor(m / 60);
    if (h < 24)   return `Il y a ${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7)    return `Il y a ${d}j`;
    return new Date(ds).toLocaleDateString('fr-FR');
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread' && n.read_at)  return false;
    if (filter === 'read'   && !n.read_at) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!n.title.toLowerCase().includes(q) && !n.message.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read_at).length;

  // ── Unauthenticated ──────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-cream bg-grain flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand/15 grid place-items-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-brand" />
          </div>
          <h2 className="text-[18px] font-bold text-ink mb-1" style={{ fontFamily: display }}>
            Connexion requise
          </h2>
          <p className="text-[13px] text-ink-mute mb-5">
            Connectez-vous pour voir vos notifications
          </p>
          <Link
            to="/login"
            className="inline-flex items-center px-5 py-2.5 rounded-xl bg-brand text-paper text-[13px] font-bold hover:bg-brand/90 transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  const allSelected = selectedIds.size === filteredNotifications.length && filteredNotifications.length > 0;

  return (
    <div className="min-h-screen bg-cream bg-grain py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-4">

        {/* ── Header card ── */}
        <div className="bg-paper rounded-2xl border border-line shadow-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-brand grid place-items-center flex-shrink-0 shadow-card">
                <Bell className="w-5 h-5 text-paper" />
              </div>
              <div>
                <h1 className="text-[20px] font-bold text-ink leading-tight" style={{ fontFamily: display }}>
                  Notifications
                </h1>
                <p className="text-[12px] text-ink-mute" style={{ fontFamily: mono }}>
                  {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Toutes lues'}
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={loading}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-line bg-paper text-[12px] font-semibold text-ink hover:bg-cream active:scale-[0.97] transition-all disabled:opacity-50"
              >
                <CheckCheck className="w-4 h-4 text-brand" />
                Tout marquer comme lu
              </button>
            )}
          </div>

          {/* Search + filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute" />
              <input
                type="text"
                placeholder="Rechercher dans les notifications…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-line bg-paper text-[13px] text-ink placeholder:text-ink-mute/60 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-shadow"
              />
            </div>
            <div className="flex gap-2">
              <InlineSelect<FilterType>
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all',    label: 'Toutes'    },
                  { value: 'unread', label: 'Non lues'  },
                  { value: 'read',   label: 'Lues'      },
                ]}
              />
              <InlineSelect<SortType>
                value={sort}
                onChange={setSort}
                options={[
                  { value: 'newest', label: 'Plus récentes'  },
                  { value: 'oldest', label: 'Plus anciennes' },
                ]}
              />
            </div>
          </div>

          {/* Bulk action banner */}
          {selectedIds.size > 0 && (
            <div className="mt-3 flex items-center justify-between p-3 bg-brand-50 border border-brand/15 rounded-xl">
              <span className="text-[12px] font-semibold text-brand">
                {selectedIds.size} sélectionnée{selectedIds.size > 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBulkMarkAsRead}
                  className="text-[12px] font-semibold text-brand hover:text-brand/70 transition-colors"
                >
                  Marquer comme lues
                </button>
                <button
                  onClick={clearSelection}
                  className="text-[12px] text-ink-mute hover:text-ink transition-colors"
                >
                  Désélectionner
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── List card ── */}
        <div className="bg-paper rounded-2xl border border-line shadow-card overflow-hidden">
          {loading && notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader className="w-6 h-6 text-brand animate-spin" />
              <p className="text-[13px] text-ink-mute">Chargement des notifications…</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-cream border border-line grid place-items-center">
                <Bell className="w-7 h-7 text-ink-mute" />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-bold text-ink mb-1" style={{ fontFamily: display }}>
                  {searchTerm ? 'Aucune notification trouvée' : 'Aucune notification'}
                </p>
                <p className="text-[12px] text-ink-mute">
                  {searchTerm
                      ? "Essayez avec d'autres mots-clés"
                    : 'Vous recevrez ici vos notifications importantes'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Select all */}
              <div className="px-4 py-3 bg-cream border-b border-line">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => allSelected ? clearSelection() : selectAll()}
                    className="w-4 h-4 rounded border-line text-brand focus:ring-brand/20 cursor-pointer"
                  />
                  <span className="text-[12px] font-semibold text-ink-mute">
                    Sélectionner tout ({filteredNotifications.length})
                  </span>
                </label>
              </div>

              {/* Rows */}
              <div className="divide-y divide-line">
                {filteredNotifications.map(notif => {
                  const meta = TYPE_META[notif.type] ?? TYPE_META.SYSTEM;
                  const Icon = meta.Icon;
                  const unread = !notif.read_at;

                  return (
                    <div
                      key={notif.id}
                      className={`flex items-start gap-3 px-4 py-4 transition-colors hover:bg-cream ${
                        unread ? 'bg-brand-50 border-l-2 border-brand' : 'bg-paper'
                      }`}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedIds.has(notif.id)}
                        onChange={() => toggleSelection(notif.id)}
                        className="mt-1 w-4 h-4 rounded border-line text-brand focus:ring-brand/20 flex-shrink-0 cursor-pointer"
                      />

                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl grid place-items-center flex-shrink-0 ${meta.bgClass}`}>
                        <Icon className={`w-4 h-4 ${meta.textClass}`} />
                      </div>

                      {/* Content */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className={`text-[13px] leading-snug ${unread ? 'font-bold text-ink' : 'font-semibold text-ink'}`}>
                            {notif.title}
                          </p>
                          {unread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-[12px] text-ink-mute leading-relaxed mb-2">
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.bgClass} ${meta.textClass}`}>
                            {meta.label}
                          </span>
                          <span className="text-[10px] text-ink-mute tabular-nums" style={{ fontFamily: mono }}>
                            {formatTimeAgo(notif.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Mark read */}
                      {unread && (
                        <button
                          onClick={e => { e.stopPropagation(); handleMarkAsRead(notif.id); }}
                          disabled={processingIds.has(notif.id)}
                          className="w-7 h-7 rounded-lg border border-line bg-paper grid place-items-center text-ink-mute hover:text-brand hover:border-brand/30 hover:bg-brand-50 transition-colors flex-shrink-0 disabled:opacity-40"
                          title="Marquer comme lu"
                        >
                          {processingIds.has(notif.id)
                            ? <Loader className="w-3 h-3 animate-spin" />
                            : <Check className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Load more */}
              {hasMore && (
                <div className="px-4 py-4 border-t border-line text-center">
                  <button
                    onClick={() => { setPage(p => p + 1); loadNotifications(); }}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-line bg-paper text-[12px] font-semibold text-ink hover:bg-cream active:scale-[0.97] transition-all disabled:opacity-50"
                  >
                    {loading
                      ? <><Loader className="w-4 h-4 animate-spin text-brand" /> Chargement…</>
                      : 'Charger plus'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
