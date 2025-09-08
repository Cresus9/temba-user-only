import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Database, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '../lib/supabase-client';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function NotificationDebugger() {
  const [realtimeStatus, setRealtimeStatus] = useState<string>('Not connected');
  const [lastNotificationCheck, setLastNotificationCheck] = useState<Date | null>(null);
  const [notificationCount, setNotificationCount] = useState<number>(0);
  const [isPolling, setIsPolling] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [testSubscription, setTestSubscription] = useState<any>(null);
  const { user, isAuthenticated } = useAuth();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
    console.log(`[NotificationDebugger] ${message}`);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    
    addLog('🔧 Starting notification debugger...');
    checkRealtimeConnection();
    startPolling();

    return () => {
      if (testSubscription) {
        testSubscription.unsubscribe();
      }
    };
  }, [isAuthenticated]);

  const checkRealtimeConnection = async () => {
    try {
      addLog('🔍 Checking realtime connection...');
      
      // Test basic connection
      const channel = supabase
        .channel('test-connection')
        .subscribe((status) => {
          addLog(`📡 Realtime status: ${status}`);
          setRealtimeStatus(status);
          
          if (status === 'SUBSCRIBED') {
            addLog('✅ Realtime connection successful');
            setupTestSubscription();
          } else if (status === 'CHANNEL_ERROR') {
            addLog('❌ Realtime connection failed - check if realtime is enabled');
          }
        });

      setTimeout(() => {
        supabase.removeChannel(channel);
      }, 5000);

    } catch (error: any) {
      addLog(`❌ Realtime connection error: ${error.message}`);
    }
  };

  const setupTestSubscription = () => {
    if (!user) return;

    addLog('🔔 Setting up test notification subscription...');
    
    const subscription = notificationService.subscribeToNotifications((notification) => {
      addLog(`🎉 Received notification: ${notification.title}`);
      toast.success(`Real-time notification: ${notification.title}`);
      checkNotificationCount(); // Refresh count
    });

    setTestSubscription(subscription);
  };

  const startPolling = () => {
    setIsPolling(true);
    const interval = setInterval(async () => {
      await checkNotificationCount();
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  };

  const checkNotificationCount = async () => {
    try {
      const count = await notificationService.getNotificationCount();
      setNotificationCount(count);
      setLastNotificationCheck(new Date());
      
      if (count > notificationCount) {
        addLog(`📈 New notifications detected! Count: ${count} (was ${notificationCount})`);
      }
    } catch (error: any) {
      addLog(`❌ Error checking notification count: ${error.message}`);
    }
  };

  const testDatabaseConnection = async () => {
    try {
      addLog('🗄️ Testing database connection...');
      
      const { data, error } = await supabase
        .from('notifications')
        .select('count', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      if (error) {
        addLog(`❌ Database error: ${error.message}`);
      } else {
        addLog(`✅ Database connection OK. Total notifications: ${data}`);
      }
    } catch (error: any) {
      addLog(`❌ Database connection failed: ${error.message}`);
    }
  };

  const createTestNotification = async () => {
    try {
      addLog('📝 Creating test notification...');
      
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: user?.id,
          type: 'SYSTEM',
          title: 'Debug Test',
          message: `Test notification created at ${new Date().toLocaleTimeString()}`,
          read: 'false',
          priority: 'normal',
          metadata: { debug: true }
        })
        .select()
        .single();

      if (error) {
        addLog(`❌ Failed to create notification: ${error.message}`);
      } else {
        addLog(`✅ Test notification created: ${data.id}`);
      }
    } catch (error: any) {
      addLog(`❌ Error creating test notification: ${error.message}`);
    }
  };

  const clearLogs = () => {
    setDebugLogs([]);
    addLog('🧹 Debug logs cleared');
  };

  if (!isAuthenticated) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">Please login to use the notification debugger</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg border p-6">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="h-6 w-6 text-orange-600" />
          <h2 className="text-xl font-bold text-gray-900">Notification System Debugger</h2>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">Realtime Status</span>
            </div>
            <span className={`text-sm font-semibold ${
              realtimeStatus === 'SUBSCRIBED' ? 'text-green-600' : 
              realtimeStatus === 'CHANNEL_ERROR' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {realtimeStatus}
            </span>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900">Notifications</span>
            </div>
            <span className="text-sm font-semibold text-green-700">
              {notificationCount} unread
            </span>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className={`h-5 w-5 text-purple-600 ${isPolling ? 'animate-spin' : ''}`} />
              <span className="font-medium text-purple-900">Last Check</span>
            </div>
            <span className="text-sm font-semibold text-purple-700">
              {lastNotificationCheck ? lastNotificationCheck.toLocaleTimeString() : 'Never'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={checkRealtimeConnection}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Test Realtime
          </button>
          <button
            onClick={testDatabaseConnection}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Test Database
          </button>
          <button
            onClick={createTestNotification}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Create Test Notification
          </button>
          <button
            onClick={checkNotificationCount}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Refresh Count
          </button>
          <button
            onClick={clearLogs}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Clear Logs
          </button>
        </div>

        {/* Debug Logs */}
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-gray-400">Debug Logs:</span>
          </div>
          {debugLogs.length === 0 ? (
            <div className="text-gray-500">No logs yet...</div>
          ) : (
            debugLogs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="font-semibold text-yellow-900 mb-3">Troubleshooting Steps:</h3>
        <ol className="list-decimal list-inside space-y-2 text-yellow-800 text-sm">
          <li>Check if "Realtime Status" shows "SUBSCRIBED" ✅</li>
          <li>If status is "CHANNEL_ERROR", enable Realtime for notifications table in Supabase Dashboard</li>
          <li>Test database connection to ensure notifications table is accessible</li>
          <li>Create a test notification to verify the subscription works</li>
          <li>Send a notification from admin panel and watch the logs</li>
          <li>Check browser console for additional error messages</li>
        </ol>
      </div>
    </div>
  );
}
