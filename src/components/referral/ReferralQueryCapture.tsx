import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { normalizeReferralCode, setPendingReferralCode } from '../../utils/referralStorage';

/**
 * Captures ?ref=CODE on any route (marketing UTM-style) using the same storage key as /ref/:code.
 */
export default function ReferralQueryCapture() {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    const code = normalizeReferralCode(ref);
    if (code) {
      setPendingReferralCode(code);
    }
  }, [location.search]);

  return null;
}
