import jsPDF from 'jspdf';
import { Offer, OfferItem } from '@/types/offer';
import { Customer } from '@/types';

interface OfferCustomer {
  id: string;
  name: string;
  email?: string;
  address?: string;
}

interface GenerateOfferPDFParams {
  offer: Offer;
  customer: OfferCustomer;
  items: OfferItem[];
  companyInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
}

export const generateOfferPDF = ({ offer, customer, items, companyInfo }: GenerateOfferPDFParams) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  let yPosition = 30;
  
  // Company information (top left)
  if (companyInfo) {
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(companyInfo.name, 20, yPosition);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    yPosition += 12;
    
    // Handle multi-line address properly
    if (companyInfo.address) {
      const addressLines = companyInfo.address.split('\n').filter(line => line.trim());
      addressLines.forEach(line => {
        doc.text(line.trim(), 20, yPosition);
        yPosition += 6;
      });
      yPosition += 2; // Extra spacing after address
    }
    
    if (companyInfo.phone) {
      doc.text(`Tel: ${companyInfo.phone}`, 20, yPosition);
      yPosition += 6;
    }
    
    if (companyInfo.email) {
      doc.text(`Email: ${companyInfo.email}`, 20, yPosition);
    }
  }
  
  // Title
  yPosition = 30;
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('ANGEBOT', pageWidth - 20, yPosition, { align: 'right' });
  
  // Offer number and date
  yPosition += 15;
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text(`Angebot Nr.: ${offer.offer_no}`, pageWidth - 20, yPosition, { align: 'right' });
  yPosition += 8;
  doc.text(`Datum: ${new Date(offer.issue_date).toLocaleDateString('de-DE')}`, pageWidth - 20, yPosition, { align: 'right' });
  
  if (offer.valid_until) {
    yPosition += 8;
    doc.text(`Gültig bis: ${new Date(offer.valid_until).toLocaleDateString('de-DE')}`, pageWidth - 20, yPosition, { align: 'right' });
  }
  
  // Customer information
  yPosition += 40;
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Kunde:', 20, yPosition);
  
  yPosition += 8;
  doc.setFont(undefined, 'normal');
  doc.text(customer.name, 20, yPosition);
  
  if (customer.address) {
    yPosition += 6;
    const addressLines = customer.address.split('\n');
    addressLines.forEach(line => {
      doc.text(line, 20, yPosition);
      yPosition += 6;
    });
  }
  
  // Items table
  yPosition += 20;
  const tableTop = yPosition;
  
  // Table headers
  doc.setFont(undefined, 'bold');
  doc.text('Beschreibung', 20, tableTop);
  doc.text('Menge', pageWidth - 120, tableTop, { align: 'right' });
  doc.text('Einzelpreis', pageWidth - 80, tableTop, { align: 'right' });
  doc.text('MwSt.', pageWidth - 50, tableTop, { align: 'right' });
  doc.text('Betrag', pageWidth - 20, tableTop, { align: 'right' });
  
  // Table line
  yPosition = tableTop + 5;
  doc.line(20, yPosition, pageWidth - 20, yPosition);
  
  // Table content
  yPosition += 10;
  doc.setFont(undefined, 'normal');
  
  items.forEach((item) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = 30;
    }
    
    const subtotal = Number(item.qty) * Number(item.unit_price);
    
    doc.text(item.description, 20, yPosition);
    doc.text(item.qty.toString(), pageWidth - 120, yPosition, { align: 'right' });
    doc.text(`CHF ${Number(item.unit_price).toFixed(2)}`, pageWidth - 80, yPosition, { align: 'right' });
    doc.text(`${Number(item.tax_rate).toFixed(1)}%`, pageWidth - 50, yPosition, { align: 'right' });
    doc.text(`CHF ${item.line_total.toFixed(2)}`, pageWidth - 20, yPosition, { align: 'right' });
    
    yPosition += 8;
  });
  
  // Totals
  yPosition += 10;
  doc.line(pageWidth - 120, yPosition, pageWidth - 20, yPosition);
  
  yPosition += 10;
  doc.text('Zwischensumme:', pageWidth - 80, yPosition, { align: 'right' });
  doc.text(`CHF ${offer.subtotal.toFixed(2)}`, pageWidth - 20, yPosition, { align: 'right' });
  
  yPosition += 8;
  doc.text('MwSt.:', pageWidth - 80, yPosition, { align: 'right' });
  doc.text(`CHF ${offer.tax_total.toFixed(2)}`, pageWidth - 20, yPosition, { align: 'right' });
  
  yPosition += 8;
  doc.setFont(undefined, 'bold');
  doc.text('Gesamtsumme:', pageWidth - 80, yPosition, { align: 'right' });
  doc.text(`CHF ${offer.total.toFixed(2)}`, pageWidth - 20, yPosition, { align: 'right' });
  
  // Notes
  if (offer.notes) {
    yPosition += 20;
    doc.setFont(undefined, 'bold');
    doc.text('Anmerkungen:', 20, yPosition);
    yPosition += 8;
    doc.setFont(undefined, 'normal');
    const noteLines = doc.splitTextToSize(offer.notes, pageWidth - 40);
    doc.text(noteLines, 20, yPosition);
  }
  
  // Footer
  const footerY = pageHeight - 30;
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text('Dieses Angebot ist unverbindlich und wurde maschinell erstellt.', pageWidth / 2, footerY, { align: 'center' });
  
  // Save the PDF
  doc.save(`Angebot_${offer.offer_no}.pdf`);
};