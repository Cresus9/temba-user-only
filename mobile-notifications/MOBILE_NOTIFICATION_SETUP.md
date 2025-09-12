# 📱 Mobile Notification System Implementation Guide

## 🎯 Overview

Complete notification system for your React Native mobile app with real-time updates, push notifications, and deep linking integration.

## 📋 Features Implemented

✅ **Real-time notifications** via Supabase subscriptions  
✅ **Push notifications** with Expo Notifications  
✅ **NotificationBell** component with unread count  
✅ **Full notification list** with filtering and search  
✅ **Notification preferences** management  
✅ **Deep linking** for notification actions  
✅ **Auto mark-as-read** functionality  
✅ **Badge count** management  
✅ **Bulk operations** (mark all as read, select multiple)  
✅ **French localization**  

## 🚀 Installation

### 1. Install Dependencies

```bash
# Core navigation dependencies
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs

# React Native dependencies
npx expo install react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-reanimated

# Notification dependencies
npx expo install expo-notifications expo-constants expo-device expo-linking

# Storage and Supabase
npm install @react-native-async-storage/async-storage @supabase/supabase-js

# Icons
npm install @expo/vector-icons
```

### 2. Configure app.json/app.config.js

```json
{
  "expo": {
    "name": "Temba Mobile",
    "slug": "temba-mobile",
    "version": "1.0.0",
    "platforms": ["ios", "android"],
    "notifications": {
      "icon": "./assets/notification-icon.png",
      "color": "#3B82F6",
      "sounds": ["./assets/notification-sound.wav"],
      "androidMode": "default",
      "androidCollapsedTitle": "#{unread_count} nouvelles notifications"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.temba.mobile"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "package": "com.temba.mobile",
      "permissions": [
        "NOTIFICATIONS",
        "VIBRATE",
        "WAKE_LOCK"
      ]
    },
    "scheme": "temba",
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#3B82F6",
          "defaultChannel": "default"
        }
      ]
    ]
  }
}
```

## 📁 File Structure

```
mobile-notifications/
├── services/
│   ├── notificationService.ts      # Core notification service
│   └── notificationTriggers.ts     # Event-based triggers
├── components/
│   └── NotificationBell.tsx        # Header notification bell
├── screens/
│   ├── NotificationListScreen.tsx  # Full notifications page
│   └── NotificationSettingsScreen.tsx # Preferences management
├── hooks/
│   └── useNotifications.ts         # Notification management hook
└── setup/
    ├── AppIntegration.tsx          # App.tsx integration example
    ├── package-dependencies.json   # Required dependencies
    └── MOBILE_NOTIFICATION_SETUP.md # This guide
```

## 🔧 Integration Steps

### 1. Copy Files to Your Project

Copy all files from the `mobile-notifications/` folder to your React Native project:

```bash
# Copy services
cp mobile-notifications/services/* ./src/services/

# Copy components  
cp mobile-notifications/components/* ./src/components/

# Copy screens
cp mobile-notifications/screens/* ./src/screens/

# Copy hooks
cp mobile-notifications/hooks/* ./src/hooks/
```

### 2. Update Your App.tsx

```tsx
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { mobileNotificationService } from './src/services/notificationService';
import { useNotificationAppState } from './src/hooks/useNotifications';
import NotificationBell from './src/components/NotificationBell';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const priority = notification.request.content.data?.priority || 'normal';
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: priority === 'urgent' || priority === 'high',
      shouldSetBadge: true,
    };
  },
});

export default function App() {
  const { isAuthenticated } = useAuth();
  
  // Handle app state changes for notifications
  useNotificationAppState();

  useEffect(() => {
    if (isAuthenticated) {
      mobileNotificationService.configurePushNotifications();
    }

    return () => {
      mobileNotificationService.cleanup();
    };
  }, [isAuthenticated]);

  return (
    <NavigationContainer>
      {/* Your existing navigation structure */}
      {/* Add NotificationBell to your headers */}
    </NavigationContainer>
  );
}
```

### 3. Add Navigation Routes

```tsx
import NotificationListScreen from './src/screens/NotificationListScreen';
import NotificationSettingsScreen from './src/screens/NotificationSettingsScreen';

// In your Stack.Navigator
<Stack.Screen 
  name="Notifications" 
  component={NotificationListScreen}
  options={{ headerShown: false }}
/>

<Stack.Screen 
  name="NotificationSettings" 
  component={NotificationSettingsScreen}
  options={{ headerShown: false }}
/>
```

