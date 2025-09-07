-- Create "Meine Firma" tenant if it doesn't exist
DO $$
DECLARE
  meine_firma_tenant_id UUID;
  existing_tenant_count INT;
BEGIN
  -- Check if "Meine Firma" tenant already exists
  SELECT COUNT(*) INTO existing_tenant_count 
  FROM public.tenants 
  WHERE company_name = 'Meine Firma';
  
  IF existing_tenant_count = 0 THEN
    -- Create the tenant
    INSERT INTO public.tenants (
      company_name,
      contact_email,
      contact_person,
      status,
      approval_status,
      approved_at,
      created_at,
      updated_at
    )
    VALUES (
      'Meine Firma',
      'admin@meinefirma.ch',
      'System Admin',
      'active',
      'approved',
      now(),
      now(),
      now()
    )
    RETURNING id INTO meine_firma_tenant_id;
    
    RAISE NOTICE 'Created Meine Firma tenant with ID: %', meine_firma_tenant_id;
  ELSE
    -- Get existing tenant ID
    SELECT id INTO meine_firma_tenant_id 
    FROM public.tenants 
    WHERE company_name = 'Meine Firma' 
    LIMIT 1;
    
    RAISE NOTICE 'Using existing Meine Firma tenant with ID: %', meine_firma_tenant_id;
  END IF;
  
  -- Update user profile to link to this tenant
  UPDATE public.user_profiles 
  SET 
    tenant_id = meine_firma_tenant_id,
    approval_status = 'approved',
    updated_at = now()
  WHERE user_id = '4e228b7a-9fdb-43b5-9d3b-5bf0df42609b';
  
  -- Update vendor to link to this tenant
  UPDATE public.vendors
  SET 
    tenant_id = meine_firma_tenant_id,
    is_active = true,
    updated_at = now()
  WHERE id = 'ffc42d47-4d73-4523-b760-d611d468e0df';
  
  -- Create default tenant features for "Meine Firma"
  INSERT INTO public.tenant_features (tenant_id, feature_name, is_enabled, updated_by, created_at, updated_at)
  VALUES 
    (meine_firma_tenant_id, 'invoices', false, '4e228b7a-9fdb-43b5-9d3b-5bf0df42609b', now(), now()),
    (meine_firma_tenant_id, 'offers', true, '4e228b7a-9fdb-43b5-9d3b-5bf0df42609b', now(), now()),
    (meine_firma_tenant_id, 'customers', true, '4e228b7a-9fdb-43b5-9d3b-5bf0df42609b', now(), now()),
    (meine_firma_tenant_id, 'products', true, '4e228b7a-9fdb-43b5-9d3b-5bf0df42609b', now(), now()),
    (meine_firma_tenant_id, 'projects', false, '4e228b7a-9fdb-43b5-9d3b-5bf0df42609b', now(), now()),
    (meine_firma_tenant_id, 'reports', false, '4e228b7a-9fdb-43b5-9d3b-5bf0df42609b', now(), now()),
    (meine_firma_tenant_id, 'financial_management', true, '4e228b7a-9fdb-43b5-9d3b-5bf0df42609b', now(), now()),
    (meine_firma_tenant_id, 'expenses', true, '4e228b7a-9fdb-43b5-9d3b-5bf0df42609b', now(), now()),
    (meine_firma_tenant_id, 'revenue', true, '4e228b7a-9fdb-43b5-9d3b-5bf0df42609b', now(), now()),
    (meine_firma_tenant_id, 'payroll', false, '4e228b7a-9fdb-43b5-9d3b-5bf0df42609b', now(), now())
  ON CONFLICT (tenant_id, feature_name) DO UPDATE SET
    is_enabled = EXCLUDED.is_enabled,
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at;
  
  RAISE NOTICE 'Successfully configured Meine Firma tenant and linked user account';
END $$;