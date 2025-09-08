import { supabase } from '../lib/supabase-client';

export interface ServiceFeeSelection {
  ticket_type_id: string;
  quantity: number;
  price: number;
}

export interface ServiceFeeBreakdownItem {
  rule_id: string | null;
  rule_name: string;
  scope: string;
  fee_type: string;
  fee_amount: number;
  applies_to: string;
  ticket_type_id: string;
  base_amount: number;
}

export interface ServiceFeeResult {
  total_buyer_fees: number;
  total_organizer_fees: number;
  fee_breakdown: ServiceFeeBreakdownItem[];
}

class ServiceFeeService {
  async calculateFees(eventId: string, selections: ServiceFeeSelection[]): Promise<ServiceFeeResult> {
    try {
      const { data, error } = await supabase.rpc('calculate_service_fees', {
        p_event_id: eventId,
        p_ticket_selections: selections
      });

      if (error) throw error;

      // Normalize result shape
      const result: ServiceFeeResult = {
        total_buyer_fees: Number(data?.total_buyer_fees || 0),
        total_organizer_fees: Number(data?.total_organizer_fees || 0),
        fee_breakdown: (data?.fee_breakdown || []) as ServiceFeeBreakdownItem[]
      };

      return result;
    } catch (err) {
      console.error('Service fee RPC failed, using table-based fallback:', err);
      // Fallback path: derive from active service_fee_rules (supports TICKET_TYPE > EVENT > GLOBAL)
      try {
        // Fetch relevant rules via three reliable queries
        const ticketTypeIds = selections.map(s => s.ticket_type_id);

        const [{ data: ttRules, error: ttErr }, { data: evRules, error: evErr }, { data: globalRules, error: glErr }] = await Promise.all([
          supabase.from('service_fee_rules').select('*').eq('active', true).eq('scope', 'TICKET_TYPE').in('ticket_type_id', ticketTypeIds.length ? ticketTypeIds : ['00000000-0000-0000-0000-000000000000']),
          supabase.from('service_fee_rules').select('*').eq('active', true).eq('scope', 'EVENT').eq('event_id', eventId),
          supabase.from('service_fee_rules').select('*').eq('active', true).eq('scope', 'GLOBAL')
        ]);

        if (ttErr) throw ttErr;
        if (evErr) throw evErr;
        if (glErr) throw glErr;

        const pickRule = (ticket_type_id?: string) => {
          const tt = (ttRules || []).filter(r => r.ticket_type_id === ticket_type_id).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
          if (tt) return tt as any;
          const ev = (evRules || []).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
          if (ev) return ev as any;
          const gl = (globalRules || []).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
          if (gl) return gl as any;
          return null;
        };

        let totalBuyer = 0;
        let totalOrg = 0;
        const breakdown: ServiceFeeBreakdownItem[] = [];

        for (const s of selections) {
          const rule: any = pickRule(s.ticket_type_id);
          if (!rule) continue;
          let feeAmount = 0;
          if (rule.fee_type === 'PERCENTAGE') {
            feeAmount = (s.price * s.quantity) * Number(rule.fee_value || 0);
          } else if (rule.fee_type === 'FIXED') {
            feeAmount = Number(rule.fee_value || 0) * s.quantity;
          } else {
            feeAmount = (s.price * s.quantity) * Number(rule.fee_value || 0);
          }
          if (rule.minimum_fee != null && feeAmount < Number(rule.minimum_fee)) feeAmount = Number(rule.minimum_fee);
          if (rule.maximum_fee != null && feeAmount > Number(rule.maximum_fee)) feeAmount = Number(rule.maximum_fee);

          const applies = String(rule.applies_to || 'BUYER');
          if (applies === 'BUYER') totalBuyer += feeAmount; else if (applies === 'ORGANIZER') totalOrg += feeAmount; else { totalBuyer += feeAmount / 2; totalOrg += feeAmount / 2; }

          breakdown.push({
            rule_id: rule.id || null,
            rule_name: rule.name || 'Service Fee',
            scope: rule.scope || 'GLOBAL',
            fee_type: rule.fee_type || 'PERCENTAGE',
            fee_amount: feeAmount,
            applies_to: applies,
            ticket_type_id: s.ticket_type_id,
            base_amount: s.price * s.quantity
          });
        }

        return {
          total_buyer_fees: totalBuyer,
          total_organizer_fees: totalOrg,
          fee_breakdown: breakdown
        };
      } catch (fallbackErr) {
        console.error('Table-based fee fallback failed, using minimal 2% fallback:', fallbackErr);
        const subtotal = selections.reduce((sum, s) => sum + s.price * s.quantity, 0);
        return {
          total_buyer_fees: subtotal * 0.02,
          total_organizer_fees: 0,
          fee_breakdown: []
        };
      }
    }
  }
}

export const serviceFeeService = new ServiceFeeService();


