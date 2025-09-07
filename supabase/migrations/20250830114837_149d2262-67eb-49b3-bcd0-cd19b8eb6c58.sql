-- Update the email address of the existing super admin user
UPDATE auth.users 
SET email = 'support@coredesk.ch',
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}') || '{"email": "support@coredesk.ch"}'
WHERE email = 'tuncaycicek@outlook.com';