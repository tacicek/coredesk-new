import { Invoice } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { generateInvoicePDFAsBase64 } from './pdfGenerator';

export interface EmailData {
  to: string;
  subject: string;
  body: string;
  attachmentName?: string;
  attachmentData?: string;
}

export class EmailService {
  // Prevent double-clicking/multiple calls
  private static sendingEmails = new Set<string>();

  private static replaceTemplateVariables(template: string, invoice: Invoice, settings: any): string {
    const customerName = invoice.customerName || 'Kunde';
    const invoiceDate = new Date(invoice.date).toLocaleDateString('de-CH');
    
    return template
      .replace(/{invoiceNumber}/g, invoice.number)
      .replace(/{companyName}/g, settings.name || 'Ihr Unternehmen')
      .replace(/{customerName}/g, customerName)
      .replace(/{invoiceDate}/g, invoiceDate)
      .replace(/{amount}/g, `CHF ${invoice.total.toLocaleString('de-CH', { minimumFractionDigits: 2 })}`)
      .replace(/{dueDate}/g, new Date(invoice.dueDate).toLocaleDateString('de-CH'));
  }

  static async sendInvoiceEmail(invoice: Invoice): Promise<boolean> {
    console.log('🚀 STARTING EMAIL SEND PROCESS for invoice:', invoice.id);
    
    try {
      if (!invoice.customerEmail) {
        console.error('❌ No customer email provided');
        throw new Error('Kunde hat keine E-Mail-Adresse.');
      }

      // Prevent double-sends
      const emailKey = `${invoice.id}-${invoice.customerEmail}`;
      if (this.sendingEmails.has(emailKey)) {
        console.log('🚨 DEBUG: Email already being sent, skipping duplicate call for:', emailKey);
        return false;
      }

      this.sendingEmails.add(emailKey);

      console.log('🚨 DEBUG: EmailService.sendInvoiceEmail called for:', {
        invoiceId: invoice.id,
        customerEmail: invoice.customerEmail,
        timestamp: new Date().toISOString(),
        stackTrace: new Error().stack?.split('\n').slice(1, 4),
        callerInfo: 'CALL COUNT CHECK - WITH PDF GENERATION'
      });

      // Generate PDF using the proper PDF generator (same as download function)
      console.log('🔧 STEP 1: Starting PDF generation for email attachment using proper generator...');
      
      let pdfBase64: string;
      try {
        pdfBase64 = await generateInvoicePDFAsBase64(invoice);
        console.log('✅ STEP 1 COMPLETE: PDF generated successfully with proper template, size:', pdfBase64?.length || 0, 'characters');
      } catch (pdfError) {
        console.error('❌ STEP 1 FAILED: PDF generation error:', pdfError);
        throw new Error(`PDF generation failed: ${pdfError instanceof Error ? pdfError.message : 'Unknown PDF error'}`);
      }
      
      if (!pdfBase64) {
        console.error('❌ STEP 1 VALIDATION FAILED: PDF generation returned empty data');
        throw new Error('PDF generation returned empty data');
      }
      
      console.log('🔧 STEP 2: Calling edge function with PDF data...');

      // Call the Supabase edge function to send email with PDF
      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          type: 'invoice',
          itemId: invoice.id,
          to: invoice.customerEmail,
          pdfData: pdfBase64,
          pdfFilename: `Rechnung_${invoice.number}.pdf`
        }
      });

      console.log('✅ STEP 2 COMPLETE: Edge function response:', { 
        data: JSON.stringify(data, null, 2), 
        error: error ? JSON.stringify(error, null, 2) : null,
        timestamp: new Date().toISOString()
      });

      if (error) {
        console.error('❌ STEP 2 FAILED: Edge function error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        // Try to get more detailed error information
        let errorMessage = error.message || 'Unknown error';
        if (error.context) {
          errorMessage += ` Context: ${JSON.stringify(error.context)}`;
        }
        
        throw new Error(`Failed to send email: ${errorMessage}`);
      }

      console.log('🎉 EMAIL SEND PROCESS COMPLETED SUCCESSFULLY');
      
      // Remove from sending set after successful send
      this.sendingEmails.delete(emailKey);
      return true;

    } catch (error) {
      // Remove from sending set on error too
      const emailKey = `${invoice.id}-${invoice.customerEmail}`;
      this.sendingEmails.delete(emailKey);
      
      console.error('💥 EMAIL SEND PROCESS FAILED:', error);
      
      // More detailed error logging
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      throw error;
    }
  }

  static async sendOfferEmail(offerId: string, customerEmail: string): Promise<boolean> {
    try {
      if (!customerEmail) {
        throw new Error('Kunde hat keine E-Mail-Adresse.');
      }

      // Call the Supabase edge function to send offer email with PDF
      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          type: 'offer',
          itemId: offerId,
          to: customerEmail
        }
      });

      if (error) {
        throw new Error(`Failed to send email: ${error.message}`);
      }

      console.log('Offer email sent successfully:', data);
      return true;

    } catch (error) {
      console.error('Error sending offer email:', error);
      throw error;
    }
  }
}