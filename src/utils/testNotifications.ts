import { supabase } from '../lib/supabase-client';
import { notificationService } from '../services/notificationService';

// Test function to create a notification manually
export const createTestNotification = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user');
      return;
    }

    console.log('Creating test notification for user:', user.id);

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'SYSTEM',
        title: 'Test Notification',
        message: 'This is a test notification to verify real-time functionality.',
        data: {
          priority: 'normal',
          test: true
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating test notification:', error);
    } else {
      console.log('Test notification created:', data);
    }

    return data;
  } catch (error) {
    console.error('Error in createTestNotification:', error);
  }
};

// Test function to check subscription status
export const testNotificationSubscription = () => {
  console.log('Testing notification subscription...');
  
  const subscription = notificationService.subscribeToNotifications((notification) => {
    console.log('🔔 Received notification in test:', notification);
    alert(`Test notification received: ${notification.title}`);
  });

  // Create a test notification after 2 seconds
  setTimeout(() => {
    createTestNotification();
  }, 2000);

  // Cleanup after 10 seconds
  setTimeout(() => {
    subscription.unsubscribe();
    console.log('Test subscription cleaned up');
  }, 10000);

  return subscription;
};

// Add to window for easy testing in browser console
if (typeof window !== 'undefined') {
  (window as any).testNotifications = {
    create: createTestNotification,
    testSubscription: testNotificationSubscription
  };
}
