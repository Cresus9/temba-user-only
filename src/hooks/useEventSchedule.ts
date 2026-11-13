import { useEffect, useRef, useState } from 'react';
import type { Event } from '../types/event';
import { supabase } from '../lib/supabase-client';
import { categoryKind, spanFor, type CategoryKind, type ScheduleSpan } from '../utils/eventDisplay';

export function useEventSchedule(events: Event[]) {
  const [spans, setSpans] = useState<Map<string, ScheduleSpan>>(new Map());
  const [kinds, setKinds] = useState<Map<string, CategoryKind>>(new Map());
  const [permanent, setPermanent] = useState<Event[]>([]);
  const [ready, setReady] = useState(false);

  const ids = events.map((event) => event.id).join(',');
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    const idList = ids ? ids.split(',') : [];
    if (!idList.length) return;
    let cancel = false;
    const current = eventsRef.current;

    (async () => {
      const chunks: string[][] = [];
      for (let i = 0; i < idList.length; i += 80) chunks.push(idList.slice(i, i + 80));

      const dateRows: { event_id: string; date: string }[] = [];
      for (const chunk of chunks) {
        const { data, error } = await supabase.from('event_dates').select('event_id, date').in('event_id', chunk);
        if (error) break;
        dateRows.push(...((data ?? []) as { event_id: string; date: string }[]));
      }

      const byEvent = new Map<string, string[]>();
      dateRows.forEach((row) => {
        const day = String(row.date || '').split('T')[0];
        if (!day) return;
        const list = byEvent.get(row.event_id) ?? [];
        list.push(day);
        byEvent.set(row.event_id, list);
      });

      const nextSpans = new Map<string, ScheduleSpan>();
      current.forEach((event) => {
        const dates = byEvent.get(event.id) ?? [];
        nextSpans.set(event.id, spanFor(event, dates.length ? { dates, min: '', max: '' } : null));
      });

      const kindMap = new Map<string, CategoryKind>();
      const [{ data: relations, error: relError }, { data: categories, error: catError }, { data: alwaysOn }] = await Promise.all([
        supabase.from('event_category_relations').select('event_id, category_id'),
        supabase.from('categories').select('id, name'),
        supabase.from('events').select('id, title, slug, image_url, city, location, date, time, price, currency, is_permanent, attraction_type, featured, status').eq('status', 'PUBLISHED').eq('is_permanent', true),
      ]);
      if (!relError && !catError) {
        const names = new Map<string, string>();
        (categories ?? []).forEach((cat: { id: string; name?: string; slug?: string }) => {
          names.set(cat.id, `${cat.name ?? ''} ${cat.slug ?? ''}`);
        });
        (relations ?? []).forEach((rel: { event_id: string; category_id: string }) => {
          const kind = categoryKind(names.get(rel.category_id));
          if (kind !== 'other') kindMap.set(rel.event_id, kind);
        });
      }

      if (!cancel) {
        setSpans(nextSpans);
        setKinds(kindMap);
        setPermanent((alwaysOn ?? []) as Event[]);
        setReady(true);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [ids]);

  return { spans, kinds, permanent, ready };
}
