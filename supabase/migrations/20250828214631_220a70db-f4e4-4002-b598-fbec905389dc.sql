-- Fix generate_api_key function to use random() instead of gen_random_bytes
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  api_key TEXT;
BEGIN
  -- Generate API key using random characters
  api_key := 'ak_' || encode(
    decode(
      array_to_string(
        ARRAY(
          SELECT substr('0123456789abcdef', ((random() * 15)::integer % 16) + 1, 1)
          FROM generate_series(1, 64)
        ), ''
      ), 'escape'
    ), 'hex'
  );
  
  RETURN api_key;
END;
$$;