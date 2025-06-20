/*
  # Add Notification RLS Policies

  1. Changes
    - Enable RLS on notifications table
    - Add policies for notifications:
      - Users can view their own notifications
      - System can create notifications
      - Users can update their own notifications (e.g., mark as read)
      - Users can delete their own notifications

  2. Security
    - Users can only access their own notifications
    - System can create notifications for any user
    - Notifications are protected by row-level security
*/

-- Enable RLS on notifications table if not already enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

-- Create policies for notifications table
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
TO public
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON notifications FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
ON notifications FOR DELETE
TO public
USING (auth.uid() = user_id);