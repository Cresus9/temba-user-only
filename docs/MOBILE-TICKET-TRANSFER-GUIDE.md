# Mobile App Ticket Transfer Integration Guide

## 📱 Overview

This guide explains how the ticket transfer system works and how to integrate it into your mobile app. The system supports transferring tickets to both registered and unregistered users, with automatic SMS notifications.

## 🎯 How Ticket Transfer Works

### Transfer Flow Diagram
```
User Initiates Transfer
    ↓
Frontend Validates Input
    ↓
Calls transfer-ticket API
    ↓
Backend Checks Recipient Status
    ↓
├─ Registered User → Instant Transfer (COMPLETED)
└─ Unregistered User → Pending Transfer (PENDING)
    ↓
SMS Notification Sent
    ↓
Recipient Receives Ticket
```

### Key Features

1. **Instant Transfer**: Registered users receive tickets immediately
2. **Pending Transfer**: Unregistered users receive tickets upon signup
3. **SMS Notifications**: Automatic SMS sent to recipient's phone number
4. **No Acceptance Required**: Tickets transfer directly (airline-style)
5. **Automatic Claiming**: Pending transfers claimed automatically on signup

---

## 🔌 API Integration

### Endpoint: Transfer Ticket

**URL**: `https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/transfer-ticket`

**Method**: `POST`

**Headers**:
```json
{
  "Authorization": "Bearer <user_jwt_token>",
  "Content-Type": "application/json"
}
```

**Request Body**:
```typescript
{
  ticketId: string;           // Required: UUID of the ticket to transfer
  recipientEmail?: string;    // Optional: Recipient's email
  recipientPhone?: string;    // Optional: Recipient's phone (E.164 format)
  recipientName?: string;     // Optional: Recipient's name
  message?: string;          // Optional: Personal message
}
```

**Note**: Either `recipientEmail` OR `recipientPhone` is required.

**Response (Success)**:
```typescript
{
  success: true;
  transferId: string;          // UUID of the transfer record
  message: string;            // Success message
  instantTransfer: boolean;    // true if recipient is registered
}
```

**Response (Error)**:
```typescript
{
  success: false;
  error: string;               // Error message in French
}
```

---

## 📱 Mobile Implementation Example

### 1. Transfer Service (React Native)

```typescript
// src/services/ticketTransferService.ts
import { supabase } from '../lib/supabase';

interface TransferTicketRequest {
  ticketId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  message?: string;
}

interface TransferTicketResponse {
  success: boolean;
  transferId?: string;
  message?: string;
  instantTransfer?: boolean;
  error?: string;
}

export const ticketTransferService = {
  /**
   * Transfer a ticket to another user
   */
  async transferTicket(request: TransferTicketRequest): Promise<TransferTicketResponse> {
    try {
      // Get current session
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        throw new Error('Authentication required');
      }

      // Call the transfer-ticket Edge Function
      const response = await fetch(
        'https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/transfer-ticket',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Transfer failed',
        };
      }

      return data;
    } catch (error) {
      console.error('Transfer ticket error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  },
};
```

### 2. Transfer Screen Component

