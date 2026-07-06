import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Users, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { countryFlag } from '../../utils/eventGeo';

interface Organizer {
  organizer_id: string;
  business_name: string;
  slug: string | null;
  city: string | null;
  country_code: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  verification_status: string | null;
  followers_count: number;
  bio: string | null;
}

const display = '"Plus Jakarta Sans", Inter, sans-serif';
const PAGE_SIZE = 12;

function Pagination({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1 mt-8 pb-8">
      <button onClick={() => onChange(page - 1)} disabled={page === 1}
        className="w-9 h-9 flex items-center justify-center rounded-xl border border-line bg-paper text-ink disabled:opacity-30 hover:border-brand/40 hover:text-brand transition-colors">
        <ChevronLeft className="w-4 h-4" />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
        <button key={p} onClick={() => onChange(p)}
          className={`w-9 h-9 rounded-xl text-[13px] font-semibold border transition-colors ${p === page ? 'bg-brand text-paper border-brand' : 'bg-paper border-line text-ink hover:border-brand/40 hover:text-brand'}`}>
          {p}
        </button>
      ))}
      <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
        className="w-9 h-9 flex items-center justify-center rounded-xl border border-line bg-paper text-ink disabled:opacity-30 hover:border-brand/40 hover:text-brand transition-colors">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function OrganizersDirectory() {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('organizer_profiles')
        .select('organizer_id, business_name, slug, city, country_code, logo_url, cover_image_url, verification_status, followers_count, bio')
        .order('business_name');
      setOrganizers(data || []);
      setLoading(false);
    })();
  }, []);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, cityFilter]);

  const cities = Array.from(new Set(organizers.map(o => o.city).filter(Boolean))) as string[];
  const filtered = organizers.filter(o => {
    if (search && !o.business_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (cityFilter && o.city !== cityFilter) return false;
    return true;
  });
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-cream bg-grain py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="bg-paper border border-line rounded-2xl shadow-card p-5 sm:p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-brand grid place-items-center flex-shrink-0">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-[20px] font-extrabold text-ink leading-tight" style={{ fontFamily: display }}>Organisateurs</h1>
              <p className="text-[12px] text-ink-mute">{filtered.length} organisateur{filtered.length !== 1 ? 's' : ''} sur Temba</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un organisateur…"
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-line bg-paper text-[13px] text-ink placeholder:text-ink-mute/60 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-shadow" />
            </div>
            {cities.length > 0 && (
              <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
                className="h-10 px-3.5 rounded-xl border border-line bg-paper text-[13px] text-ink focus:outline-none focus:border-brand transition-shadow">
                <option value="">Toutes les villes</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <Users className="w-8 h-8 text-ink-mute" />
            <p className="text-[14px] font-bold text-ink">Aucun organisateur trouvé</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {paged.map(org => {
                const inner = (
                  <div className="group bg-paper border border-line rounded-2xl overflow-hidden hover:border-brand/40 hover:shadow-card transition-all h-full">
                    <div className="h-20 relative overflow-hidden">
                      {org.cover_image_url
                        ? <img src={org.cover_image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        : <div className="w-full h-full bg-gradient-to-r from-brand/15 to-accent/15" />}
                    </div>
                    <div className="px-4 pb-4">
                      <div className="flex items-end gap-3 -mt-7 mb-3">
                        <div className="w-14 h-14 rounded-xl border-2 border-paper bg-cream overflow-hidden shadow-sm flex-shrink-0">
                          {org.logo_url
                            ? <img src={org.logo_url} alt={org.business_name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full grid place-items-center bg-brand/10"><span className="text-[18px] font-extrabold text-brand" style={{ fontFamily: display }}>{org.business_name.charAt(0)}</span></div>}
                        </div>
                        {org.verification_status === 'VERIFIED' && (
                          <div className="mb-1"><CheckCircle className="w-4 h-4 text-brand" /></div>
                        )}
                      </div>
                      <p className="text-[15px] font-bold text-ink group-hover:text-brand transition-colors truncate" style={{ fontFamily: display }}>{org.business_name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                        {(org.city || org.country_code) && (
                          <span className="flex items-center gap-1 text-[11px] text-ink-mute">
                            <MapPin className="w-3 h-3" />{[org.city, org.country_code ? countryFlag(org.country_code) : null].filter(Boolean).join(' ')}
                          </span>
                        )}
                        {org.followers_count > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-ink-mute">
                            <Users className="w-3 h-3" />{org.followers_count} abonné{org.followers_count > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {org.bio && <p className="text-[12px] text-ink-mute mt-2 line-clamp-2">{org.bio}</p>}
                    </div>
                  </div>
                );
                return org.slug
                  ? <Link key={org.organizer_id} to={`/organizers/${org.slug}`} className="flex flex-col">{inner}</Link>
                  : <div key={org.organizer_id} className="flex flex-col">{inner}</div>;
              })}
            </div>
            <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
          </>
        )}
      </div>
    </div>
  );
}
