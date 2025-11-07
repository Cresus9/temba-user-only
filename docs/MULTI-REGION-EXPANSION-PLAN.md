# Multi-Region Expansion Plan: Africa + US

## Executive Summary

This plan outlines the technical implementation for expanding Temba to support event listings in both Africa (current) and the United States. The expansion requires database schema changes, payment provider routing, UI/UX updates, and regional configuration management.

---

## 1. Database Schema Changes

### 1.1 Add Region Support to Events Table

```sql
-- Migration: Add region and country fields to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS region TEXT CHECK (region IN ('AFRICA', 'US', 'GLOBAL')),
ADD COLUMN IF NOT EXISTS country_code TEXT, -- ISO 3166-1 alpha-2 (e.g., 'BF', 'US', 'GH')
ADD COLUMN IF NOT EXISTS country_name TEXT, -- Full country name
ADD COLUMN IF NOT EXISTS state_code TEXT, -- For US: state abbreviation (e.g., 'CA', 'NY')
ADD COLUMN IF NOT EXISTS city TEXT, -- City name (separate from location)
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC', -- IANA timezone (e.g., 'America/New_York', 'Africa/Ouagadougou')
ADD COLUMN IF NOT EXISTS coordinates POINT, -- PostGIS point for lat/lng
ADD COLUMN IF NOT EXISTS address_line1 TEXT,
ADD COLUMN IF NOT EXISTS address_line2 TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Create indexes for region-based queries
CREATE INDEX IF NOT EXISTS idx_events_region ON events(region);
CREATE INDEX IF NOT EXISTS idx_events_country_code ON events(country_code);
CREATE INDEX IF NOT EXISTS idx_events_state_code ON events(state_code) WHERE state_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_city ON events(city);
CREATE INDEX IF NOT EXISTS idx_events_region_status ON events(region, status);

-- Update existing events to default to AFRICA region
UPDATE events 
SET region = 'AFRICA', 
    country_code = 'BF', 
    country_name = 'Burkina Faso',
    currency = 'XOF'
WHERE region IS NULL;
```

### 1.2 Create Regions Configuration Table

```sql
-- Migration: Create regions configuration table
CREATE TABLE IF NOT EXISTS regions (
  id TEXT PRIMARY KEY, -- 'AFRICA', 'US', etc.
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  currency TEXT NOT NULL, -- Default currency for region
  default_payment_provider TEXT NOT NULL, -- 'pawapay' or 'stripe'
  supported_currencies TEXT[] NOT NULL, -- Array of supported currencies
  timezone TEXT NOT NULL,
  locale TEXT NOT NULL, -- For i18n (e.g., 'fr-FR', 'en-US')
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default regions
INSERT INTO regions (id, name, display_name, currency, default_payment_provider, supported_currencies, timezone, locale) VALUES
('AFRICA', 'Africa', 'Afrique', 'XOF', 'pawapay', ARRAY['XOF', 'GHS', 'NGN', 'KES', 'ZAR'], 'Africa/Ouagadougou', 'fr-FR'),
('US', 'United States', 'United States', 'USD', 'stripe', ARRAY['USD'], 'America/New_York', 'en-US')
ON CONFLICT (id) DO NOTHING;

-- Create index
CREATE INDEX IF NOT EXISTS idx_regions_active ON regions(is_active);
```

### 1.3 Update Currency Handling

```sql
-- Migration: Ensure currency field supports both XOF and USD
ALTER TABLE events 
DROP CONSTRAINT IF EXISTS events_currency_check;

ALTER TABLE events
ADD CONSTRAINT events_currency_check 
CHECK (currency IN ('XOF', 'USD', 'EUR', 'GHS', 'NGN', 'KES', 'ZAR'));

-- Update ticket_types to support multiple currencies
ALTER TABLE ticket_types
DROP CONSTRAINT IF EXISTS ticket_types_currency_check;

-- Note: ticket_types don't have currency field, they inherit from events
```

---

## 2. Payment Provider Routing

### 2.1 Payment Provider Selection Logic

**File**: `src/services/paymentProviderService.ts` (new)

```typescript
export interface PaymentProviderConfig {
  region: 'AFRICA' | 'US' | 'GLOBAL';
  currency: string;
  provider: 'pawapay' | 'stripe';
  enabled: boolean;
}

export class PaymentProviderService {
  /**
   * Determines the appropriate payment provider based on event region and currency
   */
  static getPaymentProvider(
    eventRegion: string,
    eventCurrency: string
  ): 'pawapay' | 'stripe' {
    // US events always use Stripe
    if (eventRegion === 'US') {
      return 'stripe';
    }
    
    // Africa events use pawaPay for XOF, Stripe for USD (if needed)
    if (eventRegion === 'AFRICA') {
      if (eventCurrency === 'XOF' || eventCurrency === 'GHS' || eventCurrency === 'NGN') {
        return 'pawapay';
      }
      // Fallback to Stripe for other currencies in Africa
      return 'stripe';
    }
    
    // Global events: default to Stripe (more widely accepted)
    return 'stripe';
  }
  
  /**
   * Gets available payment methods for a region
   */
  static getAvailablePaymentMethods(region: string): string[] {
    if (region === 'US') {
      return ['credit_card']; // Stripe only
    }
    
    if (region === 'AFRICA') {
      return ['mobile_money', 'credit_card']; // pawaPay + Stripe
    }
    
    return ['credit_card']; // Default
  }
}
```

