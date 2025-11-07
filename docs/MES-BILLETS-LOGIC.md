# Mes Billets - Fetch Logic & Restrictions

## 📋 Overview

"Mes Billets" (My Tickets) displays only tickets that are:
- ✅ **Valid** - Not used, expired, or cancelled
- ✅ **Not Scanned** - Never been scanned at an event
- ✅ **Not Transferred** - Still owned by the current user
- ✅ **For Published Events** - Event must be active and published

This ensures users only see tickets they can actually use.

---

## 🔍 Fetch Logic - Step by Step

### Step 1: Initial Query - Get Valid Tickets

```typescript
const { data: allTickets } = await supabase
  .from('tickets')
  .select(`
    id,
    qr_code,
    status,
    scanned_at,
    event_id,
    ticket_type_id,
    order_id,
    event:events!inner (
      id,
      title,
      date,
      time,
      location,
      currency,
      image_url,
      status
    ),
    ticket_type:ticket_types!inner (
      id,
      name,
      price
    ),
    order:orders (
      id,
      created_at
    )
  `)
  .eq('user_id', user.id)           // ✅ Restriction 1: Owned by user
  .eq('status', 'VALID')            // ✅ Restriction 2: Status must be VALID
  .is('scanned_at', null)           // ✅ Restriction 3: Never scanned
  .eq('event.status', 'PUBLISHED')  // ✅ Restriction 4: Event is published
  .order('created_at', { ascending: false });
```

**Restrictions Applied:**
1. **`user_id = user.id`** - Only tickets owned by current user
2. **`status = 'VALID'`** - Excludes: USED, EXPIRED, CANCELLED, REFUNDED
3. **`scanned_at IS NULL`** - Excludes tickets that have been scanned
4. **`event.status = 'PUBLISHED'`** - Excludes draft/unpublished events

---

### Step 2: Filter Out Transferred Tickets

```typescript
// Get all transferred ticket IDs (COMPLETED transfers only)
const ticketIds = allTickets.map(t => t.id);
const { data: transfers } = await supabase
  .from('ticket_transfers')
  .select('ticket_id')
  .in('ticket_id', ticketIds)
  .eq('status', 'COMPLETED');

// Filter out transferred tickets
const transferredTicketIds = new Set(transfers?.map(t => t.ticket_id) || []);
const validTickets = allTickets.filter(ticket => 
  !transferredTicketIds.has(ticket.id)
);
```

**What This Does:**
- Finds all tickets that have been transferred (status = COMPLETED)
- Removes those tickets from the results
- ✅ **Restriction 5**: Excludes tickets that have been transferred to someone else

---

### Step 3: Determine Ticket Ownership

```typescript
// Check if tickets belong to orders created by this user
const { data: ticketsWithOrders } = await supabase
  .from('tickets')
  .select('id, order_id, order:orders!inner(user_id)')
  .in('id', validTicketIds);

// Build ownership map
const ownershipMap = new Map<string, boolean>();
ticketsWithOrders.forEach((ticket: any) => {
  const isOwned = ticket.order?.user_id === user.id;
  ownershipMap.set(ticket.id, isOwned || false);
});
```

**What This Does:**
- Checks if each ticket was purchased by the current user
- Used to determine if transfer button should be shown
- Tickets received via transfer (not purchased) cannot be transferred further

---

## 🚫 What Tickets Are EXCLUDED

### 1. Invalid Status Tickets
- ❌ **USED** - Ticket has been scanned/used
- ❌ **EXPIRED** - Event date has passed
- ❌ **CANCELLED** - Ticket was cancelled
- ❌ **REFUNDED** - Payment was refunded
- ❌ **PENDING** - Ticket not yet confirmed

### 2. Scanned Tickets
- ❌ **`scanned_at IS NOT NULL`** - Ticket has been scanned at an event
- Once scanned, ticket is marked as USED and cannot be used again

### 3. Transferred Tickets
- ❌ **Has COMPLETED transfer record** - Ticket has been transferred to someone else
- Even if user_id still points to sender, transferred tickets are excluded
- Sender loses access once transfer is completed

### 4. Unpublished Events
- ❌ **Event status ≠ 'PUBLISHED'** - Event is draft, cancelled, or hidden
- Only tickets for active, published events are shown

### 5. Other Users' Tickets
- ❌ **`user_id ≠ current_user.id`** - Ticket belongs to another user
- RLS policies also enforce this at database level

---

## ✅ What Tickets Are INCLUDED

A ticket appears in "Mes Billets" if ALL of these are true:

