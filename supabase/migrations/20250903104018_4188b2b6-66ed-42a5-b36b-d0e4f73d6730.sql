-- Fix security vulnerability: Protect proprietary report templates from unauthorized access
DROP POLICY IF EXISTS "Users can view available report templates" ON public.report_templates;

-- Create new secure policy that protects proprietary templates
CREATE POLICY "Users can view their vendor's templates and admins can view all" 
ON public.report_templates 
FOR SELECT 
USING (
  -- Super admins can see all templates
  is_super_admin_safe() 
  OR 
  -- Users can only see templates owned by their vendor (no more global template access)
  (vendor_id = get_user_vendor_id() AND vendor_id IS NOT NULL)
);