-- Make the user a super admin
UPDATE public.admin_users 
SET 
  is_super_admin = true,
  updated_at = now()
WHERE user_id = 'd11a2629-8024-4d1c-a230-f96f1a9674dd';