1. ✅ **Owned by User**: `tickets.user_id = current_user.id`
2. ✅ **Valid Status**: `tickets.status = 'VALID'`
3. ✅ **Not Scanned**: `tickets.scanned_at IS NULL`
4. ✅ **Not Transferred**: No `COMPLETED` transfer record exists
5. ✅ **Published Event**: `events.status = 'PUBLISHED'`

---

## 📊 Database Query Breakdown

### SQL Equivalent

```sql
-- Step 1: Get valid tickets
SELECT 
  t.id,
  t.qr_code,
  t.status,
  t.scanned_at,
  t.event_id,
  t.ticket_type_id,
  t.order_id,
  e.id as event_id,
  e.title as event_title,
  e.date as event_date,
  e.time as event_time,
  e.location as event_location,
  e.currency as event_currency,
  e.image_url as event_image_url,
  e.status as event_status,
  tt.id as ticket_type_id,
  tt.name as ticket_type_name,
  tt.price as ticket_type_price,
  o.id as order_id,
  o.created_at as order_created_at
FROM tickets t
INNER JOIN events e ON t.event_id = e.id
INNER JOIN ticket_types tt ON t.ticket_type_id = tt.id
LEFT JOIN orders o ON t.order_id = o.id
WHERE 
  t.user_id = :current_user_id
  AND t.status = 'VALID'
  AND t.scanned_at IS NULL
  AND e.status = 'PUBLISHED'
ORDER BY t.created_at DESC;

-- Step 2: Filter out transferred tickets
SELECT ticket_id
FROM ticket_transfers
WHERE ticket_id IN (:ticket_ids)
  AND status = 'COMPLETED';

-- Step 3: Final filtering (application level)
-- Remove tickets that appear in transfer results
```

---

## 🔄 Transfer Button Logic

The transfer button is only shown if:

```typescript
{ticketOwnership.get(selectedTicket.id) && 
 selectedTicket.status === 'VALID' && 
 !selectedTicket.scanned_at && (
  <button onClick={handleTransfer}>
    Transférer le billet
  </button>
)}
```

**Conditions:**
1. ✅ Ticket was **purchased by user** (not received via transfer)
2. ✅ Ticket status is **VALID**
3. ✅ Ticket has **never been scanned**

**Why these restrictions?**
- Users can only transfer tickets they purchased (not received)
- Only valid tickets can be transferred
- Scanned tickets cannot be transferred (already used)

---

## 📱 Mobile App Implementation

For mobile developers, here's how to implement the same logic:

### React Native Example

```typescript
// src/services/myTicketsService.ts
import { supabase } from '../lib/supabase';

export const myTicketsService = {
  /**
   * Fetch valid, non-transferred, non-scanned tickets
   */
  async fetchMyTickets(userId: string) {
    try {
      // Step 1: Get valid tickets
      const { data: allTickets, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          id,
          qr_code,
          status,
          scanned_at,
          event_id,
          ticket_type_id,
          order_id,
          event:events!inner (
            id,
            title,
            date,
            time,
            location,
            currency,
            image_url,
            status
          ),
          ticket_type:ticket_types!inner (
            id,
            name,
            price
          ),
          order:orders (
            id,
            created_at
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'VALID')
        .is('scanned_at', null)
        .eq('event.status', 'PUBLISHED')
        .order('created_at', { ascending: false });

      if (ticketsError) throw ticketsError;
      if (!allTickets || allTickets.length === 0) return [];

      // Step 2: Get transferred ticket IDs
      const ticketIds = allTickets.map(t => t.id);
      const { data: transfers } = await supabase
        .from('ticket_transfers')
        .select('ticket_id')
        .in('ticket_id', ticketIds)
        .eq('status', 'COMPLETED');

      // Step 3: Filter out transferred tickets
      const transferredTicketIds = new Set(
        transfers?.map(t => t.ticket_id) || []
      );
      
      const validTickets = allTickets.filter(
        ticket => !transferredTicketIds.has(ticket.id)
      );

      // Step 4: Check ownership (for transfer button)
      const ownershipMap = new Map<string, boolean>();
      
      if (validTickets.length > 0) {
        const validTicketIds = validTickets.map(t => t.id);
        const { data: ticketsWithOrders } = await supabase
          .from('tickets')
          .select('id, order_id, order:orders!inner(user_id)')
          .in('id', validTicketIds);

        ticketsWithOrders?.forEach((ticket: any) => {
          const isOwned = ticket.order?.user_id === userId;
          ownershipMap.set(ticket.id, isOwned || false);
        });
      }

      return {
        tickets: validTickets,
        ownership: ownershipMap,
      };
    } catch (error) {
      console.error('Error fetching my tickets:', error);
      throw error;
    }
  },
};
```

