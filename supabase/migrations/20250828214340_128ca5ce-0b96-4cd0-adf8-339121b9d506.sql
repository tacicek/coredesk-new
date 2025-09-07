-- Fix function search path security warnings

-- Update generate_api_key function
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'ak_' || encode(gen_random_bytes(32), 'hex');
$$;

-- Update create_customer_api_key function  
CREATE OR REPLACE FUNCTION public.create_customer_api_key(
  p_customer_id UUID,
  p_key_name TEXT DEFAULT 'Default API Key',
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_api_key_id UUID;
  api_key_value TEXT;
  customer_vendor_id UUID;
BEGIN
  -- Get customer's vendor_id
  SELECT vendor_id INTO customer_vendor_id
  FROM public.customers
  WHERE id = p_customer_id;
  
  IF customer_vendor_id IS NULL THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;
  
  -- Generate API key
  api_key_value := public.generate_api_key();
  
  -- Insert API key
  INSERT INTO public.customer_api_keys (
    customer_id,
    api_key,
    key_name,
    expires_at,
    created_by,
    vendor_id
  )
  VALUES (
    p_customer_id,
    api_key_value,
    p_key_name,
    p_expires_at,
    auth.uid(),
    customer_vendor_id
  )
  RETURNING id INTO new_api_key_id;
  
  -- Create default permissions (read-only access to customer's own data)
  INSERT INTO public.api_permissions (api_key_id, endpoint_pattern, methods)
  VALUES 
    (new_api_key_id, '/api/invoices/*', ARRAY['GET']),
    (new_api_key_id, '/api/customers/me', ARRAY['GET']),
    (new_api_key_id, '/api/offers/*', ARRAY['GET']);
  
  -- Create default usage limits
  INSERT INTO public.api_usage_limits (api_key_id, limit_type, limit_value)
  VALUES 
    (new_api_key_id, 'hourly', 100),
    (new_api_key_id, 'daily', 1000),
    (new_api_key_id, 'monthly', 10000);
  
  RETURN new_api_key_id;
END;
$$;

-- Update validate_api_key function
CREATE OR REPLACE FUNCTION public.validate_api_key(
  p_api_key TEXT,
  p_endpoint TEXT,
  p_method TEXT DEFAULT 'GET'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  api_key_record RECORD;
  permission_exists BOOLEAN := false;
  usage_allowed BOOLEAN := true;
  result JSONB;
BEGIN
  -- Get API key info
  SELECT cak.*, c.name as customer_name, c.vendor_id
  INTO api_key_record
  FROM public.customer_api_keys cak
  JOIN public.customers c ON c.id = cak.customer_id
  WHERE cak.api_key = p_api_key
  AND cak.is_active = true
  AND (cak.expires_at IS NULL OR cak.expires_at > now());
  
  IF api_key_record IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Invalid or expired API key'
    );
  END IF;
  
  -- Check permissions
  SELECT EXISTS (
    SELECT 1
    FROM public.api_permissions ap
    WHERE ap.api_key_id = api_key_record.id
    AND ap.is_enabled = true
    AND p_endpoint LIKE ap.endpoint_pattern
    AND p_method = ANY(ap.methods)
  ) INTO permission_exists;
  
  IF NOT permission_exists THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Insufficient permissions for this endpoint'
    );
  END IF;
  
  -- Check usage limits (simplified - checking daily limit)
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.api_usage_limits aul
    WHERE aul.api_key_id = api_key_record.id
    AND aul.limit_type = 'daily'
    AND aul.current_usage >= aul.limit_value
  ) INTO usage_allowed;
  
  IF NOT usage_allowed THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Daily usage limit exceeded'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'valid', true,
    'customer_id', api_key_record.customer_id,
    'customer_name', api_key_record.customer_name,
    'vendor_id', api_key_record.vendor_id,
    'api_key_id', api_key_record.id
  );
END;
$$;

-- Update auto_create_customer_api_key function
CREATE OR REPLACE FUNCTION public.auto_create_customer_api_key()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-create API key for new customer
  PERFORM public.create_customer_api_key(
    NEW.id,
    'Auto-generated API Key',
    now() + interval '1 year'
  );
  
  RETURN NEW;
END;
$$;