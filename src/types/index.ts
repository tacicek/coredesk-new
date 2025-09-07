export interface Customer {
  id: string;
  name: string;
  contactPerson?: string; // Kontaktperson (optional)
  contactGender?: 'male' | 'female' | 'neutral'; // Gender for proper greeting
  email: string;
  phone?: string;
  address: string;
  taxNumber?: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total: number;
}

export interface Invoice {
  id: string;
  number: string; // Added for display purposes
  invoiceNumber: string;
  customerName: string;
  customerEmail?: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isDuplicate?: boolean; // Track if this is a duplicate invoice
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  taxRate: number;
  category?: string;
  imageUrl?: string;
  isActive?: boolean;
  vendorId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductCategory {
  id: string;
  vendorId: string;
  name: string;
  description?: string;
  sortOrder?: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  taxNumber?: string;
  qrIban?: string; // QR-IBAN for Swiss QR bills
  bankName?: string; // Bank name for invoices
  logo?: string;
  invoiceNumberFormat: string;
  defaultDueDays: number;
  defaultTaxRate: number;
  // E-Mail Einstellungen
  senderEmail?: string;
  senderName?: string;
  emailSubjectTemplate?: string;
  emailBodyTemplate?: string;
  // PDF Closing Contact Information
  contactPerson?: string; // Optional contact person for PDF closing
  contactPosition?: string; // Optional position for PDF closing
  // Note: API keys are now stored separately for security
}

export interface VendorSecret {
  id: string;
  vendor_id: string;
  user_id: string;
  secret_type: string;
  encrypted_value: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export type InvoiceStatus = Invoice['status'];