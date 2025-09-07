-- Find and connect user to the newly created tenant
DO $$
DECLARE
  meine_firma_tenant_id UUID;
BEGIN
  -- Get the tenant ID for "Meine Firma"
  SELECT id INTO meine_firma_tenant_id 
  FROM public.tenants 
  WHERE company_name = 'Meine Firma' 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF meine_firma_tenant_id IS NOT NULL THEN
    -- Update user profile with tenant_id
    UPDATE public.user_profiles 
    SET tenant_id = meine_firma_tenant_id,
        approval_status = 'approved'
    WHERE user_id = '4e228b7a-9fdb-43b5-9d3b-5bf0df42609b';
    
    -- Update vendor with tenant_id
    UPDATE public.vendors
    SET tenant_id = meine_firma_tenant_id,
        is_active = true
    WHERE id = 'ffc42d47-4d73-4523-b760-d611d468e0df';
    
    -- Update existing features to disable invoices (if exists)
    UPDATE public.tenant_features 
    SET is_enabled = false,
        updated_by = '4e228b7a-9fdb-43b5-9d3b-5bf0df42609b',
        updated_at = now()
    WHERE tenant_id = meine_firma_tenant_id 
    AND feature_name = 'invoices';
    
    -- Insert missing features if they don't exist
    INSERT INTO public.tenant_features (tenant_id, feature_name, is_enabled, updated_by)
    SELECT meine_firma_tenant_id, feature_name, is_enabled, '4e228b7a-9fdb-43b5-9d3b-5bf0df42609b'
    FROM (VALUES 
        ('invoices', false),
        ('offers', true),
        ('customers', true),
        ('products', true),
        ('projects', false),
        ('reports', false),
        ('financial_management', true),
        ('expenses', true),
        ('revenue', true),
        ('payroll', false)
    ) AS new_features(feature_name, is_enabled)
    WHERE NOT EXISTS (
        SELECT 1 FROM public.tenant_features 
        WHERE tenant_id = meine_firma_tenant_id 
        AND feature_name = new_features.feature_name
    );
    
    RAISE NOTICE 'Updated user and vendor with tenant_id: %', meine_firma_tenant_id;
  ELSE
    RAISE NOTICE 'Meine Firma tenant not found';
  END IF;
END $$;