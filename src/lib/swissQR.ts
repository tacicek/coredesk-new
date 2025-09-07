import QRCode from 'qrcode';
import { Invoice } from '@/types';
import { supabase } from '@/integrations/supabase/client';

// Swiss QR Bill data structure according to official specification
export interface SwissQRData {
  // Header
  qrType: string;           // 1. QR Type (SPC)
  version: string;          // 2. Version (0200)
  codingType: string;       // 3. Coding Type (1)
  
  // Creditor Information
  account: string;          // 4. Account (IBAN)
  creditorAddressType: string;     // 5. Creditor Address Type (S or K)
  creditorName: string;            // 6. Creditor Name
  creditorStreetOrAddressLine1: string;  // 7. Creditor Street or Address Line 1
  creditorBuildingNumberOrAddressLine2: string; // 8. Creditor Building Number or Address Line 2
  creditorPostalCode: string;      // 9. Creditor Postal Code
  creditorTown: string;            // 10. Creditor Town
  creditorCountry: string;         // 11. Creditor Country
  
  // Ultimate Creditor Information (usually empty)
  ultimateCreditorAddressType: string;     // 12. Ultimate Creditor Address Type
  ultimateCreditorName: string;            // 13. Ultimate Creditor Name
  ultimateCreditorStreetOrAddressLine1: string;  // 14. Ultimate Creditor Street or Address Line 1
  ultimateCreditorBuildingNumberOrAddressLine2: string; // 15. Ultimate Creditor Building Number or Address Line 2
  ultimateCreditorPostalCode: string;      // 16. Ultimate Creditor Postal Code
  ultimateCreditorTown: string;            // 17. Ultimate Creditor Town
  ultimateCreditorCountry: string;         // 18. Ultimate Creditor Country
  
  // Payment Information
  amount: string;           // 19. Amount
  currency: string;         // 20. Currency (CHF or EUR)
  
  // Ultimate Debtor Information
  ultimateDebtorAddressType: string;       // 21. Ultimate Debtor Address Type
  ultimateDebtorName: string;              // 22. Ultimate Debtor Name
  ultimateDebtorStreetOrAddressLine1: string;    // 23. Ultimate Debtor Street or Address Line 1
  ultimateDebtorBuildingNumberOrAddressLine2: string; // 24. Ultimate Debtor Building Number or Address Line 2
  ultimateDebtorPostalCode: string;        // 25. Ultimate Debtor Postal Code
  ultimateDebtorTown: string;              // 26. Ultimate Debtor Town
  ultimateDebtorCountry: string;           // 27. Ultimate Debtor Country
  
  // Payment Reference
  paymentReferenceType: string;    // 28. Payment Reference Type (QRR, SCOR, NON)
  paymentReference: string;        // 29. Payment Reference
  
  // Additional Information
  unstructuredMessage: string;     // 30. Unstructured Message
  billInformation: string;         // 31. Bill Information
  
  // Alternative Schemes (usually empty)
  alternativeScheme1: string;      // 32. Alternative Scheme 1
  alternativeScheme2: string;      // 33. Alternative Scheme 2
}

/**
 * Clean and validate Swiss IBAN according to official Swiss payment standards
 * @param iban Raw IBAN string from user input
 * @returns Clean, validated IBAN or throws error if invalid
 */
