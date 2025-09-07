-- Fix the handle_new_user function to handle null/invalid JSON properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_vendor_id uuid;
  new_tenant_id uuid;
  user_metadata jsonb;
BEGIN
  -- Safely handle raw_user_meta_data (might be null or invalid JSON)
  user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  
  -- Create a new tenant first
  INSERT INTO public.tenants (
    company_name,
    contact_email,
    contact_person,
    status
  )
  VALUES (
    COALESCE(user_metadata->>'company_name', 'Meine Firma'),
    NEW.email,
    COALESCE(
      CONCAT(user_metadata->>'first_name', ' ', user_metadata->>'last_name'),
      NEW.email
    ),
    'trial'
  )
  RETURNING id INTO new_tenant_id;

  -- Create a new vendor for the user and link to tenant
  INSERT INTO public.vendors (name, slug, is_active, tenant_id)
  VALUES (
    COALESCE(user_metadata->>'company_name', 'Meine Firma'),
    lower(replace(COALESCE(user_metadata->>'company_name', 'meine-firma'), ' ', '-')) || '-' || substring(NEW.id::text, 1, 8),
    true,
    new_tenant_id
  )
  RETURNING id INTO new_vendor_id;

  -- Create user profile linked to both vendor and tenant
  INSERT INTO public.user_profiles (
    user_id, 
    vendor_id, 
    tenant_id,
    is_owner, 
    role,
    first_name, 
    last_name
  )
  VALUES (
    NEW.id,
    new_vendor_id,
    new_tenant_id,
    true,
    'admin',
    user_metadata->>'first_name',
    user_metadata->>'last_name'
  );

  -- Create default company settings for the vendor
  INSERT INTO public.company_settings (
    user_id,
    vendor_id,
    name,
    email,
    default_tax_rate,
    default_due_days,
    invoice_number_format
  )
  VALUES (
    NEW.id,
    new_vendor_id,
    COALESCE(user_metadata->>'company_name', 'Meine Firma'),
    NEW.email,
    8.1,
    30,
    'F-{YYYY}-{MM}-{###}'
  );

  RETURN NEW;
END;
$function$;