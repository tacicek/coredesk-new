-- Check and create triggers for automatic notification creation

-- First, create trigger for overdue invoices on the invoices table
DROP TRIGGER IF EXISTS trigger_check_overdue_invoices ON invoices;
CREATE TRIGGER trigger_check_overdue_invoices
  AFTER UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION check_overdue_invoices();

-- Create trigger for overdue incoming invoices
DROP TRIGGER IF EXISTS trigger_check_overdue_incoming_invoices ON incoming_invoices;
CREATE TRIGGER trigger_check_overdue_incoming_invoices
  AFTER UPDATE ON incoming_invoices
  FOR EACH ROW
  EXECUTE FUNCTION check_overdue_invoices();

-- Create trigger for upload success notifications
DROP TRIGGER IF EXISTS trigger_notify_upload_success ON incoming_invoices;
CREATE TRIGGER trigger_notify_upload_success
  AFTER INSERT ON incoming_invoices
  FOR EACH ROW
  EXECUTE FUNCTION notify_upload_success();

-- Create trigger for payment received notifications
DROP TRIGGER IF EXISTS trigger_notify_payment_received ON invoices;
CREATE TRIGGER trigger_notify_payment_received
  AFTER UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_received();

-- Also create trigger for incoming invoice payments
DROP TRIGGER IF EXISTS trigger_notify_payment_received_incoming ON incoming_invoices;
CREATE TRIGGER trigger_notify_payment_received_incoming
  AFTER UPDATE ON incoming_invoices
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_received();

-- Update the check_overdue_invoices function to handle both invoice types
CREATE OR REPLACE FUNCTION public.check_overdue_invoices()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Check if outgoing invoice is now overdue
  IF TG_TABLE_NAME = 'invoices' AND NEW.due_date < CURRENT_DATE AND NEW.status IN ('sent', 'pending') AND (OLD.status != 'overdue' OR OLD.status IS NULL) THEN
    -- Mark invoice as overdue
    UPDATE invoices SET status = 'overdue' WHERE id = NEW.id;
    
    -- Create notification
    PERFORM create_notification(
      NEW.vendor_id,
      'invoice_due',
      'Rechnung überfällig',
      'Ausgehende Rechnung ' || COALESCE(NEW.invoice_no, 'Nr. unbekannt') || ' an ' || 
      COALESCE(NEW.customer_name, 'Unbekannter Kunde') || ' ist überfällig (CHF ' || NEW.total::text || ')',
      'high',
      NULL,
      '/dashboard/invoices'
    );
  END IF;
  
  -- Check if incoming invoice is now overdue
  IF TG_TABLE_NAME = 'incoming_invoices' AND NEW.due_date < CURRENT_DATE AND NEW.status = 'pending' AND (OLD.status != 'overdue' OR OLD.status IS NULL) THEN
    -- Mark incoming invoice as overdue
    UPDATE incoming_invoices SET status = 'overdue' WHERE id = NEW.id;
    
    -- Create notification
    PERFORM create_notification(
      NEW.vendor_id,
      'invoice_due',
      'Eingangsrechnung überfällig',
      'Rechnung ' || COALESCE(NEW.invoice_number, 'Nr. unbekannt') || ' von ' || 
      COALESCE(NEW.vendor_name, 'Unbekannter Anbieter') || ' ist überfällig (CHF ' || NEW.amount::text || ')',
      'high',
      NULL,
      '/dashboard/incoming-invoices'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update the notify_payment_received function to handle both types
CREATE OR REPLACE FUNCTION public.notify_payment_received()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Check if outgoing invoice status changed to paid
  IF TG_TABLE_NAME = 'invoices' AND NEW.status = 'paid' AND OLD.status != 'paid' THEN
    PERFORM create_notification(
      NEW.vendor_id,
      'payment',
      'Zahlung eingegangen',
      'Rechnung ' || COALESCE(NEW.invoice_no, 'Nr. unbekannt') || ' wurde bezahlt (CHF ' || NEW.total::text || ')',
      'medium',
      NULL,
      '/dashboard/invoices'
    );
  END IF;
  
  -- Check if incoming invoice status changed to paid
  IF TG_TABLE_NAME = 'incoming_invoices' AND NEW.status = 'paid' AND OLD.status != 'paid' THEN
    PERFORM create_notification(
      NEW.vendor_id,
      'payment',
      'Rechnung bezahlt',
      'Eingangsrechnung ' || COALESCE(NEW.invoice_number, 'Nr. unbekannt') || ' wurde als bezahlt markiert (CHF ' || NEW.amount::text || ')',
      'medium',
      NULL,
      '/dashboard/incoming-invoices'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;