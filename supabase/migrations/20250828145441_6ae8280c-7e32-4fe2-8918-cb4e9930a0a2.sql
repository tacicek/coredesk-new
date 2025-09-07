-- Update notifications table to allow new notification types
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add updated constraint with all the new notification types
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'payment', 
  'invoice_due', 
  'upload', 
  'invoice',
  'invoice_received',
  'revenue',
  'payroll',
  'expense'
));