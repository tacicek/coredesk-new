-- Create a function to manually check and update overdue invoices
CREATE OR REPLACE FUNCTION public.process_overdue_invoices()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update overdue outgoing invoices
  UPDATE invoices 
  SET status = 'overdue' 
  WHERE due_date < CURRENT_DATE 
    AND status IN ('sent', 'pending')
    AND status != 'overdue';
  
  -- Update overdue incoming invoices  
  UPDATE incoming_invoices 
  SET status = 'overdue'
  WHERE due_date < CURRENT_DATE 
    AND status = 'pending'
    AND status != 'overdue';
    
  -- Create notifications for overdue outgoing invoices
  INSERT INTO notifications (vendor_id, type, title, message, priority, action_url)
  SELECT 
    vendor_id,
    'invoice_due',
    'Rechnung überfällig',
    'Ausgehende Rechnung ' || COALESCE(invoice_no, 'Nr. unbekannt') || ' an ' || 
    COALESCE(customer_name, 'Unbekannter Kunde') || ' ist überfällig (CHF ' || total::text || ')',
    'high',
    '/dashboard/invoices'
  FROM invoices 
  WHERE due_date < CURRENT_DATE 
    AND status = 'overdue'
    AND NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE type = 'invoice_due' 
        AND message LIKE '%' || invoices.invoice_no || '%'
        AND notifications.vendor_id = invoices.vendor_id
    );
    
  -- Create notifications for overdue incoming invoices
  INSERT INTO notifications (vendor_id, type, title, message, priority, action_url)
  SELECT 
    vendor_id,
    'invoice_due',
    'Eingangsrechnung überfällig',
    'Rechnung ' || COALESCE(invoice_number, 'Nr. unbekannt') || ' von ' || 
    COALESCE(vendor_name, 'Unbekannter Anbieter') || ' ist überfällig (CHF ' || amount::text || ')',
    'high',
    '/dashboard/incoming-invoices'
  FROM incoming_invoices 
  WHERE due_date < CURRENT_DATE 
    AND status = 'overdue'
    AND NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE type = 'invoice_due' 
        AND message LIKE '%' || incoming_invoices.invoice_number || '%'
        AND notifications.vendor_id = incoming_invoices.vendor_id
    );
END;
$function$;

-- Run the function to process existing overdue invoices
SELECT process_overdue_invoices();