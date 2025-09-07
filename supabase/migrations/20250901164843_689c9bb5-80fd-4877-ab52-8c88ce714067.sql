-- Create tenant for "Meine Firma" user
DO $$
DECLARE
  new_tenant_id UUID;
BEGIN
  -- Create the tenant
  INSERT INTO public.tenants (
    company_name,
    contact_email,
    contact_person,
    status,
    approval_status
  ) VALUES (
    'Meine Firma',
    'support@coredesk.ch',
    'Support User',
    'active',
    'approved'
  ) RETURNING id INTO new_tenant_id;
  
  -- Update user profile with the new tenant_id
  UPDATE public.user_profiles 
  SET tenant_id = new_tenant_id,
      approval_status = 'approved'
  WHERE user_id = '4e228b7a-9fdb-43b5-9d3b-5bf0df42609b';
  
  -- Update vendor with the new tenant_id
  UPDATE public.vendors
  SET tenant_id = new_tenant_id,
      is_active = true
  WHERE id = 'ffc42d47-4d73-4523-b760-d611d468e0df';
  
  -- Create tenant features with invoices DISABLED
  INSERT INTO public.tenant_features (tenant_id, feature_name, is_enabled)
  VALUES 
    (new_tenant_id, 'invoices', false),        -- DISABLED as requested
    (new_tenant_id, 'offers', true),
    (new_tenant_id, 'customers', true),
    (new_tenant_id, 'products', true),
    (new_tenant_id, 'projects', false),
    (new_tenant_id, 'reports', false),
    (new_tenant_id, 'financial_management', true),
    (new_tenant_id, 'expenses', true),
    (new_tenant_id, 'revenue', true),
    (new_tenant_id, 'payroll', false);
    
  RAISE NOTICE 'Created tenant % and updated user profile with tenant_id %', 'Meine Firma', new_tenant_id;
END $$;