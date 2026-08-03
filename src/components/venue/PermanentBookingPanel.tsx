import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Ticket, ChevronRight, Loader, AlertCircle, Check } from 'lucide-react';
import VisitDateCalendar from './VisitDateCalendar';
import { initiatePermanentPurchase, formatOpeningHours, dayTypeLabel } from '../../services/permanentVenueService';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/formatters';
import { supabase } from '../../lib/supabase-client';
import type { VisitDate, PermanentTicketType, TimeSlot } from '../../types/event';
import toast from 'react-hot-toast';

import type { PricingOverride } from '../../services/permanentVenueService';
import DayTypePricingTable from './DayTypePricingTable';

const display = '"Plus Jakarta Sans", Inter, sans-serif';
const mono    = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace';

interface Selection {
  ticket_type_id: string;
  quantity: number;
}

interface PermanentBookingPanelProps {
  eventId: string;
  currency: string;
  eventTitle: string;
  ticketTypes?: import('../../types/event').TicketType[];
  pricingOverrides?: PricingOverride[];
}

export default function PermanentBookingPanel({
  eventId,
  currency,
  eventTitle,
  ticketTypes = [],
  pricingOverrides = [],
}: PermanentBookingPanelProps) {
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [step,          setStep]          = useState<'date' | 'tickets' | 'confirm'>('date');
  const [selectedDate,  setSelectedDate]  = useState<string | null>(null);
  const [visitData,     setVisitData]     = useState<VisitDate | null>(null);
  const [selectedSlot,  setSelectedSlot]  = useState<TimeSlot | null>(null);
  const [selections,    setSelections]    = useState<Record<string, number>>({});
  const [submitting,    setSubmitting]    = useState(false);

  // When visitData has no ticket_types (fallback path), use the prop or fetch them directly
  useEffect(() => {
    if (!visitData) return;
    if (visitData.ticket_types && visitData.ticket_types.length > 0) return;

    const dayType = visitData.day_type as 'weekday' | 'weekend' | 'holiday';

    // Helper: resolve effective price from overrides
    const effectivePrice = (ttId: string, basePrice: number) => {
      const override = pricingOverrides.find(
        o => o.ticket_type_id === ttId && o.day_type === dayType
      );
      return override?.price ?? basePrice;
    };

    // Use ticket types already loaded by the parent component
    if (ticketTypes.length > 0) {
      const mapped: PermanentTicketType[] = ticketTypes.map(tt => ({
        id:              tt.id,
        name:            tt.name,
        description:     tt.description ?? '',
        base_price:      tt.price,
        effective_price: effectivePrice(tt.id, tt.price),
        color:           '',
        max_per_order:   tt.max_per_order ?? 10,
        available:       tt.available ?? 0,
      }));
      setVisitData(prev => prev ? { ...prev, ticket_types: mapped } : prev);
      return;
    }

    // Fallback: fetch from DB if parent didn't pass ticket types
    supabase
      .from('ticket_types')
      .select('id, name, description, price, available, max_per_order, sales_enabled, status')
      .eq('event_id', eventId)
      .then(({ data }) => {
        if (!data?.length) return;
        const mapped: PermanentTicketType[] = data.map((tt: any) => ({
          id:              tt.id,
          name:            tt.name,
          description:     tt.description ?? '',
          base_price:      tt.price,
          effective_price: effectivePrice(tt.id, tt.price),
          color:           '',
          max_per_order:   tt.max_per_order ?? 10,
          available:       tt.available ?? 0,
        }));
        setVisitData(prev => prev ? { ...prev, ticket_types: mapped } : prev);
      });
  }, [visitData?.event_date_id, eventId]);

  // ── Date selected from calendar ──────────────────────────────────────────
  const handleDateSelect = (date: string, vd: VisitDate) => {
    setSelectedDate(date);
    setVisitData(vd);
    setSelections({});       // reset ticket selections when date changes
    setSelectedSlot(null);
    setStep('tickets');
  };

  // ── Ticket quantity stepper ───────────────────────────────────────────────
  const changeQty = (ticketTypeId: string, delta: number, max: number) => {
    setSelections(prev => {
      const current = prev[ticketTypeId] ?? 0;
      const next    = Math.min(Math.max(0, current + delta), max);
      return { ...prev, [ticketTypeId]: next };
    });
  };

  const totalQty    = Object.values(selections).reduce((a, b) => a + b, 0);
  const totalAmount = visitData?.ticket_types?.reduce((sum, tt) => {
    return sum + tt.effective_price * (selections[tt.id] ?? 0);
  }, 0) ?? 0;

  // ── Purchase ─────────────────────────────────────────────────────────────
  const handlePurchase = async () => {
    if (!selectedDate || totalQty === 0 || !visitData) return;

    const sels: Selection[] = Object.entries(selections)
      .filter(([, q]) => q > 0)
      .map(([ticket_type_id, quantity]) => ({ ticket_type_id, quantity }));

    setSubmitting(true);
    try {
      // Try the permanent purchase RPC first
      const result = await initiatePermanentPurchase(eventId, selectedDate, sels, {
        timeSlotId:    selectedSlot?.id,
        paymentMethod: 'CASH',
      });

      if (result.success && result.order_id) {
        // RPC succeeded — go straight to confirmation
        navigate(`/booking/confirmation/${result.order_id}`);
        return;
      }

      // RPC failed or unavailable — fall through to standard checkout
      console.warn('[PermanentBookingPanel] RPC unavailable, using standard checkout:', result.error);
    } catch {
      // ignore — fall through
    } finally {
      setSubmitting(false);
    }

    // ── Fallback: standard checkout flow ───────────────────────────────────
    // Build the same state shape the Checkout page expects
    navigate('/checkout', {
      state: {
        tickets:     Object.fromEntries(sels.map(s => [s.ticket_type_id, s.quantity])),
        totals: {
          subtotal:      totalAmount,
          processingFee: 0,
          total:         totalAmount,
        },
        currency,
        eventId,
        eventDateId:  visitData.event_date_id ?? null,
        visitDate:    selectedDate,
        isPermanent:  true,
      },
    });
  };

  // ── Formatted date ────────────────────────────────────────────────────────
  const formattedDate = selectedDate
    ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  return (
    <div className="space-y-4">
      {/* ── Step breadcrumb ── */}
      <div className="flex items-center gap-1.5 text-[12px]" style={{ fontFamily: mono }}>
        {(['date', 'tickets', 'confirm'] as const).map((s, i) => (
          <React.Fragment key={s}>
            {i > 0 && <ChevronRight className="w-3 h-3 text-ink-mute/50 flex-shrink-0" />}
            <button
              type="button"
              onClick={() => step !== 'date' && s === 'date' ? setStep('date') : undefined}
              className={`font-semibold uppercase tracking-[0.08em] transition-colors ${
                step === s
                  ? 'text-brand'
                  : s === 'confirm' && step !== 'confirm'
                    ? 'text-ink-mute/40 cursor-default'
                    : 'text-ink-mute hover:text-ink cursor-pointer'
              }`}
            >
              {s === 'date'    ? 'Date'      : ''}
              {s === 'tickets' ? 'Billets'   : ''}
              {s === 'confirm' ? 'Confirmer' : ''}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* ── Step 1: Calendar ── */}
      {step === 'date' && (
        <VisitDateCalendar
          eventId={eventId}
          selectedDate={selectedDate}
          onSelectDate={handleDateSelect}
          pricingOverrides={pricingOverrides}
          ticketTypes={ticketTypes}
        />
      )}

      {/* ── Step 2: Tickets ── */}
      {step === 'tickets' && visitData && (
        <div className="space-y-3">
          {/* Selected date banner */}
          <div className="flex items-center justify-between p-3.5 bg-brand-50 rounded-xl border border-brand/20">
            <div className="flex items-center gap-2.5 min-w-0">
              <Calendar className="w-4 h-4 text-brand flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-brand capitalize truncate">{formattedDate}</p>
                <p className="text-[11px] text-brand/70" style={{ fontFamily: mono }}>
                  {dayTypeLabel(visitData.day_type)}
                  {visitData.open_time && ` · ${formatOpeningHours(visitData.open_time, visitData.close_time)}`}
                  {visitData.remaining !== null && visitData.remaining < 9999 && ` · ${visitData.remaining} places`}
                  {/* Pricing notice if day-type overrides apply */}
                  {pricingOverrides.some(o => o.day_type === visitData.day_type) && (
                    <span className="ml-1.5 px-1.5 py-0.5 bg-brand/15 text-brand rounded text-[9px] font-bold uppercase tracking-wide">
                      tarif {dayTypeLabel(visitData.day_type).toLowerCase()}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => setStep('date')}
              className="text-[11px] font-semibold text-brand hover:text-brand/70 transition-colors flex-shrink-0 ml-2"
            >
              Changer
            </button>
          </div>

          {/* Time slots (if any) */}
          {visitData.time_slots?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-mute px-1" style={{ fontFamily: mono }}>
                Créneau horaire
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {visitData.time_slots.map(slot => (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={slot.remaining <= 0}
                    onClick={() => setSelectedSlot(slot)}
                    className={`px-3 py-2 rounded-lg text-[12px] font-semibold border transition-all ${
                      selectedSlot?.id === slot.id
                        ? 'bg-brand text-paper border-brand shadow-card'
                        : slot.remaining <= 0
                          ? 'bg-cream text-ink-mute/50 border-line cursor-not-allowed'
                          : 'bg-paper text-ink border-line hover:border-brand/40 hover:bg-brand-50'
                    }`}
                  >
                    {slot.start_time}
                    {slot.remaining <= 0 && (
                      <span className="block text-[10px] font-normal">Complet</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ticket types */}
          <div className="space-y-2">
            {(visitData.ticket_types ?? []).map(tt => {
              const qty    = selections[tt.id] ?? 0;
              const paused = tt.available <= 0;
              return (
                <div
                  key={tt.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    qty > 0
                      ? 'border-brand/30 bg-brand/5'
                      : 'border-line bg-paper'
                  } ${paused ? 'opacity-50' : ''}`}
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-[13px] font-bold text-ink">{tt.name}</p>
                    {tt.description && (
                      <p className="text-[11px] text-ink-mute mt-0.5 truncate">{tt.description}</p>
                    )}
                    <p
                      className="text-[13px] font-bold text-brand mt-1 tabular-nums"
                      style={{ fontFamily: display }}
                    >
                      {formatCurrency(tt.effective_price, currency)}
                      {tt.effective_price !== tt.base_price && (
                        <span className="ml-1.5 text-[11px] font-normal text-ink-mute line-through tabular-nums">
                          {formatCurrency(tt.base_price, currency)}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Stepper */}
                  {paused ? (
                    <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-mute px-2 py-1 bg-cream rounded">
                      Indisponible
                    </span>
                  ) : (
                    <div className="flex items-center gap-2 bg-cream border border-line rounded-lg px-2 py-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => changeQty(tt.id, -1, tt.max_per_order)}
                        disabled={qty === 0}
                        className="w-7 h-7 grid place-items-center text-brand font-bold text-[16px] hover:bg-brand-50 rounded disabled:opacity-30 transition-colors"
                      >−</button>
                      <span
                        className="w-5 text-center text-[13px] font-bold tabular-nums"
                        style={{ fontFamily: mono }}
                      >
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => changeQty(tt.id, +1, tt.max_per_order)}
                        disabled={qty >= tt.max_per_order}
                        className="w-7 h-7 grid place-items-center text-brand font-bold text-[16px] hover:bg-brand-50 rounded disabled:opacity-30 transition-colors"
                      >+</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* CTA */}
          {totalQty > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setStep('confirm')}
                className="w-full flex items-center justify-center gap-2 h-12 px-5 bg-brand hover:bg-brand/90 text-paper rounded-xl text-[14px] font-bold transition-all shadow-card active:scale-[0.98]"
              >
                <Ticket className="w-4 h-4" />
                Continuer · {formatCurrency(totalAmount, currency)}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Confirm ── */}
      {step === 'confirm' && visitData && (
        <div className="space-y-3">
          {/* Summary card */}
          <div className="bg-cream rounded-xl2 border border-line p-4 space-y-3">
            <p className="eyebrow !mb-0">Récapitulatif</p>

            <div className="flex items-center gap-2.5 text-[13px] text-ink">
              <Calendar className="w-4 h-4 text-brand flex-shrink-0" />
              <span className="capitalize font-semibold">{formattedDate}</span>
            </div>

            {selectedSlot && (
              <div className="flex items-center gap-2.5 text-[13px] text-ink">
                <Clock className="w-4 h-4 text-brand flex-shrink-0" />
                <span>{selectedSlot.start_time}</span>
              </div>
            )}

            <div className="border-t border-line pt-3 space-y-2">
              {visitData.ticket_types
                ?.filter(tt => (selections[tt.id] ?? 0) > 0)
                .map(tt => (
                  <div key={tt.id} className="flex items-center justify-between text-[13px]">
                    <span className="text-ink/80">
                      {tt.name} × {selections[tt.id]}
                    </span>
                    <span className="font-bold tabular-nums" style={{ fontFamily: mono }}>
                      {formatCurrency(tt.effective_price * selections[tt.id]!, currency)}
                    </span>
                  </div>
                ))}
            </div>

            <div className="flex items-baseline justify-between pt-3 border-t border-line">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-mute" style={{ fontFamily: mono }}>
                Total
              </p>
              <p className="text-[20px] font-bold text-ink tabular-nums" style={{ fontFamily: display }}>
                {formatCurrency(totalAmount, currency)}
              </p>
            </div>
          </div>

          {/* Note for logged-out users */}
          {!user && (
            <div className="flex items-start gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-amber-800 leading-relaxed">
                Vous n'êtes pas connecté. Votre billet sera envoyé à votre adresse email.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep('tickets')}
              className="flex-1 h-11 px-4 rounded-xl border border-line bg-paper hover:bg-cream text-[13px] font-medium text-ink transition-colors"
            >
              Retour
            </button>
            <button
              type="button"
              onClick={handlePurchase}
              disabled={submitting}
              className="flex-[2] flex items-center justify-center gap-2 h-11 px-5 bg-brand hover:bg-brand/90 text-paper rounded-xl text-[13px] font-bold transition-all shadow-card active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Confirmer et payer
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
