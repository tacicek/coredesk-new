-- Recreate the user registration trigger with proper error handling
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Also ensure the send_registration_notification function handles errors properly  
CREATE OR REPLACE FUNCTION public.send_registration_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  registration_data jsonb;
  user_metadata jsonb;
BEGIN
  -- Safely extract user metadata
  user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  
  -- Prepare registration data with safe JSON handling
  registration_data := jsonb_build_object(
    'user_id', NEW.id,
    'email', NEW.email,
    'user_metadata', user_metadata
  );

  -- Call the edge function to send registration notification
  -- Use a safe approach that won't fail the transaction
  BEGIN
    PERFORM
      net.http_post(
        url := 'https://wnedqmxejgynelhtbpmw.supabase.co/functions/v1/send-registration-notification',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
        body := registration_data::jsonb
      );
  EXCEPTION 
    WHEN OTHERS THEN
      -- Log error but don't fail the transaction
      RAISE LOG 'Failed to send registration notification: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

-- Add the notification trigger
CREATE OR REPLACE TRIGGER send_registration_notification_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.send_registration_notification();