export function cleanAndValidateSwissIBAN(iban: string): string {
  if (!iban) {
    throw new Error('IBAN is required');
  }
  
  // Step 1: Clean the IBAN - remove spaces, special characters, convert to uppercase
  let cleanIban = iban.replace(/\s/g, '').toUpperCase();
  
  // Remove any non-alphanumeric characters
  cleanIban = cleanIban.replace(/[^A-Z0-9]/g, '');
  
  // Remove trailing invalid characters (like 'B' that users sometimes add)
  // Swiss IBAN must be exactly 21 characters starting with CH
  if (cleanIban.startsWith('CH') && cleanIban.length > 21) {
    console.warn(`IBAN has extra characters, truncating from ${cleanIban.length} to 21 chars:`, cleanIban);
    cleanIban = cleanIban.substring(0, 21);
  }
  
  // Step 2: Validate format
  if (cleanIban.length !== 21) {
    throw new Error(`Invalid Swiss IBAN length: ${cleanIban.length}. Must be exactly 21 characters.`);
  }
  
  if (!cleanIban.startsWith('CH')) {
    throw new Error(`Invalid Swiss IBAN format: must start with 'CH', got: ${cleanIban.substring(0, 2)}`);
  }
  
  // Swiss IBAN format: CH + 2 check digits + 5 bank code + 12 account number
  const ibanRegex = /^CH\d{2}\d{5}[A-Z0-9]{12}$/;
  if (!ibanRegex.test(cleanIban)) {
    throw new Error(`Invalid Swiss IBAN format: ${cleanIban}. Expected format: CH + 2 digits + 5 digits + 12 alphanumeric.`);
  }
  
  // Step 3: Validate checksum using mod-97 algorithm
  try {
    const reorderedIban = cleanIban.slice(4) + cleanIban.slice(0, 4);
    const numericIban = reorderedIban.replace(/[A-Z]/g, (char) => 
      (char.charCodeAt(0) - 55).toString()
    );
    
    const remainder = BigInt(numericIban) % 97n;
    if (remainder !== 1n) {
      throw new Error(`Invalid IBAN checksum for: ${cleanIban}`);
    }
  } catch (error) {
    throw new Error(`IBAN checksum validation failed: ${error}`);
  }
  
  console.log(`✅ Swiss IBAN validated successfully: ${cleanIban}`);
  return cleanIban;
}

// Check if IBAN is QR-IBAN (institution ID 30000-31999)
function isQRIBAN(iban: string): boolean {
  if (!iban || iban.length !== 21) return false;
  
  const institutionId = iban.substring(4, 9);
  const id = parseInt(institutionId, 10);
  return id >= 30000 && id <= 31999;
}

// Calculate Mod-10 recursive checksum for QRR references
function calculateMod10RecursiveChecksum(numStr: string): number {
  const table = [
    [0,9,4,6,8,2,7,1,3,5],
    [9,4,6,8,2,7,1,3,5,0],
    [4,6,8,2,7,1,3,5,0,9],
    [6,8,2,7,1,3,5,0,9,4],
    [8,2,7,1,3,5,0,9,4,6],
    [2,7,1,3,5,0,9,4,6,8],
    [7,1,3,5,0,9,4,6,8,2],
    [1,3,5,0,9,4,6,8,2,7],
    [3,5,0,9,4,6,8,2,7,1],
    [5,0,9,4,6,8,2,7,1,3],
  ];
  
  let state = 0;
  for (const digit of numStr) {
    const d = parseInt(digit, 10);
    if (isNaN(d)) continue;
    state = table[state][d];
  }
  return (10 - state) % 10;
}

// Generate QRR reference (27 digits) for QR-IBAN
function generateQRRReference(invoiceNumber: string): string {
  // Extract only digits from invoice number
  const invoiceDigits = invoiceNumber.replace(/\D/g, '');
  
  // Create a base reference with invoice number and current date
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  
  // Combine: invoice digits + year + month + day, then pad to 26 digits
  const baseRef = (invoiceDigits + year + month + day).padStart(26, '0').slice(0, 26);
  
  // Calculate check digit
  const checkDigit = calculateMod10RecursiveChecksum(baseRef);
  
  return baseRef + checkDigit.toString();
}

// Calculate Mod-97 checksum for SCOR references
function calculateMod97(numericStr: string): number {
  let remainder = 0;
  for (const digit of numericStr) {
    remainder = (remainder * 10 + parseInt(digit, 10)) % 97;
  }
  return remainder;
}

// Convert alphanumeric to numeric for mod97 calculation
function toNumeric(s: string): string {
  let result = '';
  for (const char of s) {
    if (char >= '0' && char <= '9') {
      result += char;
    } else if (char >= 'A' && char <= 'Z') {
      result += (char.charCodeAt(0) - 55).toString(); // A=10, B=11, ..., Z=35
    }
  }
  return result;
}

