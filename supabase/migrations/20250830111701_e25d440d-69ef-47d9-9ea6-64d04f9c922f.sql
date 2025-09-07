-- Fix the send registration notification function to use proper service role key
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
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduZWRxbXhlamd5bmVsaHRicG13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA4NzM3OSwiZXhwIjoyMDcwNjYzMzc5fQ.oZdAx4QzPG-j7MxJ9gCBKn_gi_jI8OhB8lPQGR6y598'
        ),
        body := registration_data
      );
  EXCEPTION 
    WHEN OTHERS THEN
      -- Log error but don't fail the transaction
      RAISE LOG 'Failed to send registration notification: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;