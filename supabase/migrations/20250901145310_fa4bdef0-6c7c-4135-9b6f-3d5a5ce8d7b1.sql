-- Create approve_tenant function
CREATE OR REPLACE FUNCTION public.approve_tenant(
  p_tenant_id uuid,
  p_approval_token text
) RETURNS json AS $$
DECLARE
  tenant_record record;
  result json;
BEGIN
  -- Get the tenant and verify the approval token
  SELECT * INTO tenant_record 
  FROM public.tenants 
  WHERE id = p_tenant_id AND approval_token = p_approval_token;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Tenant not found or invalid approval token'
    );
  END IF;
  
  -- Update tenant approval status
  UPDATE public.tenants 
  SET 
    approval_status = 'approved',
    approved_at = now(),
    approved_by = auth.uid(),
    updated_at = now()
  WHERE id = p_tenant_id;
  
  -- Return success with tenant data
  RETURN json_build_object(
    'success', true,
    'message', 'Tenant approved successfully',
    'company_name', tenant_record.company_name,
    'contact_email', tenant_record.contact_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create reject_tenant function
CREATE OR REPLACE FUNCTION public.reject_tenant(
  p_tenant_id uuid,
  p_approval_token text,
  p_rejection_reason text DEFAULT ''
) RETURNS json AS $$
DECLARE
  tenant_record record;
  result json;
BEGIN
  -- Get the tenant and verify the approval token
  SELECT * INTO tenant_record 
  FROM public.tenants 
  WHERE id = p_tenant_id AND approval_token = p_approval_token;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Tenant not found or invalid approval token'
    );
  END IF;
  
  -- Update tenant approval status
  UPDATE public.tenants 
  SET 
    approval_status = 'rejected',
    rejected_at = now(),
    rejected_by = auth.uid(),
    rejection_reason = p_rejection_reason,
    updated_at = now()
  WHERE id = p_tenant_id;
  
  -- Return success with tenant data
  RETURN json_build_object(
    'success', true,
    'message', 'Tenant rejected successfully',
    'company_name', tenant_record.company_name,
    'contact_email', tenant_record.contact_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;