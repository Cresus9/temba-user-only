import React, { useState, useEffect } from 'react';
import { Bell, Send, CheckCircle, Database, AlertTriangle } from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { supabase } from '../lib/supabase-client';
import { useAuth } from '../context/AuthContext';
import { checkNotificationSchema } from '../utils/checkNotificationSchema';
import toast from 'react-hot-toast';

export default function NotificationTester() {
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('Not connected');
  const [testMessage, setTestMessage] = useState('Test notification from user app');
  const [isCreating, setIsCreating] = useState(false);
  const [receivedNotifications, setReceivedNotifications] = useState<any[]>([]);
  const [schemaInfo, setSchemaInfo] = useState<any>(null);
  const [isCheckingSchema, setIsCheckingSchema] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    console.log('Setting up notification tester subscription...');
    setSubscriptionStatus('Connecting...');

    // Subscribe to notifications
    const subscription = notificationService.subscribeToNotifications((notification) => {
      console.log('🔔 Notification received in tester:', notification);
      setReceivedNotifications(prev => [notification, ...prev]);
      toast.success(`Notification received: ${notification.title}`, {
        duration: 3000,
        icon: '🔔'
      });
    });

    // Check subscription status
    const checkStatus = () => {
      setSubscriptionStatus('Connected');
    };

    setTimeout(checkStatus, 1000);

    return () => {
      subscription.unsubscribe();
      setSubscriptionStatus('Disconnected');
    };
  }, [isAuthenticated]);

  const checkSchema = async () => {
    setIsCheckingSchema(true);
    try {
      const result = await checkNotificationSchema();
      setSchemaInfo(result);
      console.log('Schema check result:', result);
      
      if (result.exists) {
        toast.success('Schema check completed!');
      } else {
        toast.error('Schema issues detected!');
      }
    } catch (error: any) {
      console.error('Schema check error:', error);
      toast.error(`Schema check failed: ${error.message}`);
    } finally {
      setIsCheckingSchema(false);
    }
  };

  const createTestNotification = async () => {
    if (!user) return;

    setIsCreating(true);
    try {
      console.log('Creating test notification...');
      
      // Create notification with correct schema
      const notificationData: any = {
        user_id: user.id,
        type: 'SYSTEM',
        title: 'Test Notification',
        message: testMessage,
        read: 'false',  // Your table uses string 'false'/'true'
        priority: 'normal',
        metadata: {
          test: true,
          created_from: 'user_app_tester'
        }
      };
      
      const { data, error } = await supabase
        .from('notifications')
        .insert(notificationData)
        .select()
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        toast.error(`Error: ${error.message}`);
      } else {
        console.log('Test notification created:', data);
        toast.success('Test notification created!');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const clearNotifications = () => {
    setReceivedNotifications([]);
  };

  if (!isAuthenticated) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">Please login to test notifications</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg border">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="h-6 w-6 text-indigo-600" />
        <h2 className="text-xl font-bold text-gray-900">Notification Tester</h2>
      </div>

      {/* Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Subscription Status:</span>
          <span className={`text-sm font-semibold ${
            subscriptionStatus === 'Connected' ? 'text-green-600' : 
            subscriptionStatus === 'Connecting...' ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {subscriptionStatus}
          </span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-medium text-gray-700">User ID:</span>
          <span className="text-sm text-gray-600 font-mono">{user?.id}</span>
        </div>
      </div>

      {/* Schema Check */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Database Schema</span>
          </div>
          <button
            onClick={checkSchema}
            disabled={isCheckingSchema}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isCheckingSchema ? 'Checking...' : 'Check Schema'}
          </button>
        </div>
        
        {schemaInfo && (
          <div className="text-sm space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-900">Table Exists:</span>
              <span className={schemaInfo.exists ? 'text-green-600' : 'text-red-600'}>
                {schemaInfo.exists ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            
            {schemaInfo.exists && (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-blue-900">Data Column:</span>
                  <span className={schemaInfo.hasDataColumn ? 'text-green-600' : 'text-yellow-600'}>
                    {schemaInfo.hasDataColumn ? '✅ Present' : '⚠️ Missing'}
                  </span>
                </div>
                
                {schemaInfo.columns && (
                  <div>
                    <span className="font-medium text-blue-900">Available Columns:</span>
                    <div className="text-xs text-blue-700 mt-1 font-mono">
                      {Array.isArray(schemaInfo.columns) 
                        ? schemaInfo.columns.join(', ')
                        : schemaInfo.basicColumns?.join(', ') || 'Unknown'
                      }
                    </div>
                  </div>
                )}
              </>
            )}
            
            {schemaInfo.error && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs">{schemaInfo.error}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Test Controls */}
      <div className="mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Test Message:
          </label>
          <input
            type="text"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter test notification message"
          />
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={createTestNotification}
            disabled={isCreating}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {isCreating ? 'Creating...' : 'Send Test Notification'}
          </button>
          
          <button
            onClick={clearNotifications}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Clear Received
          </button>
        </div>
      </div>

      {/* Received Notifications */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Received Notifications ({receivedNotifications.length})
        </h3>
        
        {receivedNotifications.length === 0 ? (
          <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-600">
            No notifications received yet. Try sending a test notification or check the admin panel.
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {receivedNotifications.map((notification, index) => (
              <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-green-900">{notification.title}</h4>
                    <p className="text-sm text-green-700 mt-1">{notification.message}</p>
                    <p className="text-xs text-green-600 mt-2">
                      Type: {notification.type} | {new Date(notification.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
