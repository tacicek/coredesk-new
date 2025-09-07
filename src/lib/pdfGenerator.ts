import jsPDF from 'jspdf';
import { Invoice } from '@/types';
import { drawSwissQRCodeToPDF, cleanAndValidateSwissIBAN } from './swissQR';
// import { settingsStorage } from './storage-simple'; // DISABLED
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export async function generateInvoicePDF(invoice: Invoice): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  // Load settings from Supabase
  const { supabase } = await import('@/integrations/supabase/client');
  
  let settings = {
    name: 'Meine Firma',
    address: '',
    phone: '',
    email: '',
    taxNumber: '',
    qrIban: '',
    bankName: '',
    logo: '',
    invoiceNumberFormat: 'F-{YYYY}-{MM}-{###}',
    defaultDueDays: 30,
    defaultTaxRate: 8.1,
    contactPerson: '',
    contactPosition: ''
  };

  try {
    // Get user's vendor ID first
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('vendor_id')
        .eq('user_id', user.id)
        .single();

      if (profile?.vendor_id) {
        // Get company settings for this vendor
        const { data: companySettings } = await supabase
          .from('company_settings')
          .select('*')
          .eq('vendor_id', profile.vendor_id)
          .single();

        if (companySettings) {
          settings = {
            name: companySettings.name || 'Meine Firma',
            address: companySettings.address || '',
            phone: companySettings.phone || '',
            email: companySettings.email || '',
            taxNumber: companySettings.tax_number || '',
            qrIban: companySettings.qr_iban || '',
            bankName: companySettings.bank_name || '',
            logo: companySettings.logo || '',
            invoiceNumberFormat: companySettings.invoice_number_format || 'F-{YYYY}-{MM}-{###}',
            defaultDueDays: companySettings.default_due_days || 30,
            defaultTaxRate: companySettings.default_tax_rate || 8.1,
            contactPerson: '',
            contactPosition: ''
          };
        }
      }
    }
  } catch (error) {
    console.error('Error loading company settings from Supabase:', error);
    // Will use default settings if database query fails
  }
  
  console.log('PDF Generator - Loaded settings:', settings);
  
  // Page dimensions
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 5; // Reduced to 5mm for maximum content width
  const contentWidth = pageWidth - (margin * 2);
  
  // Calculate content height and center vertically
  const estimatedContentHeight = 200; // Estimate based on typical invoice content
  const availableHeight = pageHeight - (margin * 2);
  const verticalOffset = Math.max(0, (availableHeight - estimatedContentHeight) / 4); // Quarter offset for better visual balance
  let yPosition = margin + verticalOffset;
  
  // === CLEAN MINIMAL INVOICE DESIGN ===
  
  // Sol taraf - Şirket logo ve bilgileri (resimde görüldüğü gibi)
  let leftYPosition = margin + verticalOffset;
  
  // Logo (üstte, solda)
  if (settings.logo) {
    try {
      const logoSize = 20; // Logo boyutu - kare format için aynı boyut (büyültüldü)
      pdf.addImage(settings.logo, 'JPEG', margin, leftYPosition, logoSize, logoSize);
      leftYPosition += logoSize + 5;
    } catch (error) {
      console.error('Error loading logo:', error);
    }
  }
  
  // Şirket adı (büyük font)
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  pdf.text(settings.name || 'Ihr Unternehmen', margin, leftYPosition);
  leftYPosition += 6;
  
  // Şirket adresi
  pdf.setFontSize(9);
  pdf.setTextColor(0, 0, 0);
  if (settings.address) {
    const addressLines = settings.address.split('\n');
    addressLines.forEach((line) => {
      pdf.text(line, margin, leftYPosition);
      leftYPosition += 4;
    });
  }
  
  // Telefon ve email (eğer varsa)
  if (settings.phone) {
    leftYPosition += 2;
    pdf.text(`Tel: ${settings.phone}`, margin, leftYPosition);
    leftYPosition += 4;
  }
  if (settings.email) {
    pdf.text(`E-Mail: ${settings.email}`, margin, leftYPosition);
    leftYPosition += 4;
  }
  
  // Sağ taraf - Fatura bilgileri (resimde görüldüğü gibi)
  const rightColumnX = pageWidth - margin - 80; // Daha geniş alan
  let rightYPosition = margin + verticalOffset;
  
  // Fatura başlığı
  pdf.setFontSize(16);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Rechnung ' + invoice.number, rightColumnX, rightYPosition);
  rightYPosition += 10;
  
  // Fatura detayları
  pdf.setFontSize(9);
  pdf.setTextColor(0, 0, 0);
  
  // Datum satırı
  pdf.text('Datum:', rightColumnX, rightYPosition);
  pdf.text(format(new Date(invoice.date), 'dd.MM.yyyy'), rightColumnX + 35, rightYPosition);
  rightYPosition += 5;
  
  // Zahlbar bis satırı
  pdf.text('Zahlbar bis:', rightColumnX, rightYPosition);
  pdf.text(format(new Date(invoice.dueDate), 'dd.MM.yyyy'), rightColumnX + 35, rightYPosition);
  rightYPosition += 5;
  
  // Ansprechpartner
  pdf.text('Ihr Ansprechpartner:', rightColumnX, rightYPosition);
  const contactName = settings.contactPerson || settings.name || 'Kundenservice';
  pdf.text(contactName, rightColumnX + 35, rightYPosition);
  rightYPosition += 5;
  
  // Kundennummer (şimdilik sabit)
  pdf.text('Kundennummer:', rightColumnX, rightYPosition);
  pdf.text('000034', rightColumnX + 35, rightYPosition);
  rightYPosition += 5;
  
  // Set y position after header sections
  yPosition = Math.max(leftYPosition, rightYPosition) + 20;
  
  // Müşteri adresi - mektup gönderme için gerekli
  yPosition += 15;
  
  // Fetch customer details including address
  let customerAddress = '';
  try {
    if (invoice.customerName) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('vendor_id')
          .eq('user_id', user.id)
          .single();

        if (profile?.vendor_id) {
          // Find customer by name in the vendor's customers to get address
          const { data: customer } = await supabase
            .from('customers')
            .select('name, address')
            .eq('vendor_id', profile.vendor_id)
            .eq('name', invoice.customerName)
            .single();

          if (customer?.address) {
            customerAddress = customer.address;
          }
        }
      }
    }
  } catch (error) {
    console.log('Could not fetch customer address:', error);
  }
  
  // Display customer name and address
  if (invoice.customerName) {
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text(invoice.customerName, margin, yPosition);
    yPosition += 6;
    
    // Display customer address if available
    if (customerAddress) {
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      const addressLines = customerAddress.split('\n');
      addressLines.forEach((line) => {
        if (line.trim()) {
          pdf.text(line.trim(), margin, yPosition);
          yPosition += 4;
        }
      });
    }
    
    yPosition += 10;
  }
  
  // Greeting text
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  
  // Generate personalized greeting based on customer data
  let topGreeting = 'Sehr geehrte Damen und Herren';
  
  // Try to get customer data for personalized greeting using customer_id from invoice
  try {
    if (invoice.customerName) {
      // Get customer details from Supabase if we have customer_id
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('vendor_id')
          .eq('user_id', user.id)
          .single();

        if (profile?.vendor_id) {
          // Find customer by name in the vendor's customers
          const { data: customer } = await supabase
            .from('customers')
            .select('contact_person, contact_gender')
            .eq('vendor_id', profile.vendor_id)
            .eq('name', invoice.customerName)
            .single();

          if (customer?.contact_person && customer.contact_person.trim()) {
            // Use contact person for greeting
            const contactPerson = customer.contact_person.trim();
            
            if (customer.contact_gender === 'male') {
              topGreeting = `Sehr geehrter Herr ${contactPerson}`;
            } else if (customer.contact_gender === 'female') {
              topGreeting = `Sehr geehrte Frau ${contactPerson}`;
            } else {
              // Gender neutral or not specified
              topGreeting = `Sehr geehrte/r ${contactPerson}`;
            }
          }
          // If no contact_person, keep default "Sehr geehrte Damen und Herren"
        }
      }
    }
  } catch (error) {
    console.log('Using default greeting due to:', error);
    // Keep default greeting on any error
  }
  
  pdf.text(topGreeting, margin, yPosition);
  yPosition += 8;
  
  pdf.text('Für die Erledigung der von Ihnen beauftragten Tätigkeiten berechnen wir Ihnen wie folgt:', margin, yPosition);
  yPosition += 15;
  
  // Clean minimal table with proper column spacing
  const tableX = margin;
  const tableWidth = contentWidth;
  const tableHeaderHeight = 8;
  
  // Define column widths to prevent overlap
  const col1Width = 15;  // AUFTRAG column
  const col2Width = 85;  // BEZEICHNUNG column (wider for descriptions)
  const col3Width = 25;  // ANZAHL column
  const col4Width = 25;  // EP column
  const col5Width = 30;  // BETRAG column
  
  // Simple table header with bottom line
  pdf.setDrawColor(150, 150, 150);
  pdf.setLineWidth(0.3);
  pdf.line(tableX, yPosition + tableHeaderHeight, tableX + tableWidth, yPosition + tableHeaderHeight);
  
  // Header text with proper spacing
  pdf.setFontSize(9);
  pdf.setTextColor(80, 80, 80);
  pdf.text('AUFTRAG', tableX + 2, yPosition + 6);
  pdf.text('BEZEICHNUNG', tableX + col1Width + 5, yPosition + 6);  // Added more spacing
  pdf.text('ANZAHL', tableX + col1Width + col2Width + col3Width - 2, yPosition + 6, { align: 'right' });
  pdf.text('EP', tableX + col1Width + col2Width + col3Width + col4Width - 2, yPosition + 6, { align: 'right' });
  pdf.text('BETRAG', tableX + tableWidth - 2, yPosition + 6, { align: 'right' });
  
  yPosition += tableHeaderHeight;
  let tableContentStartY = yPosition;
  
  // Items with proper column boundaries
  invoice.items.forEach((item, index) => {
    if (yPosition > pageHeight - 120) {
      pdf.addPage();
      yPosition = margin + 20;
      tableContentStartY = yPosition;
    }
    
    // Calculate required height for this row based on description length
    const maxDescWidth = col2Width - 4; // Leave some padding
    const descriptionLines = pdf.splitTextToSize(item.description, maxDescWidth);
    const itemHeight = Math.max(8, descriptionLines.length * 4 + 2);
    
    // Alternating row background
    if (index % 2 === 1) {
      pdf.setFillColor(252, 252, 252);
      pdf.rect(tableX, yPosition, tableWidth, itemHeight, 'F');
    }
    
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    
    // Position number (AUFTRAG)
    pdf.text((index + 1).toString(), tableX + 2, yPosition + 6);
    
    // Description (BEZEICHNUNG) - multi-line with proper boundaries
    pdf.text(descriptionLines, tableX + col1Width + 2, yPosition + 6);
    
    // Quantity with unit (ANZAHL) - right aligned
    const quantityText = `${item.quantity} Std.`;
    pdf.text(quantityText, tableX + col1Width + col2Width + col3Width - 2, yPosition + 6, { align: 'right' });
    
    // Unit price (EP) - right aligned
    const formattedUnitPrice = `CHF ${item.unitPrice.toFixed(2)}`;
    pdf.text(formattedUnitPrice, tableX + col1Width + col2Width + col3Width + col4Width - 2, yPosition + 6, { align: 'right' });
    
    // Total (BETRAG) - right aligned
    const formattedTotal = `CHF ${item.total.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    pdf.text(formattedTotal, tableX + tableWidth - 2, yPosition + 6, { align: 'right' });
    
    yPosition += itemHeight;
    
    // Add border line between items
    if (index < invoice.items.length - 1) {
      pdf.setDrawColor(235, 235, 235);
      pdf.setLineWidth(0.2);
      pdf.line(tableX, yPosition, tableX + tableWidth, yPosition);
    }
  });
  
  // Clean totals section - right aligned without background
  yPosition += 15;
  
  const totalsX = tableX + tableWidth - 70;
  let totalsY = yPosition;
  
  // Subtotal line
  pdf.setDrawColor(150, 150, 150);
  pdf.setLineWidth(0.3);
  pdf.line(totalsX, totalsY - 3, tableX + tableWidth, totalsY - 3);
  
  // Subtotal (Zwischensumme ex kl. MwSt.)
  pdf.setFontSize(9);
  pdf.setTextColor(80, 80, 80);
  pdf.text('Zwischensumme ex kl. MwSt.', totalsX, totalsY);
  pdf.setTextColor(0, 0, 0);
  const formattedSubtotal = `${invoice.subtotal.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  pdf.text(formattedSubtotal, tableX + tableWidth - 4, totalsY, { align: 'right' });
  totalsY += 5;
  
  // Tax - Calculate unique tax rates and amounts
  const taxGroups = invoice.items.reduce((groups, item) => {
    const rate = item.taxRate;
    if (!groups[rate]) {
      groups[rate] = { rate, taxAmount: 0 };
    }
    groups[rate].taxAmount += (item.total * rate) / 100;
    return groups;
  }, {} as Record<number, { rate: number; taxAmount: number }>);
  
  // Display each tax rate separately
  Object.values(taxGroups).forEach((taxGroup) => {
    pdf.setTextColor(80, 80, 80);
    pdf.text(`MwSt. ${taxGroup.rate.toFixed(1)} %`, totalsX, totalsY);
    pdf.setTextColor(0, 0, 0);
    const formattedTax = `${taxGroup.taxAmount.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    pdf.text(formattedTax, tableX + tableWidth - 4, totalsY, { align: 'right' });
    totalsY += 5;
  });
  
  // Total line
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.line(totalsX, totalsY, tableX + tableWidth, totalsY);
  totalsY += 5;
  
  // Total amount (Rechnungstotal inkl. MwSt.)
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Rechnungstotal inkl. MwSt.', totalsX, totalsY);
  const formattedTotal = `CHF ${invoice.total.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  pdf.text(formattedTotal, tableX + tableWidth - 4, totalsY, { align: 'right' });
  
  yPosition = totalsY + 15;
  
  // Payment terms and closing - cleaner format
  yPosition += 10;
  
  pdf.setFontSize(9);
  pdf.setTextColor(0, 0, 0);
  
  // Calculate due days for payment terms
  const invoiceDate = new Date(invoice.date);
  const dueDate = new Date(invoice.dueDate);
  const diffTime = Math.abs(dueDate.getTime() - invoiceDate.getTime());
  const dueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Zahlungskonditionen section
  pdf.text(`Zahlungskonditionen: ${dueDays} Tage netto`, margin, yPosition);
  yPosition += 5;
  pdf.text('Besten Dank für Ihren Auftrag.', margin, yPosition);
  yPosition += 15;
  
  pdf.text('Mit freundlichen Grüssen', margin, yPosition);
  yPosition += 8;
  
  // Use contact person if available, otherwise fall back to company name
  if (settings.contactPerson && settings.contactPerson.trim()) {
    pdf.text(settings.contactPerson, margin, yPosition);
    yPosition += 4;
    if (settings.contactPosition && settings.contactPosition.trim()) {
      pdf.text(settings.contactPosition, margin, yPosition);
    }
  } else {
    pdf.text(settings.name || 'Ihr Unternehmen', margin, yPosition);
  }
  
  // Notes
  if (invoice.notes) {
    yPosition += 12;
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Bemerkungen:', margin, yPosition);
    yPosition += 5;
    
    const noteLines = pdf.splitTextToSize(invoice.notes, contentWidth);
    pdf.setTextColor(80, 80, 80);
    pdf.text(noteLines, margin, yPosition);
  }
  
  // === MODERN SWISS QR PAYMENT SECTION ===
  // Check if we need a new page for QR section
  if (yPosition > pageHeight - 120) {
    pdf.addPage();
    yPosition = margin;
  } else {
    yPosition += 20;
  }
  
  // QR Section Header with icon
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  
  // Draw QR icon (Swiss style)
  pdf.setFillColor(0, 0, 0);
  pdf.rect(margin, yPosition - 3, 6, 6, 'F');
  pdf.setFillColor(255, 255, 255);
  pdf.rect(margin + 1.5, yPosition - 1.5, 3, 3, 'F');
  
  pdf.text('Zahlteil (Swiss QR)', margin + 10, yPosition + 2);
  yPosition += 12;
  
  try {
    console.warn('🔄 PDF OLUŞTURULUYOR - QR KODUNA BAŞLIYORUZ');
    console.log('=== PDF QR Generation Debug ===');
    console.log('Invoice for QR:', {
      number: invoice.number,
      total: invoice.total,
      customerName: invoice.customerName,
      dueDate: invoice.dueDate
    });
    
    const qrBillHeight = 105;
    const qrBillPadding = 4;
    const qrBillWidth = contentWidth; // Use full content width
    const qrBillX = margin;
    // Draw the QR section frame earlier to know Y extents
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.3);
    pdf.rect(qrBillX, yPosition, qrBillWidth, qrBillHeight, 'S');
    
    // Grid system: left 62mm, right remaining area
    const leftSectionWidth = 62;
    const rightSectionWidth = qrBillWidth - leftSectionWidth;
    const exactMiddle = qrBillX + leftSectionWidth;
    
    // === LEFT SIDE: EMPFANGSSCHEIN (RECEIPT) ===
    const receiptX = qrBillX + qrBillPadding;
    const maxReceiptWidth = leftSectionWidth - (qrBillPadding * 2);
    let receiptY = yPosition + qrBillPadding;
    
    // Receipt title
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Empfangsschein', receiptX, receiptY);
    receiptY += 12;
    
    // Konto / Zahlbar an
    pdf.setFontSize(6);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Konto / Zahlbar an', receiptX, receiptY);
    receiptY += 5;
    pdf.setFontSize(8);
    const rawIban = settings.qrIban || 'CH4431999123000889012';
    let cleanedReceiptIban = rawIban;
    try {
      cleanedReceiptIban = cleanAndValidateSwissIBAN(rawIban);
    } catch {}
    pdf.text(cleanedReceiptIban.replace(/(.{4})/g, '$1 ').trim(), receiptX, receiptY);
    receiptY += 4;
    
    // Split long text to fit in receipt area
    const companyNameLines = pdf.splitTextToSize(settings.name || 'Ihr Unternehmen', maxReceiptWidth);
    pdf.text(companyNameLines, receiptX, receiptY);
    receiptY += companyNameLines.length * 4;
    
    if (settings.address) {
      const addressLines = settings.address.split('\n').slice(0, 2);
      addressLines.forEach((line) => {
        const splitLines = pdf.splitTextToSize(line, maxReceiptWidth);
        pdf.text(splitLines, receiptX, receiptY);
        receiptY += splitLines.length * 4;
      });
    }
    receiptY += 6;
    
    // Zahlbar durch
    if (invoice.customerName) {
      pdf.setFontSize(6);
      pdf.text('Zahlbar durch', receiptX, receiptY);
      receiptY += 5;
      pdf.setFontSize(8);
      
      const customerNameLines = pdf.splitTextToSize(invoice.customerName, maxReceiptWidth);
      pdf.text(customerNameLines, receiptX, receiptY);
      receiptY += customerNameLines.length * 4 + 6;
    }
    
    // Währung / Betrag
    pdf.setFontSize(6);
    pdf.text('Währung / Betrag', receiptX, receiptY);
    receiptY += 5;
    pdf.setFontSize(8);
    pdf.text(`CHF ${invoice.total.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, receiptX, receiptY);
    receiptY += 12;
    
    // Annahmestelle
    pdf.setFontSize(6);
    pdf.text('Annahmestelle', receiptX, receiptY);
    
    // Vertical separator line at exactly 62mm
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.2);
    pdf.line(exactMiddle, yPosition, exactMiddle, yPosition + qrBillHeight);
    
    // === RIGHT SIDE: ZAHLTEIL (PAYMENT PART) ===
    const paymentX = exactMiddle + qrBillPadding;
    let paymentY = yPosition + qrBillPadding;
    
    // Payment title
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Zahlteil', paymentX, paymentY);
    paymentY += 15;
    
    // Right side grid: QR code area and details area
    const qrAreaWidth = 50;
    const detailsAreaWidth = rightSectionWidth - qrAreaWidth - (qrBillPadding * 2);
    
    // QR Code - draw as vector, 46x46mm with 5mm quiet zone embedded
    const qrSize = 46;
    const qrCodeX = paymentX;
    const qrCodeY = paymentY;
    await drawSwissQRCodeToPDF(pdf, qrCodeX, qrCodeY, qrSize, invoice);
    
    // Payment details (right of QR code)
    const detailsX = paymentX + qrAreaWidth + 6;
    const maxDetailsWidth = detailsAreaWidth - 8;
    let detailsY = qrCodeY;
    
    // Währung / Betrag
    pdf.setFontSize(6);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Währung / Betrag', detailsX, detailsY);
    detailsY += 5;
    pdf.setFontSize(11);
    pdf.text(`CHF ${invoice.total.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, detailsX, detailsY);
    detailsY += 10;
    
    // Konto / Zahlbar an
    pdf.setFontSize(6);
    pdf.text('Konto / Zahlbar an', detailsX, detailsY);
    detailsY += 5;
    pdf.setFontSize(8);
    pdf.text(cleanedReceiptIban.replace(/(.{4})/g, '$1 ').trim(), detailsX, detailsY);
    detailsY += 4;
    
    const detailsCompanyLines = pdf.splitTextToSize(settings.name || 'Ihr Unternehmen', maxDetailsWidth);
    pdf.text(detailsCompanyLines, detailsX, detailsY);
    detailsY += detailsCompanyLines.length * 4;
    
    if (settings.address) {
      const addressLines = settings.address.split('\n').slice(0, 2);
      addressLines.forEach((line) => {
        const splitLines = pdf.splitTextToSize(line, maxDetailsWidth);
        pdf.text(splitLines, detailsX, detailsY);
        detailsY += splitLines.length * 4;
      });
    }
    detailsY += 4;
    
    // Zahlbar durch
    if (invoice.customerName) {
      pdf.setFontSize(6);
      pdf.text('Zahlbar durch', detailsX, detailsY);
      detailsY += 5;
      pdf.setFontSize(8);
      
      const detailsCustomerLines = pdf.splitTextToSize(invoice.customerName, maxDetailsWidth);
      pdf.text(detailsCustomerLines, detailsX, detailsY);
      detailsY += detailsCustomerLines.length * 4;
    }
    
    // Additional information (below QR code)
    const additionalInfoY = qrCodeY + qrSize + 6;
    pdf.setFontSize(6);
    pdf.text('Zusätzliche Informationen', paymentX, additionalInfoY);
    pdf.setFontSize(8);
    pdf.text(`Rechnung ${invoice.number}`, paymentX, additionalInfoY + 4);
    pdf.text(`Fälligkeitsdatum: ${format(new Date(invoice.dueDate), 'dd.MM.yyyy')}`, paymentX, additionalInfoY + 8);
    
  } catch (error) {
    console.error('QR Code generation failed:', error);
    pdf.setFontSize(10);
    pdf.setTextColor(255, 0, 0);
    pdf.text('QR-Code konnte nicht generiert werden', margin, yPosition + 30);
  }
  
  // Footer notice - safe positioning
  const footerY = Math.max(yPosition + 75, pageHeight - 30);
  pdf.setFontSize(7);
  pdf.setTextColor(120, 120, 120);
  pdf.text('Dies ist eine automatisch generierte Rechnung. Ersetzen Sie die Platzhalter-IBAN mit Ihrer produktiven IBAN.', margin, footerY);
  
  // Save the PDF
  const fileName = `Rechnung_${invoice.number}_${invoice.customerName?.replace(/[^a-zA-Z0-9]/g, '_') || 'Kunde'}.pdf`;
  pdf.save(fileName);
}

/**
 * Generate invoice PDF as base64 string for email attachments
 * Uses the same template as generateInvoicePDF() to ensure consistency
 */
export async function generateInvoicePDFAsBase64(invoice: Invoice): Promise<string> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  // Load settings from Supabase
  const { supabase } = await import('@/integrations/supabase/client');
  
  let settings = {
    name: 'Meine Firma',
    address: '',
    phone: '',
    email: '',
    taxNumber: '',
    qrIban: '',
    bankName: '',
    logo: '',
    invoiceNumberFormat: 'F-{YYYY}-{MM}-{###}',
    defaultDueDays: 30,
    defaultTaxRate: 8.1,
    contactPerson: '',
    contactPosition: ''
  };

  try {
    // Get user's vendor ID first
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('vendor_id')
        .eq('user_id', user.id)
        .single();

      if (profile?.vendor_id) {
        // Get company settings for this vendor
        const { data: companySettings } = await supabase
          .from('company_settings')
          .select('*')
          .eq('vendor_id', profile.vendor_id)
          .single();

        if (companySettings) {
          settings = {
            name: companySettings.name || 'Meine Firma',
            address: companySettings.address || '',
            phone: companySettings.phone || '',
            email: companySettings.email || '',
            taxNumber: companySettings.tax_number || '',
            qrIban: companySettings.qr_iban || '',
            bankName: companySettings.bank_name || '',
            logo: companySettings.logo || '',
            invoiceNumberFormat: companySettings.invoice_number_format || 'F-{YYYY}-{MM}-{###}',
            defaultDueDays: companySettings.default_due_days || 30,
            defaultTaxRate: companySettings.default_tax_rate || 8.1,
            contactPerson: '',
            contactPosition: ''
          };
        }
      }
    }
  } catch (error) {
    console.error('Error loading company settings from Supabase:', error);
    // Will use default settings if database query fails
  }
  
  console.log('PDF Generator (Base64) - Loaded settings:', settings);
  
  // Page dimensions
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 5; // Reduced to 5mm for maximum content width
  const contentWidth = pageWidth - (margin * 2);
  
  // Calculate content height and center vertically
  const estimatedContentHeight = 200; // Estimate based on typical invoice content
  const availableHeight = pageHeight - (margin * 2);
  const verticalOffset = Math.max(0, (availableHeight - estimatedContentHeight) / 4); // Quarter offset for better visual balance
  let yPosition = margin + verticalOffset;
  
  // === CLEAN MINIMAL INVOICE DESIGN ===
  
  // Sol taraf - Şirket logo ve bilgileri (resimde görüldüğü gibi)
  let leftYPosition = margin + verticalOffset;
  
  // Logo (üstte, solda)
  if (settings.logo) {
    try {
      const logoSize = 20; // Logo boyutu - kare format için aynı boyut (büyültüldü)
      pdf.addImage(settings.logo, 'JPEG', margin, leftYPosition, logoSize, logoSize);
      leftYPosition += logoSize + 5;
    } catch (error) {
      console.error('Error loading logo:', error);
    }
  }
  
  // Şirket adı (büyük font)
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  pdf.text(settings.name || 'Ihr Unternehmen', margin, leftYPosition);
  leftYPosition += 6;
  
  // Şirket adresi
  pdf.setFontSize(9);
  pdf.setTextColor(0, 0, 0);
  if (settings.address) {
    const addressLines = settings.address.split('\n');
    addressLines.forEach((line) => {
      pdf.text(line, margin, leftYPosition);
      leftYPosition += 4;
    });
  }
  
  // Telefon ve email (eğer varsa)
  if (settings.phone) {
    leftYPosition += 2;
    pdf.text(`Tel: ${settings.phone}`, margin, leftYPosition);
    leftYPosition += 4;
  }
  if (settings.email) {
    pdf.text(`E-Mail: ${settings.email}`, margin, leftYPosition);
    leftYPosition += 4;
  }
  
  // Sağ taraf - Fatura bilgileri (resimde görüldüğü gibi)
  const rightColumnX = pageWidth - margin - 80; // Daha geniş alan
  let rightYPosition = margin + verticalOffset;
  
  // Fatura başlığı
  pdf.setFontSize(16);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Rechnung ' + invoice.number, rightColumnX, rightYPosition);
  rightYPosition += 10;
  
  // Fatura detayları
  pdf.setFontSize(9);
  pdf.setTextColor(0, 0, 0);
  
  // Datum satırı
  pdf.text('Datum:', rightColumnX, rightYPosition);
  pdf.text(format(new Date(invoice.date), 'dd.MM.yyyy'), rightColumnX + 35, rightYPosition);
  rightYPosition += 5;
  
  // Zahlbar bis satırı
  pdf.text('Zahlbar bis:', rightColumnX, rightYPosition);
  pdf.text(format(new Date(invoice.dueDate), 'dd.MM.yyyy'), rightColumnX + 35, rightYPosition);
  rightYPosition += 5;
  
  // Ansprechpartner
  pdf.text('Ihr Ansprechpartner:', rightColumnX, rightYPosition);
  const contactName = settings.contactPerson || settings.name || 'Kundenservice';
  pdf.text(contactName, rightColumnX + 35, rightYPosition);
  rightYPosition += 5;
  
  // Kundennummer (şimdilik sabit)
  pdf.text('Kundennummer:', rightColumnX, rightYPosition);
  pdf.text('000034', rightColumnX + 35, rightYPosition);
  rightYPosition += 5;
  
  // Set y position after header sections
  yPosition = Math.max(leftYPosition, rightYPosition) + 20;
  
  // Müşteri adresi - mektup gönderme için gerekli
  yPosition += 15;
  
  // Fetch customer details including address
  let customerAddress = '';
  try {
    if (invoice.customerName) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('vendor_id')
          .eq('user_id', user.id)
          .single();

        if (profile?.vendor_id) {
          // Find customer by name in the vendor's customers to get address
          const { data: customer } = await supabase
            .from('customers')
            .select('name, address')
            .eq('vendor_id', profile.vendor_id)
            .eq('name', invoice.customerName)
            .single();

          if (customer?.address) {
            customerAddress = customer.address;
          }
        }
      }
    }
  } catch (error) {
    console.log('Could not fetch customer address:', error);
  }
  
  // Display customer name and address
  if (invoice.customerName) {
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text(invoice.customerName, margin, yPosition);
    yPosition += 6;
    
    // Display customer address if available
    if (customerAddress) {
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      const addressLines = customerAddress.split('\n');
      addressLines.forEach((line) => {
        if (line.trim()) {
          pdf.text(line.trim(), margin, yPosition);
          yPosition += 4;
        }
      });
    }
    
    yPosition += 10;
  }
  
  // Greeting text
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  
  // Generate personalized greeting based on customer data
  let topGreeting = 'Sehr geehrte Damen und Herren';
  
  // Try to get customer data for personalized greeting using customer_id from invoice
  try {
    if (invoice.customerName) {
      // Get customer details from Supabase if we have customer_id
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('vendor_id')
          .eq('user_id', user.id)
          .single();

        if (profile?.vendor_id) {
          // Find customer by name in the vendor's customers
          const { data: customer } = await supabase
            .from('customers')
            .select('contact_person, contact_gender')
            .eq('vendor_id', profile.vendor_id)
            .eq('name', invoice.customerName)
            .single();

          if (customer?.contact_person && customer.contact_person.trim()) {
            // Use contact person for greeting
            const contactPerson = customer.contact_person.trim();
            
            if (customer.contact_gender === 'male') {
              topGreeting = `Sehr geehrter Herr ${contactPerson}`;
            } else if (customer.contact_gender === 'female') {
              topGreeting = `Sehr geehrte Frau ${contactPerson}`;
            } else {
              // Gender neutral or not specified
              topGreeting = `Sehr geehrte/r ${contactPerson}`;
            }
          }
          // If no contact_person, keep default "Sehr geehrte Damen und Herren"
        }
      }
    }
  } catch (error) {
    console.log('Using default greeting due to:', error);
    // Keep default greeting on any error
  }
  
  pdf.text(topGreeting, margin, yPosition);
  yPosition += 8;
  
  pdf.text('Für die Erledigung der von Ihnen beauftragten Tätigkeiten berechnen wir Ihnen wie folgt:', margin, yPosition);
  yPosition += 15;
  
  // Clean minimal table with proper column spacing
  const tableX = margin;
  const tableWidth = contentWidth;
  const tableHeaderHeight = 8;
  
  // Define column widths to prevent overlap
  const col1Width = 15;  // AUFTRAG column
  const col2Width = 85;  // BEZEICHNUNG column (wider for descriptions)
  const col3Width = 25;  // ANZAHL column
  const col4Width = 25;  // EP column
  const col5Width = 30;  // BETRAG column
  
  // Simple table header with bottom line
  pdf.setDrawColor(150, 150, 150);
  pdf.setLineWidth(0.3);
  pdf.line(tableX, yPosition + tableHeaderHeight, tableX + tableWidth, yPosition + tableHeaderHeight);
  
  // Header text with proper spacing
  pdf.setFontSize(9);
  pdf.setTextColor(80, 80, 80);
  pdf.text('AUFTRAG', tableX + 2, yPosition + 6);
  pdf.text('BEZEICHNUNG', tableX + col1Width + 5, yPosition + 6);  // Added more spacing
  pdf.text('ANZAHL', tableX + col1Width + col2Width + col3Width - 2, yPosition + 6, { align: 'right' });
  pdf.text('EP', tableX + col1Width + col2Width + col3Width + col4Width - 2, yPosition + 6, { align: 'right' });
  pdf.text('BETRAG', tableX + tableWidth - 2, yPosition + 6, { align: 'right' });
  
  yPosition += tableHeaderHeight;
  let tableContentStartY = yPosition;
  
  // Items with proper column boundaries
  invoice.items.forEach((item, index) => {
    if (yPosition > pageHeight - 120) {
      pdf.addPage();
      yPosition = margin + 20;
      tableContentStartY = yPosition;
    }
    
    // Calculate required height for this row based on description length
    const maxDescWidth = col2Width - 4; // Leave some padding
    const descriptionLines = pdf.splitTextToSize(item.description, maxDescWidth);
    const itemHeight = Math.max(8, descriptionLines.length * 4 + 2);
    
    // Alternating row background
    if (index % 2 === 1) {
      pdf.setFillColor(252, 252, 252);
      pdf.rect(tableX, yPosition, tableWidth, itemHeight, 'F');
    }
    
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    
    // Position number (AUFTRAG)
    pdf.text((index + 1).toString(), tableX + 2, yPosition + 6);
    
    // Description (BEZEICHNUNG) - multi-line with proper boundaries
    pdf.text(descriptionLines, tableX + col1Width + 2, yPosition + 6);
    
    // Quantity with unit (ANZAHL) - right aligned
    const quantityText = `${item.quantity} Std.`;
    pdf.text(quantityText, tableX + col1Width + col2Width + col3Width - 2, yPosition + 6, { align: 'right' });
    
    // Unit price (EP) - right aligned
    const formattedUnitPrice = `CHF ${item.unitPrice.toFixed(2)}`;
    pdf.text(formattedUnitPrice, tableX + col1Width + col2Width + col3Width + col4Width - 2, yPosition + 6, { align: 'right' });
    
    // Total (BETRAG) - right aligned
    const formattedTotal = `CHF ${item.total.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    pdf.text(formattedTotal, tableX + tableWidth - 2, yPosition + 6, { align: 'right' });
    
    yPosition += itemHeight;
    
    // Add border line between items
    if (index < invoice.items.length - 1) {
      pdf.setDrawColor(235, 235, 235);
      pdf.setLineWidth(0.2);
      pdf.line(tableX, yPosition, tableX + tableWidth, yPosition);
    }
  });
  
  // Clean totals section - right aligned without background
  yPosition += 15;
  
  const totalsX = tableX + tableWidth - 70;
  let totalsY = yPosition;
  
  // Subtotal line
  pdf.setDrawColor(150, 150, 150);
  pdf.setLineWidth(0.3);
  pdf.line(totalsX, totalsY - 3, tableX + tableWidth, totalsY - 3);
  
  // Subtotal (Zwischensumme ex kl. MwSt.)
  pdf.setFontSize(9);
  pdf.setTextColor(80, 80, 80);
  pdf.text('Zwischensumme ex kl. MwSt.', totalsX, totalsY);
  pdf.setTextColor(0, 0, 0);
  const formattedSubtotal = `${invoice.subtotal.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  pdf.text(formattedSubtotal, tableX + tableWidth - 4, totalsY, { align: 'right' });
  totalsY += 5;
  
  // Tax - Calculate unique tax rates and amounts
  const taxGroups = invoice.items.reduce((groups, item) => {
    const rate = item.taxRate;
    if (!groups[rate]) {
      groups[rate] = { rate, taxAmount: 0 };
    }
    groups[rate].taxAmount += (item.total * rate) / 100;
    return groups;
  }, {} as Record<number, { rate: number; taxAmount: number }>);
  
  // Display each tax rate separately
  Object.values(taxGroups).forEach((taxGroup) => {
    pdf.setTextColor(80, 80, 80);
    pdf.text(`MwSt. ${taxGroup.rate.toFixed(1)} %`, totalsX, totalsY);
    pdf.setTextColor(0, 0, 0);
    const formattedTax = `${taxGroup.taxAmount.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    pdf.text(formattedTax, tableX + tableWidth - 4, totalsY, { align: 'right' });
    totalsY += 5;
  });
  
  // Total line
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.line(totalsX, totalsY, tableX + tableWidth, totalsY);
  totalsY += 5;
  
  // Total amount (Rechnungstotal inkl. MwSt.)
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Rechnungstotal inkl. MwSt.', totalsX, totalsY);
  const formattedTotal = `CHF ${invoice.total.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  pdf.text(formattedTotal, tableX + tableWidth - 4, totalsY, { align: 'right' });
  
  yPosition = totalsY + 15;
  
  // Payment terms and closing - cleaner format
  yPosition += 10;
  
  pdf.setFontSize(9);
  pdf.setTextColor(0, 0, 0);
  
  // Calculate due days for payment terms
  const invoiceDate = new Date(invoice.date);
  const dueDate = new Date(invoice.dueDate);
  const diffTime = Math.abs(dueDate.getTime() - invoiceDate.getTime());
  const dueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Zahlungskonditionen section
  pdf.text(`Zahlungskonditionen: ${dueDays} Tage netto`, margin, yPosition);
  yPosition += 5;
  pdf.text('Besten Dank für Ihren Auftrag.', margin, yPosition);
  yPosition += 15;
  
  pdf.text('Mit freundlichen Grüssen', margin, yPosition);
  yPosition += 8;
  
  // Use contact person if available, otherwise fall back to company name
  if (settings.contactPerson && settings.contactPerson.trim()) {
    pdf.text(settings.contactPerson, margin, yPosition);
    yPosition += 4;
    if (settings.contactPosition && settings.contactPosition.trim()) {
      pdf.text(settings.contactPosition, margin, yPosition);
    }
  } else {
    pdf.text(settings.name || 'Ihr Unternehmen', margin, yPosition);
  }
  
  // Notes
  if (invoice.notes) {
    yPosition += 12;
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Bemerkungen:', margin, yPosition);
    yPosition += 5;
    
    const noteLines = pdf.splitTextToSize(invoice.notes, contentWidth);
    pdf.setTextColor(80, 80, 80);
    pdf.text(noteLines, margin, yPosition);
  }
  
  // === MODERN SWISS QR PAYMENT SECTION ===
  // Check if we need a new page for QR section
  if (yPosition > pageHeight - 120) {
    pdf.addPage();
    yPosition = margin;
  } else {
    yPosition += 20;
  }
  
  // QR Section Header with icon
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  
  // Draw QR icon (Swiss style)
  pdf.setFillColor(0, 0, 0);
  pdf.rect(margin, yPosition - 3, 6, 6, 'F');
  pdf.setFillColor(255, 255, 255);
  pdf.rect(margin + 1.5, yPosition - 1.5, 3, 3, 'F');
  
  pdf.text('Zahlteil (Swiss QR)', margin + 10, yPosition + 2);
  yPosition += 12;
  
  try {
    console.log('=== PDF QR Generation Debug (Base64) ===');
    console.log('Invoice for QR:', {
      number: invoice.number,
      total: invoice.total,
      customerName: invoice.customerName,
      dueDate: invoice.dueDate
    });
    
    const qrCodeDataURL = await generateSwissQRCodeWithCross(invoice);
    console.log('Swiss QR Code with embedded cross generated successfully for PDF, length:', qrCodeDataURL.length);
    console.log('=== End PDF QR Debug (Base64) ===');
    
    // Swiss QR Bill with full page width
    const qrBillHeight = 105;
    const qrBillPadding = 4;
    const qrBillWidth = contentWidth; // Use full content width
    
    // QR Bill Background with subtle border
    pdf.setFillColor(252, 252, 252);
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.2);
    pdf.roundedRect(margin, yPosition, qrBillWidth, qrBillHeight, 3, 3, 'FD');
    
    // QR Payment Title
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Empfangsschein', margin + qrBillPadding, yPosition + 10);
    
    // QR Section Layout
    const qrSize = 46;
    const qrCodeY = yPosition + 15;
    
    // Receipt section (left 1/3) - Empfangsschein
    const receiptX = margin + qrBillPadding;
    const receiptWidth = qrBillWidth * 0.33;
    
    // Payment section (right 2/3) - Zahlteil
    const paymentX = receiptX + receiptWidth + 10;
    const paymentWidth = qrBillWidth - receiptWidth - qrBillPadding * 2 - 10;
    
    // Receipt section content (minimal as per Swiss standard)
    const iban = settings.qrIban || 'CH44 3199 9123 0008 8901 2';
    
    let receiptY = qrCodeY;
    
    // Empfangsschein details
    pdf.setFontSize(6);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Konto / Zahlbar an', receiptX, receiptY);
    receiptY += 5;
    
    pdf.setFontSize(8);
    pdf.text(iban, receiptX, receiptY);
    receiptY += 4;
    const receiptCompanyLines = pdf.splitTextToSize(settings.name || 'Ihr Unternehmen', receiptWidth - 10);
    pdf.text(receiptCompanyLines, receiptX, receiptY);
    receiptY += receiptCompanyLines.length * 4;
    
    if (settings.address) {
      const addressLines = settings.address.split('\n').slice(0, 2);
      addressLines.forEach((line) => {
        const splitLines = pdf.splitTextToSize(line, receiptWidth - 10);
        pdf.text(splitLines, receiptX, receiptY);
        receiptY += splitLines.length * 4;
      });
    }
    
    receiptY += 4;
    
    // Währung / Betrag in receipt
    pdf.setFontSize(6);
    pdf.text('Währung / Betrag', receiptX, receiptY);
    receiptY += 5;
    pdf.setFontSize(11);
    pdf.text(`CHF ${invoice.total.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, receiptX, receiptY);
    
    // Main payment section
    // Zahlteil title
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Zahlteil', paymentX, yPosition + 10);
    
    // QR Code positioning - left side of payment section
    const qrAreaWidth = qrSize + 10;
    const detailsAreaWidth = paymentWidth - qrAreaWidth;
    
    // Place QR code
    pdf.addImage(qrCodeDataURL, 'PNG', paymentX, qrCodeY, qrSize, qrSize);
    
    // Payment details (right of QR code)
    const detailsX = paymentX + qrAreaWidth + 6;
    const maxDetailsWidth = detailsAreaWidth - 8;
    let detailsY = qrCodeY;
    
    // Währung / Betrag
    pdf.setFontSize(6);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Währung / Betrag', detailsX, detailsY);
    detailsY += 5;
    pdf.setFontSize(11);
    pdf.text(`CHF ${invoice.total.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, detailsX, detailsY);
    detailsY += 10;
    
    // Konto / Zahlbar an
    pdf.setFontSize(6);
    pdf.text('Konto / Zahlbar an', detailsX, detailsY);
    detailsY += 5;
    pdf.setFontSize(8);
    pdf.text(iban, detailsX, detailsY);
    detailsY += 4;
    
    const detailsCompanyLines = pdf.splitTextToSize(settings.name || 'Ihr Unternehmen', maxDetailsWidth);
    pdf.text(detailsCompanyLines, detailsX, detailsY);
    detailsY += detailsCompanyLines.length * 4;
    
    if (settings.address) {
      const addressLines = settings.address.split('\n').slice(0, 2);
      addressLines.forEach((line) => {
        const splitLines = pdf.splitTextToSize(line, maxDetailsWidth);
        pdf.text(splitLines, detailsX, detailsY);
        detailsY += splitLines.length * 4;
      });
    }
    detailsY += 4;
    
    // Zahlbar durch
    if (invoice.customerName) {
      pdf.setFontSize(6);
      pdf.text('Zahlbar durch', detailsX, detailsY);
      detailsY += 5;
      pdf.setFontSize(8);
      
      const detailsCustomerLines = pdf.splitTextToSize(invoice.customerName, maxDetailsWidth);
      pdf.text(detailsCustomerLines, detailsX, detailsY);
      detailsY += detailsCustomerLines.length * 4;
    }
    
    // Additional information (below QR code)
    const additionalInfoY = qrCodeY + qrSize + 6;
    pdf.setFontSize(6);
    pdf.text('Zusätzliche Informationen', paymentX, additionalInfoY);
    pdf.setFontSize(8);
    pdf.text(`Rechnung ${invoice.number}`, paymentX, additionalInfoY + 4);
    pdf.text(`Fälligkeitsdatum: ${format(new Date(invoice.dueDate), 'dd.MM.yyyy')}`, paymentX, additionalInfoY + 8);
    
  } catch (error) {
    console.error('QR Code generation failed (base64):', error);
    pdf.setFontSize(10);
    pdf.setTextColor(255, 0, 0);
    pdf.text('QR-Code konnte nicht generiert werden', margin, yPosition + 30);
  }
  
  // Footer notice - safe positioning
  const footerY = Math.max(yPosition + 75, pageHeight - 30);
  pdf.setFontSize(7);
  pdf.setTextColor(120, 120, 120);
  pdf.text('Dies ist eine automatisch generierte Rechnung.', margin, footerY);
  
  // Convert to base64
  return new Promise<string>((resolve, reject) => {
    try {
      const pdfBlob = pdf.output('blob');
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const result = reader.result as string;
          if (!result || !result.includes(',')) {
            throw new Error('Invalid PDF data URL format');
          }
          const base64String = result.split(',')[1]; // Remove data:application/pdf;base64,
          if (!base64String || base64String.length === 0) {
            throw new Error('Empty base64 string after conversion');
          }
          console.log('✅ PDF (Base64) generated successfully, size:', base64String.length);
          resolve(base64String);
        } catch (error) {
          console.error('❌ Error processing PDF data URL:', error);
          reject(error);
        }
      };
      reader.onerror = (error) => {
        console.error('❌ FileReader error:', error);
        reject(new Error('Failed to read PDF blob'));
      };
      reader.readAsDataURL(pdfBlob);
    } catch (error) {
      console.error('💥 PDF Base64 generation failed:', error);
      reject(new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}
