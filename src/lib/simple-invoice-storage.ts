import { supabase } from '@/integrations/supabase/client';
import { Invoice } from '@/types';

export const simpleInvoiceStorage = {
  add: async (invoice: Invoice): Promise<void> => {
    // Get user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get vendor ID  
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('vendor_id')
      .eq('user_id', user.id)
      .single();
    
    if (!profile?.vendor_id) throw new Error('No vendor found');

    // Generate a unique invoice number at insertion time
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    
    let uniqueInvoiceNumber: string;
    let attempts = 0;
    const maxAttempts = 100;
    
    // Keep trying to insert until we get a unique invoice number
    while (attempts < maxAttempts) {
      // Get all invoices for this year-month to find the highest counter
      const { data: allInvoices } = await supabase
        .from('invoices')
        .select('invoice_no')
        .eq('vendor_id', profile.vendor_id)
        .like('invoice_no', `F-${year}-${month}-%`);
      
      let counter = 1;
      if (allInvoices && allInvoices.length > 0) {
        // Extract all counters and find the maximum
        const counters = allInvoices
          .map(invoice => {
            const match = invoice.invoice_no.match(/F-\d{4}-\d{2}-(\d+)/);
            return match ? parseInt(match[1]) : 0;
          })
          .filter(num => !isNaN(num));
        
        if (counters.length > 0) {
          counter = Math.max(...counters) + 1;
        }
      }
      
      uniqueInvoiceNumber = `F-${year}-${month}-${counter.toString().padStart(3, '0')}`;
      
      // Try to insert the invoice with this number
      const { data: newInvoice, error } = await supabase
        .from('invoices')
        .insert({
          invoice_no: uniqueInvoiceNumber,
          customer_name: invoice.customerName,
          customer_email: invoice.customerEmail,
          vendor_id: profile.vendor_id,
          created_by: user.id,
          issue_date: invoice.date,
          due_date: invoice.dueDate,
          subtotal: invoice.subtotal,
          tax_total: invoice.taxTotal,
          total: invoice.total,
          status: invoice.status,
          notes: invoice.notes || '',
          currency: 'CHF'
        })
        .select('id')
        .single();

      if (error && error.code === '23505' && error.message?.includes('invoice_no')) {
        // Duplicate invoice number, try again with next counter
        attempts++;
        continue;
      } else if (error) {
        console.error('Simple invoice insert error:', error);
        throw new Error('Invoice could not be created');
      }

      // Success! Insert items and return
      if (invoice.items?.length > 0) {
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(
            invoice.items.map(item => ({
              invoice_id: newInvoice.id,
              created_by: user.id,
              description: item.description,
              qty: item.quantity,
              unit_price: item.unitPrice,
              tax_rate: item.taxRate || 0,
              line_total: item.total
            }))
          );

        if (itemsError) {
          console.error('Simple items insert error:', itemsError);
          throw new Error('Invoice items could not be created');
        }
      }
      
      return; // Success
    }
    
    throw new Error('Could not generate unique invoice number after multiple attempts');
  }
};