// Generate SCOR reference for regular IBAN
function generateSCORReference(invoiceNumber: string): string {
  // Clean invoice number (only alphanumeric)
  const cleanInvoice = invoiceNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 21);
  
  if (cleanInvoice.length === 0) {
    throw new Error('Invalid invoice number for SCOR reference');
  }
  
  // Calculate checksum: cleanInvoice + "RF00" -> mod97 -> 98-remainder
  const numericString = toNumeric(cleanInvoice + 'RF00');
  const remainder = calculateMod97(numericString);
  const checksum = (98 - remainder).toString().padStart(2, '0');
  
  return `RF${checksum}${cleanInvoice}`;
}

/**
 * Truncate string to maximum length according to Swiss QR standard field limits
 * Ensures Latin-1 encoding compatibility and proper length validation
 * @param str Input string
 * @param maxLength Maximum allowed length
 * @param required Whether field is required (throws error if empty)
 * @param fieldName Field name for better error messages
 * @returns Truncated string or throws error if required field is empty
 */
function truncateAndValidateField(str: string, maxLength: number, required: boolean = false, fieldName: string = 'field'): string {
  const input = str || '';
  
  // Ensure Latin-1 compatibility by removing non-Latin-1 characters
  const latin1Compatible = input.replace(/[^\x00-\xFF]/g, '?');
  
  const truncated = latin1Compatible.substring(0, maxLength);
  
  if (required && truncated.length === 0) {
    throw new Error(`Required field '${fieldName}' cannot be empty (max length: ${maxLength})`);
  }
  
  if (input.length > maxLength) {
    console.warn(`Field '${fieldName}' truncated from ${input.length} to ${maxLength} characters`);
  }
  
  return truncated;
}

// Truncate string to maximum length and ensure it's not empty when required
function truncateString(str: string, maxLength: number, required: boolean = false): string {
  const truncated = (str || '').substring(0, maxLength);
  if (required && truncated.length === 0) {
    throw new Error(`Required field cannot be empty (max length: ${maxLength})`);
  }
  return truncated;
}

/**
 * Parse Swiss address into structured format according to QR standard
 * @param address Raw address string
 * @returns Structured address components
 */
function parseSwissAddress(address: string): { street: string; number: string; postalCode: string; city: string } {
  if (!address) {
    return { street: '', number: '', postalCode: '', city: '' };
  }
  
  const lines = address.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let street = '';
  let number = '';
  let postalCode = '';
  let city = '';
  
  if (lines.length >= 1) {
    // Parse first line for street and house number: "Musterstrasse 123"
    const streetMatch = lines[0].match(/^(.+?)\s+(\d+[a-zA-Z]*)\s*$/);
    if (streetMatch) {
      street = streetMatch[1].trim();
      number = streetMatch[2].trim();
    } else {
      street = lines[0];
    }
  }
  
  if (lines.length >= 2) {
    // Parse last line for postal code and city: "8000 Zürich"
    const lastLine = lines[lines.length - 1];
    const postalMatch = lastLine.match(/^(\d{4})\s+(.+)$/);
    if (postalMatch) {
      postalCode = postalMatch[1];
      city = postalMatch[2];
    } else {
      city = lastLine;
    }
  }
  
  return { street, number, postalCode, city };
}

// Get company settings from Supabase
async function getCompanySettings() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching company settings:', error);
      throw new Error('Failed to load company settings');
    }

    if (!data) {
      throw new Error('No company settings found');
    }

    return {
      name: data.name || '',
      address: data.address || '',
      phone: data.phone || '',
      email: data.email || '',
      taxNumber: data.tax_number || '',
      qrIban: data.qr_iban || '',
      bankName: data.bank_name || '',
      logo: data.logo || '',
      invoiceNumberFormat: data.invoice_number_format || 'F-{YYYY}-{MM}-{###}',
      defaultDueDays: data.default_due_days || 30,
      defaultTaxRate: data.default_tax_rate || 8.1,
      senderEmail: data.sender_email || '',
      senderName: data.sender_name || '',
      emailSubjectTemplate: data.email_subject_template || '',
      emailBodyTemplate: data.email_body_template || ''
    };
  } catch (error) {
    console.error('Error getting company settings:', error);
    throw error;
  }
}

