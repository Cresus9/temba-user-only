import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

// Import your existing screens
import HomeScreen from '../screens/HomeScreen';
import EventsScreen from '../screens/EventsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EventDetailsScreen from '../screens/EventDetailsScreen';
import BookingConfirmationScreen from '../screens/BookingConfirmationScreen';

// Import notification components
import NotificationBell from '../components/NotificationBell';
import NotificationListScreen from '../screens/NotificationListScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';

// Import hooks and services
import { useNotifications, useNotificationAppState } from '../hooks/useNotifications';
import { mobileNotificationService } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

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

// Main Tab Navigator with Notification Bell
function MainTabNavigator() {
  const { unreadCount } = useNotifications();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Events') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'ellipse';
          }

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: 'gray',
        headerRight: () => <NotificationBell />, // Add notification bell to all tab screens
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ 
          title: 'Accueil',
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined
        }}
      />
      <Tab.Screen 
        name="Events" 
        component={EventsScreen}
        options={{ title: 'Événements' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profil' }}
      />
    </Tab.Navigator>
  );
}

// Main App Component with Navigation
export default function App() {
  const { isAuthenticated } = useAuth();
  
  // Handle app state changes for notifications
  useNotificationAppState();

  useEffect(() => {
    // Configure push notifications when app starts
    if (isAuthenticated) {
      mobileNotificationService.configurePushNotifications();
    }

    // Handle notification responses when app is opened from notification
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('App opened from notification:', response);
      // Navigation will be handled by the NotificationBell component
    });

    return () => {
      subscription.remove();
      mobileNotificationService.cleanup();
    };
  }, [isAuthenticated]);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {/* Main app screens */}
        <Stack.Screen 
          name="MainTabs" 
          component={MainTabNavigator}
          options={{ headerShown: false }}
        />
        
        {/* Event details screen */}
        <Stack.Screen 
          name="EventDetails" 
          component={EventDetailsScreen}
          options={{ 
            title: 'Détails de l\'événement',
            headerRight: () => <NotificationBell />
          }}
        />
        
        {/* Booking confirmation screen */}
        <Stack.Screen 
          name="BookingConfirmation" 
          component={BookingConfirmationScreen}
          options={{ 
            title: 'Confirmation de réservation',
            headerRight: () => <NotificationBell />
          }}
        />
        
        {/* Notification screens */}
        <Stack.Screen 
          name="Notifications" 
          component={NotificationListScreen}
          options={{ headerShown: false }} // Screen has its own header
        />
        
        <Stack.Screen 
          name="NotificationSettings" 
          component={NotificationSettingsScreen}
          options={{ headerShown: false }} // Screen has its own header
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Example of integrating notifications into your existing order flow
export function ExampleOrderIntegration() {
  const handleOrderCreated = async (orderData: any) => {
    try {
      // Your existing order creation logic here
      const order = await createOrder(orderData);
      
      // Trigger notification
      await mobileNotificationTriggers.onOrderCreated({
        id: order.id,
        user_id: order.user_id,
        event_id: order.event_id,
        total_amount: order.total_amount,
        currency: order.currency,
        ticket_lines: order.ticket_lines
      });
      
      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  };

  return null; // This is just an example component
}

// Example of a custom header with notification bell
export function CustomHeader({ title }: { title: string }) {
  return (
    <div style={{ 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: 16,
      backgroundColor: 'white',
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB'
    }}>
      <h1 style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>
        {title}
      </h1>
      <NotificationBell />
    </div>
  );
}

// Helper function to create order (placeholder)
async function createOrder(orderData: any) {
  // Your existing order creation logic
  return orderData;
}

// Import notification triggers
import { mobileNotificationTriggers } from '../services/notificationTriggers';
