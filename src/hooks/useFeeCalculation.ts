import { useEffect, useMemo, useState } from 'react';
import { ServiceFeeResult, ServiceFeeSelection } from '../services/serviceFeeService';
import { serviceFeeService } from '../services/serviceFeeService';

export function useFeeCalculation(eventId: string | undefined, selections: ServiceFeeSelection[]) {
  const [fees, setFees] = useState<ServiceFeeResult>({ total_buyer_fees: 0, total_organizer_fees: 0, fee_breakdown: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const depsKey = useMemo(() => JSON.stringify({ eventId, selections }), [eventId, selections]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!eventId || selections.length === 0) {
        setFees({ total_buyer_fees: 0, total_organizer_fees: 0, fee_breakdown: [] });
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await serviceFeeService.calculateFees(eventId, selections);
        if (!cancelled) setFees(result);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Erreur de calcul des frais');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const handle = setTimeout(run, 150); // debounce
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [depsKey]);

  return { fees, loading, error };
}