/**
 * Generate Swiss QR data according to official Swiss Payment Standards
 * Ensures full compliance with banking app requirements
 * @param invoice Invoice data
 * @returns Complete SwissQRData structure
 */
export async function generateSwissQRData(invoice: Invoice): Promise<SwissQRData> {
  console.log(`🔵 Generating compliant Swiss QR data for invoice: ${invoice.number}`);
  
  const settings = await getCompanySettings();
  
  // Validate required company settings
  if (!settings.name) {
    throw new Error('Company name is required in settings for QR generation');
  }
  
  if (!settings.address) {
    throw new Error('Company address is required in settings for QR generation');
  }
  
  if (!settings.qrIban) {
    throw new Error('QR-IBAN or IBAN is required in settings for QR generation');
  }
  
  // Clean and validate IBAN - this fixes the "B" suffix issue
  const cleanIban = cleanAndValidateSwissIBAN(settings.qrIban);
  
  // Parse company address into structured format
  const companyAddress = parseSwissAddress(settings.address);
  
  // Get customer address if available
  let customerAddress = { street: '', number: '', postalCode: '', city: '' };
  if (invoice.customerName) {
    try {
      const { data: customers } = await supabase
        .from('customers')
        .select('address')
        .eq('name', invoice.customerName)
        .limit(1);
      
      if (customers && customers.length > 0 && customers[0].address) {
        customerAddress = parseSwissAddress(customers[0].address);
        console.log(`✅ Customer address found: ${customers[0].address}`);
      }
    } catch (error) {
      console.warn('Could not fetch customer address:', error);
    }
  }
  
  // Determine payment reference type and generate reference based on IBAN type
  let paymentReferenceType: 'QRR' | 'SCOR' | 'NON' = 'NON';
  let paymentReference = '';
  
  if (isQRIBAN(cleanIban)) {
    // QR-IBAN MUST use QRR reference - this fixes banking app compatibility
    paymentReferenceType = 'QRR';
    paymentReference = generateQRRReference(invoice.number);
  } else {
    // Regular IBAN can use SCOR or NON
    try {
      paymentReference = generateSCORReference(invoice.number);
      paymentReferenceType = 'SCOR';
    } catch (error) {
      console.warn('SCOR generation failed, using NON:', error);
      paymentReferenceType = 'NON';
      paymentReference = '';
    }
  }
  
  // Format amount according to Swiss standard (empty if 0, otherwise 2 decimal places)
  const formattedAmount = invoice.total > 0 ? invoice.total.toFixed(2) : '';
  
  // Build compliant QR data structure
  const qrData: SwissQRData = {
    // Header - Fixed values per Swiss standard
    qrType: 'SPC',
    version: '0200',  // Version 0200 for maximum compatibility
    codingType: '1',   // Latin-1 character set per SPS
    
    // Creditor Information (Company) - Required
    account: cleanIban,
    creditorAddressType: 'S', // Structured address type
    creditorName: truncateAndValidateField(settings.name, 70, true, 'creditorName'),
    creditorStreetOrAddressLine1: truncateAndValidateField(companyAddress.street, 70, false, 'creditorStreet'),
    creditorBuildingNumberOrAddressLine2: truncateAndValidateField(companyAddress.number, 16, false, 'creditorNumber'),
    creditorPostalCode: truncateAndValidateField(companyAddress.postalCode, 16, false, 'creditorPostalCode'),
    creditorTown: truncateAndValidateField(companyAddress.city, 35, false, 'creditorCity'),
    creditorCountry: 'CH',
    
    // Ultimate Creditor Information (empty for standard invoices)
    ultimateCreditorAddressType: '',
    ultimateCreditorName: '',
    ultimateCreditorStreetOrAddressLine1: '',
    ultimateCreditorBuildingNumberOrAddressLine2: '',
    ultimateCreditorPostalCode: '',
    ultimateCreditorTown: '',
    ultimateCreditorCountry: '',
    
    // Payment Information
    amount: formattedAmount,
    currency: 'CHF',
    
    // Ultimate Debtor Information (Customer)
    ultimateDebtorAddressType: invoice.customerName && (customerAddress.postalCode || customerAddress.city) ? 'S' : '',
    ultimateDebtorName: truncateAndValidateField(invoice.customerName || '', 70, false, 'debtorName'),
    ultimateDebtorStreetOrAddressLine1: truncateAndValidateField(customerAddress.street, 70, false, 'debtorStreet'),
    ultimateDebtorBuildingNumberOrAddressLine2: truncateAndValidateField(customerAddress.number, 16, false, 'debtorNumber'),
    ultimateDebtorPostalCode: truncateAndValidateField(customerAddress.postalCode, 16, false, 'debtorPostalCode'),
    ultimateDebtorTown: truncateAndValidateField(customerAddress.city, 35, false, 'debtorCity'),
    ultimateDebtorCountry: invoice.customerName ? 'CH' : '',
    
    // Payment Reference - Critical for banking compatibility
    paymentReferenceType: paymentReferenceType,
    paymentReference: paymentReference,
    
    // Additional Information
    unstructuredMessage: truncateAndValidateField(`Rechnung ${invoice.number}`, 140, false, 'message'),
    billInformation: '',
    
    // Alternative Schemes (empty for standard use)
    alternativeScheme1: '',
    alternativeScheme2: ''
  };
  
  console.log(`✅ Swiss QR data generated successfully:`);
  console.log(`- IBAN: ${qrData.account} (${isQRIBAN(cleanIban) ? 'QR-IBAN' : 'Regular'})`);
  console.log(`- Reference Type: ${qrData.paymentReferenceType}`);
  console.log(`- Reference: ${qrData.paymentReference}`);
  console.log(`- Amount: ${qrData.amount} ${qrData.currency}`);
  
  return qrData;
}