### 4. Add NotificationBell to Headers

```tsx
import NotificationBell from './src/components/NotificationBell';

// In your screen options
options={{
  title: 'Mon Écran',
  headerRight: () => <NotificationBell />
}}
```

### 5. Integrate Notification Triggers

```tsx
import { mobileNotificationTriggers } from './src/services/notificationTriggers';

// After successful order creation
const handleOrderCreated = async (orderData) => {
  // Your order creation logic
  const order = await createOrder(orderData);
  
  // Trigger notification
  await mobileNotificationTriggers.onOrderCreated({
    id: order.id,
    user_id: order.user_id,
    event_id: order.event_id,
    total_amount: order.total_amount,
    currency: order.currency
  });
};
```

## 🔑 Environment Variables

Make sure your Supabase configuration is set up in your environment:

```typescript
// lib/supabase-client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## 📊 Database Requirements

The system uses the same database schema as your web app:

- `notifications` table
- `notification_preferences` table  
- `user_push_tokens` table (for push notification tokens)

### Additional Migration for Mobile

```sql
-- Create table for storing push notification tokens
CREATE TABLE public.user_push_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own tokens
CREATE POLICY "Users can manage their own push tokens" ON public.user_push_tokens
    FOR ALL USING (auth.uid() = user_id);
```

## 🎨 Customization

### Theme Colors

Update colors in the components to match your app theme:

```tsx
// In NotificationBell.tsx and other components
const theme = {
  primary: '#3B82F6',      // Blue
  success: '#10B981',      // Green  
  warning: '#F59E0B',      // Yellow
  danger: '#EF4444',       // Red
  gray: '#6B7280'          // Gray
};
```

### Notification Types

Add custom notification types in `notificationTriggers.ts`:

```tsx
// Custom notification type
async onCustomEvent(userId: string, eventData: any): Promise<void> {
  const notification = {
    user_id: userId,
    type: 'CUSTOM_EVENT',
    title: 'Custom Title',
    message: 'Custom message',
    priority: 'normal',
    action_url: '/custom-screen',
    action_text: 'View',
    metadata: eventData
  };

  await this.createNotification(notification);
}
```

## 🧪 Testing

### 1. Test Notifications

```tsx
import { mobileNotificationTriggers } from './src/services/notificationTriggers';

// Test order confirmation
await mobileNotificationTriggers.onOrderCreated({
  id: 'test-order-id',
  user_id: 'current-user-id',
  event_id: 'event-id',
  total_amount: 5000,
  currency: 'XOF'
});
```

### 2. Test Push Permissions

```tsx
import { mobileNotificationService } from './src/services/notificationService';

// Test push notification setup
const granted = await mobileNotificationService.configurePushNotifications();
console.log('Push notifications granted:', granted);
```

## 🚨 Troubleshooting

### Common Issues

1. **Push notifications not working**
   - Check permissions in device settings
   - Verify Expo push notification service is configured
   - Test with Expo push notification tool

2. **Real-time notifications not received**
   - Verify Supabase Realtime is enabled for `notifications` table
   - Check network connectivity
   - Verify user authentication

3. **Deep linking not working**
   - Ensure scheme is configured in app.json
   - Test deep links with `npx uri-scheme open temba://notifications --ios`

### Debug Logs

Enable debug logging:

```tsx
// Add to your app initialization
if (__DEV__) {
  console.log('Debug mode enabled for notifications');
  // Additional debug logging will appear in console
}
```

## 📱 Platform-Specific Notes

### iOS
- Push notifications require Apple Developer account
- Test on physical device (not simulator)
- Configure APNs certificates

### Android
- Configure Firebase Cloud Messaging (FCM) if needed
- Test notification channels and importance levels
- Handle Android-specific permission flows

## 🎉 Ready to Use!

Your mobile notification system is now ready! The system will automatically:

- Show real-time notifications from your admin panel
- Handle push notifications when app is in background
- Manage notification preferences per user
- Deep link to relevant screens when notifications are tapped
- Keep badge counts updated
- Mark notifications as read when viewed

## 📞 Support

If you encounter any issues:

1. Check the console logs for detailed error messages
2. Verify your Supabase configuration and database schema
3. Test with the provided debugging tools
4. Ensure all dependencies are properly installed

The notification system is fully integrated with your existing web app database and admin panel! 🚀