### 2.2 Update Checkout Flow

**File**: `src/components/checkout/CheckoutForm.tsx`

- Detect event region from event data
- Show appropriate payment methods based on region
- Route to correct payment provider (pawaPay or Stripe)
- Handle currency conversion if needed

---

## 3. Frontend UI/UX Updates

### 3.1 Region Selector Component

**File**: `src/components/RegionSelector.tsx` (new)

```typescript
interface RegionSelectorProps {
  selectedRegion: string;
  onRegionChange: (region: string) => void;
  showLabel?: boolean;
}

export default function RegionSelector({ 
  selectedRegion, 
  onRegionChange,
  showLabel = true 
}: RegionSelectorProps) {
  const regions = [
    { id: 'AFRICA', name: 'Afrique', flag: '🌍', currency: 'XOF' },
    { id: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD' },
    { id: 'ALL', name: 'All Regions', flag: '🌎', currency: null }
  ];
  
  // Component implementation...
}
```

### 3.2 Update Events Page

**File**: `src/pages/Events.tsx`

- Add region filter dropdown
- Filter events by selected region
- Show region badge on event cards
- Update search to include region context

### 3.3 Update Event Card Component

**File**: `src/components/EventCard.tsx`

- Display region/country flag
- Show currency with proper formatting
- Indicate payment methods available
- Show timezone-aware event time

### 3.4 Location Input Enhancement

**File**: `src/components/admin/EventForm.tsx`

- Add region selector
- Add country/state/city dropdowns
- Add timezone selector
- Add address fields (for US events)
- Add coordinates picker (map integration)

---

## 4. Backend API Updates

### 4.1 Event Creation/Update Edge Function

**File**: `supabase/functions/create-event/index.ts`

- Validate region and country codes
- Set default currency based on region
- Validate payment provider compatibility
- Store timezone information

### 4.2 Event Query Enhancements

**File**: `supabase/functions/get-events/index.ts` (if exists)

- Add region filter parameter
- Add country/state/city filters
- Return region metadata with events
- Support location-based sorting

---

## 5. Internationalization (i18n)

### 5.1 Language Support

- **Africa**: French (fr-FR) - current
- **US**: English (en-US) - new
- **Global**: English (en-US) as default

### 5.2 Translation Files

**Structure**:
```
src/locales/
  fr-FR/
    common.json
    events.json
    payments.json
  en-US/
    common.json
    events.json
    payments.json
```

### 5.3 Currency Formatting

**File**: `src/utils/currencyFormatter.ts` (new)

```typescript
export function formatCurrency(
  amount: number, 
  currency: string, 
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'XOF' ? 0 : 2,
    maximumFractionDigits: currency === 'XOF' ? 0 : 2,
  }).format(amount);
}
```

---

## 6. Timezone Handling

### 6.1 Timezone Utilities

**File**: `src/utils/timezoneUtils.ts` (new)

```typescript
import { formatInTimeZone } from 'date-fns-tz';

export function formatEventTime(
  date: string, 
  time: string, 
  timezone: string
): string {
  const dateTime = new Date(`${date}T${time}`);
  return formatInTimeZone(dateTime, timezone, 'PPpp');
}

export function getLocalTime(eventTime: string, eventTimezone: string): Date {
  // Convert event time to user's local timezone
  // Implementation...
}
```

### 6.2 Display Event Times

- Show event time in event's timezone
- Optionally show in user's local timezone
- Display timezone abbreviation (EST, GMT, etc.)

---

## 7. Search and Discovery

### 7.1 Enhanced Search

**File**: `src/pages/Events.tsx`

- Add region filter to search
- Add country/state filter
- Add city filter
- Add distance-based search (for US: "Events near me")
- Add map view for location-based browsing

### 7.2 Location Autocomplete

**File**: `src/components/LocationAutocomplete.tsx` (new)

- Use Google Maps API or similar for US addresses
- Support city/state/country selection
- Validate addresses
- Store coordinates

---

## 8. Payment Flow Updates

### 8.1 Checkout Page

**File**: `src/pages/Checkout.tsx`

- Detect event region
- Show appropriate payment methods
- Route to correct payment provider
- Handle currency conversion display

### 8.2 Payment Service Updates

**File**: `src/services/paymentService.ts`

- Add region-aware payment creation
- Route to pawaPay or Stripe based on region
- Handle currency conversion for cross-region payments

---

## 9. Admin Panel Updates

### 9.1 Event Management

**File**: `src/pages/admin/EventManagement.tsx`