/**
 * Format Swiss QR string according to official specification
 * Ensures proper CRLF line endings and field validation for banking compatibility
 * @param data Complete Swiss QR data structure
 * @returns Formatted QR string with CRLF line endings
 */
export function formatSwissQRString(data: SwissQRData): string {
  // Validate critical fields before formatting
  if (data.qrType !== 'SPC') {
    throw new Error(`Invalid QR Type: ${data.qrType}. Must be 'SPC'.`);
  }
  
  if (data.version !== '0200' && data.version !== '0210') {
    throw new Error(`Invalid version: ${data.version}. Must be '0200' or '0210'.`);
  }
  
  if (data.codingType !== '1') {
    throw new Error(`Invalid coding type: ${data.codingType}. Must be '1'.`);
  }
  
  if (data.currency !== 'CHF' && data.currency !== 'EUR') {
    throw new Error(`Invalid currency: ${data.currency}. Must be 'CHF' or 'EUR'.`);
  }
  
  // All 33 fields in exact order as per Swiss QR specification
  const fields = [
    data.qrType,                                    // 1. QR Type
    data.version,                                   // 2. Version
    data.codingType,                               // 3. Coding Type
    data.account,                                  // 4. Account (IBAN)
    data.creditorAddressType,                      // 5. Creditor Address Type
    data.creditorName,                             // 6. Creditor Name
    data.creditorStreetOrAddressLine1,             // 7. Creditor Street/Address Line 1
    data.creditorBuildingNumberOrAddressLine2,     // 8. Creditor Building Number/Address Line 2
    data.creditorPostalCode,                       // 9. Creditor Postal Code
    data.creditorTown,                             // 10. Creditor Town
    data.creditorCountry,                          // 11. Creditor Country
    data.ultimateCreditorAddressType,              // 12. Ultimate Creditor Address Type
    data.ultimateCreditorName,                     // 13. Ultimate Creditor Name
    data.ultimateCreditorStreetOrAddressLine1,     // 14. Ultimate Creditor Street/Address Line 1
    data.ultimateCreditorBuildingNumberOrAddressLine2, // 15. Ultimate Creditor Building Number/Address Line 2
    data.ultimateCreditorPostalCode,               // 16. Ultimate Creditor Postal Code
    data.ultimateCreditorTown,                     // 17. Ultimate Creditor Town
    data.ultimateCreditorCountry,                  // 18. Ultimate Creditor Country
    data.amount,                                   // 19. Amount
    data.currency,                                 // 20. Currency
    data.ultimateDebtorAddressType,                // 21. Ultimate Debtor Address Type
    data.ultimateDebtorName,                       // 22. Ultimate Debtor Name
    data.ultimateDebtorStreetOrAddressLine1,       // 23. Ultimate Debtor Street/Address Line 1
    data.ultimateDebtorBuildingNumberOrAddressLine2, // 24. Ultimate Debtor Building Number/Address Line 2
    data.ultimateDebtorPostalCode,                 // 25. Ultimate Debtor Postal Code
    data.ultimateDebtorTown,                       // 26. Ultimate Debtor Town
    data.ultimateDebtorCountry,                    // 27. Ultimate Debtor Country
    data.paymentReferenceType,                     // 28. Payment Reference Type
    data.paymentReference,                         // 29. Payment Reference
    data.unstructuredMessage,                      // 30. Unstructured Message
    data.billInformation,                          // 31. Bill Information
    data.alternativeScheme1,                       // 32. Alternative Scheme 1
    data.alternativeScheme2                        // 33. Alternative Scheme 2
  ];
  
  // Join with CRLF (\r\n) as required by Swiss QR standard
  const qrString = fields.join('\r\n');
  
  console.log(`✅ QR String formatted with ${fields.length} fields and CRLF line endings`);
  return qrString;
}

