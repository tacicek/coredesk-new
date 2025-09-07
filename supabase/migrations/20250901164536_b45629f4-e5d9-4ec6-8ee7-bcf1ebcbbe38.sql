-- Create tenant for existing user
INSERT INTO public.tenants (
  company_name,
  contact_email,
  contact_person,
  status,
  approval_status
) VALUES (
  'Meine Firma',
  'test@example.com', -- Replace with actual email if known
  'Test User',
  'active',
  'approved'
) RETURNING id;

-- Update user profile with tenant_id (we'll need to get the tenant_id from above)
DO $$
DECLARE
  new_tenant_id UUID;
BEGIN
  -- Get the newly created tenant id
  SELECT id INTO new_tenant_id 
  FROM public.tenants 
  WHERE company_name = 'Meine Firma' 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Update user profile
  UPDATE public.user_profiles 
  SET tenant_id = new_tenant_id
  WHERE user_id = '4e228b7a-9fdb-43b5-9d3b-5bf0df42609b';
  
  -- Update vendor
  UPDATE public.vendors
  SET tenant_id = new_tenant_id
  WHERE id = 'ffc42d47-4d73-4523-b760-d611d468e0df';
  
  -- Create default tenant features (invoices disabled as requested)
  INSERT INTO public.tenant_features (tenant_id, feature_name, is_enabled)
  VALUES 
    (new_tenant_id, 'invoices', false), -- DISABLED as requested by user
    (new_tenant_id, 'offers', true),
    (new_tenant_id, 'customers', true),
    (new_tenant_id, 'products', true),
    (new_tenant_id, 'projects', false),
    (new_tenant_id, 'reports', false),
    (new_tenant_id, 'financial_management', true),
    (new_tenant_id, 'expenses', true),
    (new_tenant_id, 'revenue', true),
    (new_tenant_id, 'payroll', false);
    
END $$;