---

## 🎯 Use Cases

### Use Case 1: User Purchases Ticket
1. User buys ticket → Status: VALID
2. Ticket appears in "Mes Billets" ✅
3. User can transfer it ✅

### Use Case 2: User Receives Ticket
1. User receives ticket via transfer → Status: VALID
2. Ticket appears in "Mes Billets" ✅
3. User **cannot** transfer it ❌ (not purchased by them)

### Use Case 3: User Transfers Ticket
1. User transfers ticket to someone
2. Transfer status: COMPLETED
3. Ticket **disappears** from "Mes Billets" ❌
4. Appears in recipient's "Mes Billets" ✅

### Use Case 4: Ticket is Scanned
1. Ticket scanned at event → `scanned_at` set
2. Status changes to USED
3. Ticket **disappears** from "Mes Billets" ❌
4. Appears in "Historique des commandes" (Booking History)

### Use Case 5: Event is Cancelled
1. Event status changes to CANCELLED
2. Tickets remain VALID but event is not PUBLISHED
3. Tickets **disappear** from "Mes Billets" ❌
4. Still visible in booking history

---

## 🔐 Security Considerations

### Row Level Security (RLS)

The database has RLS policies that enforce:

```sql
-- Users can only see their own tickets
CREATE POLICY "tickets_select_policy" ON tickets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
```

This ensures:
- ✅ Users cannot query other users' tickets
- ✅ API calls are automatically filtered by user_id
- ✅ Security enforced at database level

### Additional Security

1. **Authentication Required**: All queries require valid JWT token
2. **User ID Validation**: Always use `auth.uid()` for filtering
3. **Status Validation**: Backend validates all status checks
4. **Transfer Validation**: Transfer operations verify ownership

---

## 📊 Performance Optimization

### Query Optimization

1. **Indexes Required**:
   ```sql
   CREATE INDEX idx_tickets_user_status ON tickets(user_id, status);
   CREATE INDEX idx_tickets_scanned_at ON tickets(scanned_at) WHERE scanned_at IS NULL;
   CREATE INDEX idx_ticket_transfers_ticket_status ON ticket_transfers(ticket_id, status);
   ```

2. **Efficient Filtering**:
   - Database filters applied first (most restrictive)
   - Application-level filtering only for transfers
   - Minimal data transfer

3. **Pagination**:
   - Display 5 tickets per page
   - Load more on demand
   - Reduces initial query time

---

## 🐛 Common Issues & Solutions

### Issue 1: Tickets Not Showing

**Possible Causes:**
- Ticket status is not VALID
- Ticket has been scanned
- Ticket has been transferred
- Event is not PUBLISHED

**Solution:**
```typescript
// Debug query
const { data, error } = await supabase
  .from('tickets')
  .select('*, event:events(status)')
  .eq('user_id', userId)
  .eq('id', ticketId)
  .single();

console.log('Ticket status:', data?.status);
console.log('Scanned at:', data?.scanned_at);
console.log('Event status:', data?.event?.status);
```

### Issue 2: Transferred Tickets Still Showing

**Possible Causes:**
- Transfer status is not COMPLETED
- Transfer query failed silently

**Solution:**
```typescript
// Check transfer status
const { data: transfer } = await supabase
  .from('ticket_transfers')
  .select('*')
  .eq('ticket_id', ticketId)
  .single();

console.log('Transfer status:', transfer?.status);
```

### Issue 3: Transfer Button Not Showing

**Possible Causes:**
- Ticket was received via transfer (not purchased)
- Ticket ownership not checked correctly

**Solution:**
```typescript
// Verify ownership
const { data: order } = await supabase
  .from('orders')
  .select('user_id')
  .eq('id', ticket.order_id)
  .single();

const isOwned = order?.user_id === userId;
console.log('Ticket owned by user:', isOwned);
```

---

## 📝 Summary

### Inclusion Criteria (ALL must be true):
1. ✅ Owned by current user
2. ✅ Status = VALID
3. ✅ Never scanned (`scanned_at IS NULL`)
4. ✅ Not transferred (no COMPLETED transfer)
5. ✅ Event is PUBLISHED

### Exclusion Criteria (ANY excludes ticket):
1. ❌ Status ≠ VALID
2. ❌ Has been scanned
3. ❌ Has been transferred
4. ❌ Event not published
5. ❌ Belongs to another user

### Transfer Button Criteria (ALL must be true):
1. ✅ Ticket was purchased by user
2. ✅ Status = VALID
3. ✅ Never scanned

---

**Last Updated**: January 2025  
**Component**: `src/components/profile/MyTickets.tsx`  
**Version**: 2.0.0