/**
 * Draw a Swiss QR Code as vector graphics into a jsPDF instance.
 * - 46x46 mm square total
 * - 5 mm quiet zone (inside the 46 mm square)
 * - Embedded Swiss Cross (vector), not a raster overlay
 * - Error correction M
 * This avoids raster images and maximizes banking app compatibility.
 *
 * Note: Pass a jsPDF instance. We type as any to avoid tight coupling.
 * @param pdf jsPDF-like instance
 * @param x Left position in mm
 * @param y Top position in mm
 * @param sizeMM Total QR symbol size in mm (should be 46)
 * @param invoice Invoice data
 * @returns The formatted SPC payload string
 */
export async function drawSwissQRCodeToPDF(
  pdf: any,
  x: number,
  y: number,
  sizeMM: number,
  invoice: Invoice
): Promise<string> {
  // 1) Build compliant payload
  const qrData = await generateSwissQRData(invoice);
  const payload = formatSwissQRString(qrData);

  // Validate header quickly
  const lines = payload.split('\r\n');
  if (lines[0] !== 'SPC') throw new Error('Swiss QR payload must start with SPC');
  if (lines[1] !== '0200' && lines[1] !== '0210') throw new Error('Swiss QR version must be 0200 or 0210');
  if (lines[2] !== '1') throw new Error('Swiss QR coding type must be 1 (Latin-1)');

  // 2) Create QR modules (error correction M)
  const qrAny: any = QRCode.create(payload, { errorCorrectionLevel: 'M' });

  // Normalize module access across possible shapes
  let moduleCount = 0;
  let isDark: (row: number, col: number) => boolean;
  if (qrAny && typeof qrAny.getModuleCount === 'function' && typeof qrAny.isDark === 'function') {
    moduleCount = qrAny.getModuleCount();
    isDark = (r, c) => qrAny.isDark(r, c);
  } else if (qrAny && qrAny.modules && Array.isArray(qrAny.modules.data) && typeof qrAny.modules.size === 'number') {
    moduleCount = qrAny.modules.size;
    isDark = (r, c) => !!qrAny.modules.data[r * moduleCount + c];
  } else if (qrAny && Array.isArray(qrAny.modules) && Array.isArray(qrAny.modules[0])) {
    moduleCount = qrAny.modules.length;
    isDark = (r, c) => !!qrAny.modules[r][c];
  } else {
    throw new Error('Unable to access QR modules structure');
  }

  // 3) Geometry
  const totalSize = sizeMM;           // expected 46mm
  const quietZone = 5;                // mm quiet zone inside the 46mm square
  const drawableSize = totalSize - quietZone * 2;
  const moduleSize = drawableSize / moduleCount; // mm per module
  const startX = x + quietZone;
  const startY = y + quietZone;

  // 4) Swiss cross dimensions (7mm square centered)
  const crossSize = 7; // mm
  const crossX = x + (totalSize - crossSize) / 2;
  const crossY = y + (totalSize - crossSize) / 2;

  // Compute module index bounds covered by the cross area
  const crossLeft = crossX;
  const crossTop = crossY;
  const crossRight = crossX + crossSize;
  const crossBottom = crossY + crossSize;

  const moduleCoversCross = (r: number, c: number) => {
    const mx1 = startX + c * moduleSize;
    const my1 = startY + r * moduleSize;
    const mx2 = mx1 + moduleSize;
    const my2 = my1 + moduleSize;
    // If module rectangle is fully inside the cross area, we omit it
    return mx1 >= crossLeft && my1 >= crossTop && mx2 <= crossRight && my2 <= crossBottom;
  };

  // 5) Draw white background for the entire QR square (ensures quiet zone is white)
  pdf.setFillColor(255, 255, 255);
  pdf.rect(x, y, totalSize, totalSize, 'F');

  // 6) Draw modules as black vector rectangles, skipping cross area
  pdf.setFillColor(0, 0, 0);
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (!isDark(r, c)) continue;
      if (moduleCoversCross(r, c)) continue;
      const mx = startX + c * moduleSize;
      const my = startY + r * moduleSize;
      pdf.rect(mx, my, moduleSize, moduleSize, 'F');
    }
  }

  // 7) Draw embedded Swiss cross (red square + white cross) inside the cleared area
  // Red background square
  pdf.setFillColor(255, 0, 0);
  pdf.rect(crossX, crossY, crossSize, crossSize, 'F');

  // White cross arms (approximate official proportions)
  const bar = crossSize / 5; // bar thickness
  const cx = crossX + crossSize / 2;
  const cy = crossY + crossSize / 2;
  pdf.setFillColor(255, 255, 255);
  // Horizontal bar
  pdf.rect(crossX, cy - bar / 2, crossSize, bar, 'F');
  // Vertical bar
  pdf.rect(cx - bar / 2, crossY, bar, crossSize, 'F');

  return payload;
}