- Add region selector
- Add country/state/city fields
- Add timezone selector
- Add address fields for US events
- Show region badge in event list

### 9.2 Analytics Dashboard

**File**: `src/pages/admin/Analytics.tsx` (if exists)

- Add region-based analytics
- Show sales by region
- Compare performance across regions

---

## 10. Migration Strategy

### Phase 1: Database & Backend (Week 1)
1. ✅ Create regions table
2. ✅ Add region fields to events table
3. ✅ Migrate existing events to AFRICA region
4. ✅ Update payment provider routing logic
5. ✅ Test payment flows for both regions

### Phase 2: Frontend Core (Week 2)
1. ✅ Add region selector component
2. ✅ Update Events page with region filter
3. ✅ Update EventCard to show region info
4. ✅ Add timezone handling utilities
5. ✅ Update currency formatting

### Phase 3: Admin & Event Creation (Week 3)
1. ✅ Update event creation form
2. ✅ Add location/address fields
3. ✅ Add timezone selector
4. ✅ Update event management panel
5. ✅ Test event creation for both regions

### Phase 4: Search & Discovery (Week 4)
1. ✅ Enhance search with region filters
2. ✅ Add location autocomplete
3. ✅ Add map view (optional)
4. ✅ Add "Events near me" feature (US)
5. ✅ Test search functionality

### Phase 5: Testing & Polish (Week 5)
1. ✅ End-to-end testing
2. ✅ Payment flow testing (both regions)
3. ✅ UI/UX polish
4. ✅ Performance optimization
5. ✅ Documentation

---

## 11. Technical Considerations

### 11.1 Currency Conversion

- **Display**: Show prices in event's currency
- **Payment**: Charge in event's currency
- **Conversion**: Use existing FX rate system for Stripe (USD)
- **pawaPay**: Native XOF support (no conversion needed)

### 11.2 Payment Provider Limits

- **pawaPay**: Africa only, XOF/GHS/NGN
- **Stripe**: Global, USD/EUR (and others)
- **Fallback**: If pawaPay unavailable, use Stripe for Africa

### 11.3 Data Migration

```sql
-- Script to migrate existing events
UPDATE events 
SET 
  region = 'AFRICA',
  country_code = 'BF',
  country_name = 'Burkina Faso',
  currency = COALESCE(currency, 'XOF'),
  timezone = 'Africa/Ouagadougou'
WHERE region IS NULL;
```

### 11.4 Performance

- Add database indexes for region-based queries
- Cache region configuration
- Optimize event queries with region filters
- Use CDN for region-specific assets

---

## 12. Testing Checklist

### 12.1 Functional Testing
- [ ] Create event in Africa region
- [ ] Create event in US region
- [ ] Filter events by region
- [ ] Search events by location
- [ ] Purchase ticket for Africa event (pawaPay)
- [ ] Purchase ticket for US event (Stripe)
- [ ] View event in correct timezone
- [ ] Currency formatting for both regions

### 12.2 Edge Cases
- [ ] Event with no region (should default to AFRICA)
- [ ] Payment provider unavailable (fallback)
- [ ] Timezone conversion accuracy
- [ ] Currency conversion accuracy
- [ ] Location search with invalid data

### 12.3 Performance
- [ ] Event list loading with region filter
- [ ] Search performance with large dataset
- [ ] Payment flow performance
- [ ] Map rendering (if implemented)

---

## 13. Rollout Plan

### 13.1 Soft Launch
1. Deploy database migrations
2. Deploy backend updates
3. Deploy frontend updates (hidden behind feature flag)
4. Test with internal users
5. Enable for beta users

### 13.2 Public Launch
1. Enable region selector for all users
2. Announce US region support
3. Monitor payment success rates
4. Monitor user feedback
5. Iterate based on feedback

---

## 14. Future Enhancements

### 14.1 Additional Regions
- Europe (EUR, Stripe)
- Asia (various currencies, Stripe)
- Latin America (various currencies, Stripe)

### 14.2 Advanced Features
- Multi-currency event pricing
- Region-specific event recommendations
- Cross-region event discovery
- Regional pricing strategies
- Local payment methods per region

---

## 15. Documentation Updates

### 15.1 Developer Documentation
- Update API documentation with region parameters
- Document payment provider routing
- Document timezone handling
- Document currency handling

### 15.2 User Documentation
- Update user guide with region selection
- Document payment methods by region
- Document timezone display

---

## 16. Success Metrics

### 16.1 Key Performance Indicators
- Number of US events created
- US event ticket sales
- Payment success rate by region
- User engagement by region
- Search usage by region

### 16.2 Monitoring
- Track payment failures by region
- Monitor API response times
- Track error rates
- Monitor user feedback

---

## Conclusion

This multi-region expansion will enable Temba to serve both African and US markets while maintaining a unified codebase and user experience. The phased approach ensures stability and allows for iterative improvements based on real-world usage.

**Estimated Timeline**: 5 weeks
**Team Size**: 2-3 developers
**Priority**: High (market expansion opportunity)

