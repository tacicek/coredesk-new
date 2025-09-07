-- Create a function to send registration notification after user creation
CREATE OR REPLACE FUNCTION public.send_registration_notification()
RETURNS TRIGGER AS $$
DECLARE
  registration_data jsonb;
BEGIN
  -- Prepare registration data
  registration_data := jsonb_build_object(
    'user_id', NEW.id,
    'email', NEW.email,
    'user_metadata', NEW.raw_user_meta_data
  );

  -- Call the edge function to send registration notification
  PERFORM
    net.http_post(
      url := 'https://wnedqmxejgynelhtbpmw.supabase.co/functions/v1/send-registration-notification',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
      body := registration_data::jsonb
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to send registration notification after user creation
CREATE OR REPLACE TRIGGER on_auth_user_created_send_notification
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.send_registration_notification();

-- Update the contact email in the existing send-contact-email function by replacing info@coredesk.ch with support@coredesk.ch
-- This is handled in the edge function files directly, no database change needed