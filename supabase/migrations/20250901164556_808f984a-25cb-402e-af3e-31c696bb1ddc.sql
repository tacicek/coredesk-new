-- Update existing user and vendor with the correct tenant_id
DO $$
DECLARE
  existing_tenant_id UUID;
BEGIN
  -- Get the tenant_id for 'Meine Firma'
  SELECT id INTO existing_tenant_id 
  FROM public.tenants 
  WHERE company_name = 'Meine Firma' 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF existing_tenant_id IS NOT NULL THEN
    -- Update user profile
    UPDATE public.user_profiles 
    SET tenant_id = existing_tenant_id
    WHERE user_id = '4e228b7a-9fdb-43b5-9d3b-5bf0df42609b';
    
    -- Update vendor
    UPDATE public.vendors
    SET tenant_id = existing_tenant_id
    WHERE id = 'ffc42d47-4d73-4523-b760-d611d468e0df';
    
    -- Update the invoices feature to be disabled
    UPDATE public.tenant_features 
    SET is_enabled = false
    WHERE tenant_id = existing_tenant_id 
    AND feature_name = 'invoices';
    
    RAISE NOTICE 'Updated tenant_id to % for user and vendor', existing_tenant_id;
  ELSE
    RAISE NOTICE 'No tenant found for Meine Firma';
  END IF;
END $$;