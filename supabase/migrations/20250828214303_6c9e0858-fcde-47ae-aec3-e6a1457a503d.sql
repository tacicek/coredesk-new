-- Create API management tables for customer APIs

-- Table to store API keys for customers
CREATE TABLE public.customer_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  key_name TEXT NOT NULL DEFAULT 'Default API Key',
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  vendor_id UUID NOT NULL
);

-- Table to track API usage
CREATE TABLE public.api_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID NOT NULL REFERENCES public.customer_api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  status_code INTEGER,
  response_time_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  request_data JSONB DEFAULT '{}',
  response_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to define API permissions for each key
CREATE TABLE public.api_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID NOT NULL REFERENCES public.customer_api_keys(id) ON DELETE CASCADE,
  endpoint_pattern TEXT NOT NULL, -- e.g., '/api/invoices/*', '/api/customers/*'
  methods TEXT[] NOT NULL DEFAULT ARRAY['GET'], -- Allowed HTTP methods
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to manage usage limits
CREATE TABLE public.api_usage_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID NOT NULL REFERENCES public.customer_api_keys(id) ON DELETE CASCADE,
  limit_type TEXT NOT NULL CHECK (limit_type IN ('hourly', 'daily', 'monthly', 'total')),
  limit_value INTEGER NOT NULL DEFAULT 1000,
  current_usage INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(api_key_id, limit_type)
);

-- Enable RLS
ALTER TABLE public.customer_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_api_keys
CREATE POLICY "Super admins can manage all API keys"
ON public.customer_api_keys
FOR ALL
USING (is_super_admin_safe());

CREATE POLICY "Vendor owners can manage their customer API keys"
ON public.customer_api_keys
FOR ALL
USING (vendor_id = get_user_vendor_id() AND is_vendor_owner());

-- RLS Policies for api_usage_logs
CREATE POLICY "Super admins can view all API usage logs"
ON public.api_usage_logs
FOR SELECT
USING (is_super_admin_safe());

CREATE POLICY "Vendor owners can view their API usage logs"
ON public.api_usage_logs
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.customer_api_keys cak 
  WHERE cak.id = api_usage_logs.api_key_id 
  AND cak.vendor_id = get_user_vendor_id()
  AND is_vendor_owner()
));

CREATE POLICY "System can insert API usage logs"
ON public.api_usage_logs
FOR INSERT
WITH CHECK (true);

-- RLS Policies for api_permissions
CREATE POLICY "Super admins can manage all API permissions"
ON public.api_permissions
FOR ALL
USING (is_super_admin_safe());

CREATE POLICY "Vendor owners can manage their API permissions"
ON public.api_permissions
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.customer_api_keys cak 
  WHERE cak.id = api_permissions.api_key_id 
  AND cak.vendor_id = get_user_vendor_id()
  AND is_vendor_owner()
));

-- RLS Policies for api_usage_limits
CREATE POLICY "Super admins can manage all API usage limits"
ON public.api_usage_limits
FOR ALL
USING (is_super_admin_safe());

CREATE POLICY "Vendor owners can manage their API usage limits"
ON public.api_usage_limits
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.customer_api_keys cak 
  WHERE cak.id = api_usage_limits.api_key_id 
  AND cak.vendor_id = get_user_vendor_id()
  AND is_vendor_owner()
));

-- Function to generate API key
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT
LANGUAGE SQL
AS $$
  SELECT 'ak_' || encode(gen_random_bytes(32), 'hex');
$$;

-- Function to create API key for customer
CREATE OR REPLACE FUNCTION public.create_customer_api_key(
  p_customer_id UUID,
  p_key_name TEXT DEFAULT 'Default API Key',
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to validate API key and check permissions
CREATE OR REPLACE FUNCTION public.validate_api_key(
  p_api_key TEXT,
  p_endpoint TEXT,
  p_method TEXT DEFAULT 'GET'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Trigger to auto-create API key when customer is created
CREATE OR REPLACE FUNCTION public.auto_create_customer_api_key()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE TRIGGER auto_create_customer_api_key_trigger
  AFTER INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_customer_api_key();

-- Update triggers for updated_at
CREATE TRIGGER update_customer_api_keys_updated_at
  BEFORE UPDATE ON public.customer_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_api_permissions_updated_at
  BEFORE UPDATE ON public.api_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_api_usage_limits_updated_at
  BEFORE UPDATE ON public.api_usage_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();