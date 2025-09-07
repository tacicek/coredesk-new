-- Disable the problematic trigger temporarily to identify the issue
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remove the send registration notification function that might be causing JSON issues  
DROP TRIGGER IF EXISTS send_registration_notification_trigger ON auth.users;