```typescript
// src/screens/TransferTicketScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, ActivityIndicator } from 'react-native';
import { ticketTransferService } from '../services/ticketTransferService';

interface Props {
  ticketId: string;
  ticketTitle: string;
  onTransferComplete: () => void;
}

export default function TransferTicketScreen({ ticketId, ticketTitle, onTransferComplete }: Props) {
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [transferMethod, setTransferMethod] = useState<'email' | 'phone'>('phone');

  const handleTransfer = async () => {
    // Validate input
    if (transferMethod === 'phone' && !recipientPhone) {
      Alert.alert('Erreur', 'Le numéro de téléphone est requis');
      return;
    }

    setLoading(true);

    try {
      const result = await ticketTransferService.transferTicket({
        ticketId,
        recipientPhone: transferMethod === 'phone' ? recipientPhone : undefined,
        recipientName: recipientName || undefined,
        message: message || undefined,
      });

      if (result.success) {
        Alert.alert(
          'Succès',
          result.instantTransfer
            ? 'Billet transféré avec succès!'
            : 'Transfert en attente - le destinataire recevra le billet lors de son inscription',
          [{ text: 'OK', onPress: onTransferComplete }]
        );
      } else {
        Alert.alert('Erreur', result.error || 'Échec du transfert');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur inattendue s\'est produite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
        Transférer: {ticketTitle}
      </Text>

      {/* Transfer Method Selection */}
      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        <Button
          title="Téléphone"
          onPress={() => setTransferMethod('phone')}
          color={transferMethod === 'phone' ? '#6366f1' : '#ccc'}
        />
        <Button
          title="Email"
          onPress={() => setTransferMethod('email')}
          color={transferMethod === 'email' ? '#6366f1' : '#ccc'}
        />
      </View>

      {/* Recipient Input */}
      {transferMethod === 'phone' ? (
        <TextInput
          placeholder="+226 75 58 10 26"
          value={recipientPhone}
          onChangeText={setRecipientPhone}
          keyboardType="phone-pad"
          style={{ borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 }}
        />
      ) : (
        <TextInput
          placeholder="email@example.com"
          value={recipientPhone}
          onChangeText={setRecipientPhone}
          keyboardType="email-address"
          style={{ borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 }}
        />
      )}

      {/* Optional Fields */}
      <TextInput
        placeholder="Nom du destinataire (optionnel)"
        value={recipientName}
        onChangeText={setRecipientName}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 5 }}
      />

      <TextInput
        placeholder="Message (optionnel)"
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={3}
        style={{ borderWidth: 1, padding: 10, marginBottom: 20, borderRadius: 5 }}
      />

      {/* Transfer Button */}
      <Button
        title={loading ? 'Transfert...' : 'Transférer le billet'}
        onPress={handleTransfer}
        disabled={loading}
      />

      {loading && <ActivityIndicator style={{ marginTop: 10 }} />}
    </View>
  );
}
```

---

## 📨 SMS Notification System

### How SMS Works

When a ticket is transferred to a phone number, the system automatically:

1. **Sends SMS** to the recipient's phone number
2. **Includes event details**: Event title, date, and time
3. **Provides instructions**: Login or signup with the same phone number
4. **Links to signup**: `https://tembas.com/signup`

### SMS Message Format

```
🎫 [Sender Name] vous a transféré un billet pour "[Event Title]" ([Date] à [Time]). Connectez-vous si vous avez un compte, ou inscrivez-vous avec le même numéro pour récupérer votre billet : https://tembas.com/signup
```

### Phone Number Format

- **Required Format**: E.164 international format
- **Example**: `+22675581026` (Burkina Faso)
- **Normalization**: The system automatically normalizes phone numbers
- **Acceptable Input Formats**:
  - `+22675581026`
  - `22675581026`
  - `075581026` (will be normalized to +22675581026)

---

## 🔄 Transfer Scenarios

### Scenario 1: Transfer to Registered User

**Flow**:
1. User transfers ticket to phone `+22675581026`
2. System checks if user exists → **Yes** (registered)
3. Transfer status: `COMPLETED` immediately
4. Ticket ownership transferred instantly
5. SMS sent: "Connectez-vous si vous avez un compte..."
6. Recipient logs in → Ticket appears in their account

**Response**:
```json
{
  "success": true,
  "transferId": "uuid-here",
  "instantTransfer": true,
  "message": "Billet transféré avec succès !"
}
```

### Scenario 2: Transfer to Unregistered User

**Flow**:
1. User transfers ticket to phone `+22675581026`
2. System checks if user exists → **No** (unregistered)
3. Transfer status: `PENDING`
4. SMS sent: "Inscrivez-vous avec le même numéro..."
5. Recipient signs up with `+22675581026`
6. System automatically claims pending transfer
7. Ticket ownership transferred on signup
8. Ticket appears in their account

**Response**:
```json
{
  "success": true,
  "transferId": "uuid-here",
  "instantTransfer": false,
  "message": "Transfert en attente - le destinataire recevra le billet lors de son inscription"
}
```

---

## 🎫 Handling Transferred Tickets

### Checking for Pending Transfers

When a user signs up, check for pending transfers:

```typescript
// src/services/pendingTransfersService.ts
import { supabase } from '../lib/supabase';

export const pendingTransfersService = {
  /**
   * Check for pending transfers for the current user
   */
  async checkPendingTransfers() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get user profile to check phone/email
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone, email')
        .eq('user_id', user.id)
        .single();

      if (!profile) return [];

      // Find pending transfers matching user's phone or email
      const { data: transfers } = await supabase
        .from('ticket_transfers')
        .select('*')
        .eq('status', 'PENDING')
        .or(`recipient_phone.eq.${profile.phone},recipient_email.eq.${profile.email}`);

      return transfers || [];
    } catch (error) {
      console.error('Error checking pending transfers:', error);
      return [];
    }
  },

  /**
   * Claim a pending transfer
   */
  async claimPendingTransfer(transferId: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        'https://uwmlagvsivxqocklxbbo.supabase.co/functions/v1/claim-pending-transfer',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ transferId }),
        }
      );

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('Error claiming transfer:', error);
      return false;
    }
  },
};
```

### Displaying Transferred Tickets

```typescript
// src/components/TransferredTicketsList.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';

export default function TransferredTicketsList() {
  const [transferredTickets, setTransferredTickets] = useState([]);

  useEffect(() => {
    loadTransferredTickets();
  }, []);

  const loadTransferredTickets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get tickets received via transfer
      const { data: transfers } = await supabase
        .from('ticket_transfers')
        .select(`
          *,
          ticket:tickets (
            *,
            event:events (*),
            ticket_type:ticket_types (*)
          )
        `)
        .eq('recipient_id', user.id)
        .eq('status', 'COMPLETED');

      if (transfers) {
        setTransferredTickets(transfers.map(t => t.ticket).filter(Boolean));
      }
    } catch (error) {
      console.error('Error loading transferred tickets:', error);
    }
  };

  return (
    <View>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
        Billets Reçus
      </Text>
      <FlatList
        data={transferredTickets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={{ padding: 15, borderBottomWidth: 1 }}>
            <Text style={{ fontWeight: 'bold' }}>{item.event.title}</Text>
            <Text>{item.ticket_type.name}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 20 }}>
            Aucun billet transféré
          </Text>
        }
      />
    </View>
  );
}
```

---

## 🔐 Security Considerations

### Authentication
- All API calls require a valid JWT token
- Token obtained via Supabase Auth session
- Tokens automatically refreshed

### Input Validation
- Validate phone numbers before sending
- Use E.164 format for phone numbers
- Sanitize all user inputs

### Error Handling
- Always handle network errors
- Display user-friendly error messages
- Log errors for debugging

---

## 📊 Testing Checklist

### Test Cases

1. ✅ **Transfer to Registered User**
   - Verify instant transfer
   - Check SMS received
   - Confirm ticket appears in recipient's account

2. ✅ **Transfer to Unregistered User**
   - Verify pending transfer created
   - Check SMS received
   - Sign up with same phone
   - Verify ticket claimed automatically

3. ✅ **Error Handling**
   - Invalid ticket ID
   - Missing recipient info
   - Network errors
   - Invalid phone format

4. ✅ **UI/UX**
   - Loading states
   - Success/error messages
   - Form validation
   - Confirmation dialogs

---

## 🚀 Quick Start Integration

### Step 1: Install Dependencies
```bash
npm install @supabase/supabase-js
npm install @react-native-async-storage/async-storage
```

### Step 2: Set Up Supabase Client
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const supabase = createClient(
  'https://uwmlagvsivxqocklxbbo.supabase.co',
  'your-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
    },
  }
);
```

### Step 3: Implement Transfer Service
Copy the `ticketTransferService` code from above.

### Step 4: Add Transfer UI
Use the `TransferTicketScreen` component as a reference.

### Step 5: Handle Pending Transfers
Implement `pendingTransfersService` and check on user signup.

---

## 📞 Support

For issues or questions:
- Check Supabase Edge Function logs
- Verify phone number format (E.164)
- Ensure user is authenticated
- Test with registered and unregistered users

---

## 📝 API Reference Summary

### Transfer Ticket
- **Endpoint**: `/functions/v1/transfer-ticket`
- **Method**: POST
- **Auth**: Required (JWT)
- **Input**: `ticketId`, `recipientPhone` or `recipientEmail`
- **Output**: Transfer status and ID

### Claim Pending Transfer
- **Endpoint**: `/functions/v1/claim-pending-transfer`
- **Method**: POST
- **Auth**: Required (JWT)
- **Input**: `transferId`
- **Output**: Success status

---

**Last Updated**: January 2025  
**Version**: 2.0.0