/**
 * Generate basic Swiss QR Code without embedded cross (for compatibility)
 * @param invoice Invoice data
 * @returns Base64 data URL of the QR code
 */
export async function generateSwissQRCode(invoice: Invoice): Promise<string> {
  console.log(`🚀 Generating basic Swiss QR Code for invoice: ${invoice.number}`);
  
  try {
    const qrData = await generateSwissQRData(invoice);
    const qrString = formatSwissQRString(qrData);
    
    // Validate QR string
    const lines = qrString.split('\r\n');
    if (lines.length !== 33) {
      throw new Error(`Invalid QR string: expected 33 lines, got ${lines.length}`);
    }
    
    console.log(`✅ Generating QR code with ${lines.length} fields`);
    console.log(`- IBAN: ${qrData.account}`);
    console.log(`- Reference Type: ${qrData.paymentReferenceType}`);
    console.log(`- Amount: ${qrData.amount} ${qrData.currency}`);
    
    // Generate standard QR code
    const qrCodeDataURL = await QRCode.toDataURL(qrString, {
      errorCorrectionLevel: 'M',  // Medium error correction
      margin: 4,                  // Quiet zone
      width: 256,                 // High resolution
      scale: 1,
      type: 'image/png',
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    console.log(`✅ Basic Swiss QR Code generated successfully`);
    return qrCodeDataURL;
    
  } catch (error) {
    console.error(`❌ Basic Swiss QR Code generation failed:`, error);
    throw new Error(`QR Code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}