/*
  # Roll back ticket scan notifications

  1. Changes
    - Drop trigger for ticket scan email notifications
    - Drop trigger function for sending scan emails
    - Drop related triggers and functions in correct order to handle dependencies

  2. Security
    - No security changes needed as we're only removing triggers and functions
*/

-- First drop the email trigger since it has no dependencies
DROP TRIGGER IF EXISTS ticket_scan_email_trigger ON tickets;

-- Drop the email trigger function
DROP FUNCTION IF EXISTS send_ticket_scan_email();

-- Drop the ticket status trigger with CASCADE to handle dependencies
DROP TRIGGER IF EXISTS update_ticket_on_scan ON tickets CASCADE;

-- Now we can safely drop the status update function
DROP FUNCTION IF EXISTS update_ticket_status() CASCADE;