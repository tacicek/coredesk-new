-- Create tenant features table to control which features each tenant can access
CREATE TABLE public.tenant_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  feature_name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(tenant_id, feature_name)
);

-- Enable RLS
ALTER TABLE public.tenant_features ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant_features
CREATE POLICY "Super admins can manage all tenant features"
ON public.tenant_features
FOR ALL
USING (is_super_admin_safe());

CREATE POLICY "Users can view their tenant's features"
ON public.tenant_features
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id 
    FROM user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Function to get user's tenant features
CREATE OR REPLACE FUNCTION public.get_user_tenant_features()
RETURNS TABLE(feature_name text, is_enabled boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT tf.feature_name, tf.is_enabled
  FROM tenant_features tf
  JOIN user_profiles up ON tf.tenant_id = up.tenant_id
  WHERE up.user_id = auth.uid();
$$;

-- Insert default features for existing tenants
INSERT INTO public.tenant_features (tenant_id, feature_name, is_enabled)
SELECT DISTINCT 
  t.id as tenant_id,
  feature.name as feature_name,
  true as is_enabled
FROM tenants t
CROSS JOIN (
  VALUES 
    ('invoices'),
    ('offers'), 
    ('customers'),
    ('products'),
    ('projects'),
    ('reports'),
    ('financial_management'),
    ('expenses'),
    ('revenue'),
    ('payroll')
) AS feature(name)
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_features tf 
  WHERE tf.tenant_id = t.id AND tf.feature_name = feature.name
);

-- Trigger to automatically create default features for new tenants
CREATE OR REPLACE FUNCTION public.create_default_tenant_features()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.tenant_features (tenant_id, feature_name, is_enabled)
  VALUES 
    (NEW.id, 'invoices', true),
    (NEW.id, 'offers', true),
    (NEW.id, 'customers', true),
    (NEW.id, 'products', true),
    (NEW.id, 'projects', false),
    (NEW.id, 'reports', false),
    (NEW.id, 'financial_management', true),
    (NEW.id, 'expenses', true),
    (NEW.id, 'revenue', true),
    (NEW.id, 'payroll', false);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_tenant_features_trigger
  AFTER INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION create_default_tenant_features();