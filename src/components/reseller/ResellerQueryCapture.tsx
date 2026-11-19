import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { recordResellerLinkClick } from '../../services/resellerAttribution';
import {
  captureResellerCodeFromSearch,
  eventRefFromPath,
  getStoredResellerCode,
} from '../../utils/resellerStorage';

/**
 * Captures ?r=CODE on any route, persists it for 30 days (last click wins),
 * and records a click when the visitor is on an event page. Does not read ?ref=.
 */
export default function ResellerQueryCapture() {
  const location = useLocation();

  useEffect(() => {
    captureResellerCodeFromSearch(location.search);
    const code = getStoredResellerCode();
    const eventRef = eventRefFromPath(location.pathname);
    if (code && eventRef) {
      void recordResellerLinkClick(code, eventRef);
    }
  }, [location.search, location.pathname]);

  return null;
}
