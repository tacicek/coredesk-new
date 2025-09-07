-- Drop existing triggers first
DROP TRIGGER IF EXISTS notify_payment_received_invoices ON invoices;
DROP TRIGGER IF EXISTS notify_payment_received_incoming_invoices ON incoming_invoices;

-- Create comprehensive notification function for all business activities
CREATE OR REPLACE FUNCTION public.notify_business_activity()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Handle invoice status changes
  IF TG_TABLE_NAME = 'invoices' THEN
    IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
      PERFORM create_notification(
        NEW.vendor_id,
        'payment',
        'Zahlung eingegangen',
        'Rechnung ' || COALESCE(NEW.invoice_no, 'Nr. unbekannt') || ' wurde bezahlt (CHF ' || NEW.total::text || ')',
        'medium',
        NULL,
        '/dashboard/invoices'
      );
    ELSIF TG_OP = 'INSERT' THEN
      PERFORM create_notification(
        NEW.vendor_id,
        'invoice',
        'Neue Rechnung erstellt',
        'Rechnung ' || COALESCE(NEW.invoice_no, 'Nr. unbekannt') || ' für CHF ' || NEW.total::text || ' wurde erstellt',
        'low',
        NEW.created_by,
        '/dashboard/invoices'
      );
    END IF;
  END IF;

  -- Handle incoming invoice activities
  IF TG_TABLE_NAME = 'incoming_invoices' THEN
    IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
      PERFORM create_notification(
        NEW.vendor_id,
        'payment',
        'Eingangsrechnung bezahlt',
        'Rechnung ' || COALESCE(NEW.invoice_number, 'Nr. unbekannt') || ' wurde als bezahlt markiert (CHF ' || NEW.amount::text || ')',
        'medium',
        NULL,
        '/dashboard/incoming-invoices'
      );
    ELSIF TG_OP = 'INSERT' THEN
      PERFORM create_notification(
        NEW.vendor_id,
        'invoice_received',
        'Neue Eingangsrechnung',
        'Eingangsrechnung von ' || COALESCE(NEW.vendor_name, 'Unbekannter Anbieter') || ' über CHF ' || NEW.amount::text || ' wurde hinzugefügt',
        'low',
        NEW.created_by,
        '/dashboard/incoming-invoices'
      );
    END IF;
  END IF;

  -- Handle daily revenue activities
  IF TG_TABLE_NAME = 'daily_revenue' THEN
    IF TG_OP = 'INSERT' THEN
      PERFORM create_notification(
        NEW.vendor_id,
        'revenue',
        'Umsatz hinzugefügt',
        'Täglicher Umsatz von CHF ' || NEW.amount::text || ' für ' || NEW.revenue_date::text || ' wurde eingetragen',
        'low',
        NEW.created_by,
        '/dashboard/revenue'
      );
    ELSIF TG_OP = 'UPDATE' AND NEW.amount != OLD.amount THEN
      PERFORM create_notification(
        NEW.vendor_id,
        'revenue',
        'Umsatz aktualisiert',
        'Täglicher Umsatz für ' || NEW.revenue_date::text || ' wurde auf CHF ' || NEW.amount::text || ' aktualisiert',
        'low',
        NULL,
        '/dashboard/revenue'
      );
    END IF;
  END IF;

  -- Handle payroll activities
  IF TG_TABLE_NAME = 'payroll_records' THEN
    IF TG_OP = 'INSERT' THEN
      PERFORM create_notification(
        NEW.vendor_id,
        'payroll',
        'Lohnabrechnung hinzugefügt',
        'Neue Lohnabrechnung für ' || NEW.payroll_month::text || '/' || NEW.payroll_year::text || ' wurde erstellt',
        'low',
        NEW.created_by,
        '/dashboard/payroll-management'
      );
    END IF;
  END IF;

  -- Handle business expenses
  IF TG_TABLE_NAME = 'business_expenses' THEN
    IF TG_OP = 'INSERT' THEN
      PERFORM create_notification(
        NEW.vendor_id,
        'expense',
        'Ausgabe hinzugefügt',
        'Neue Geschäftsausgabe über CHF ' || NEW.amount::text || ' wurde erfasst',
        'low',
        NEW.created_by,
        '/dashboard/expenses'
      );
    END IF;
  END IF;

  -- Handle employee expenses
  IF TG_TABLE_NAME = 'employee_expenses' THEN
    IF TG_OP = 'INSERT' THEN
      PERFORM create_notification(
        NEW.vendor_id,
        'expense',
        'Mitarbeiterausgabe hinzugefügt',
        'Neue Mitarbeiterausgabe für ' || NEW.employee_name || ' über CHF ' || NEW.amount::text || ' wurde erfasst',
        'low',
        NEW.created_by,
        '/dashboard/expenses'
      );
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create triggers for all relevant tables
CREATE TRIGGER notify_business_activity_invoices
  AFTER INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION notify_business_activity();

CREATE TRIGGER notify_business_activity_incoming_invoices
  AFTER INSERT OR UPDATE ON incoming_invoices
  FOR EACH ROW
  EXECUTE FUNCTION notify_business_activity();

CREATE TRIGGER notify_business_activity_daily_revenue
  AFTER INSERT OR UPDATE ON daily_revenue
  FOR EACH ROW
  EXECUTE FUNCTION notify_business_activity();

CREATE TRIGGER notify_business_activity_payroll_records
  AFTER INSERT OR UPDATE ON payroll_records
  FOR EACH ROW
  EXECUTE FUNCTION notify_business_activity();

CREATE TRIGGER notify_business_activity_business_expenses
  AFTER INSERT OR UPDATE ON business_expenses
  FOR EACH ROW
  EXECUTE FUNCTION notify_business_activity();

CREATE TRIGGER notify_business_activity_employee_expenses
  AFTER INSERT OR UPDATE ON employee_expenses
  FOR EACH ROW
  EXECUTE FUNCTION notify_business_activity();