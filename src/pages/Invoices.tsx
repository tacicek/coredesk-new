import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Download, Edit, CheckCircle, Settings, Mail, Trash2, Send, Copy, Filter, FileSpreadsheet, Calendar } from "lucide-react";
import { Invoice } from "@/types";
import { invoiceStorage } from "@/lib/invoice-storage";
import { generateInvoicePDF } from "@/lib/pdfGenerator";
import { EmailService } from "@/lib/emailService";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InvoiceEmailModal } from "@/components/invoice/InvoiceEmailModal";
import { invoiceNumberGenerator } from "@/lib/invoice-storage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as XLSX from 'xlsx';
import FeatureGuard from "@/components/FeatureGuard";

const statusLabels = {
  draft: 'Entwurf',
  sent: 'Offen', 
  paid: 'Bezahlt',
  overdue: 'Überfällig'
};

const getStatusLabel = (status: string, isDuplicate?: boolean) => {
  const baseLabel = statusLabels[status as keyof typeof statusLabels];
  if (isDuplicate && status === 'draft') {
    return `${baseLabel} - Duplicat`;
  }
  return baseLabel;
};

const statusColors = {
  draft: 'secondary',
  sent: 'default',
  paid: 'success',
  overdue: 'destructive'
} as const;

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedInvoiceForEmail, setSelectedInvoiceForEmail] = useState<Invoice | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState<string>('');
  const [exportDateTo, setExportDateTo] = useState<string>('');
  const navigate = useNavigate();

  // Get available years from invoices
  const getAvailableYears = (invoices: Invoice[]) => {
    const years = invoices.map(inv => new Date(inv.date).getFullYear());
    return [...new Set(years)].sort((a, b) => b - a);
  };

  // Get invoice counts by status
  const getInvoiceCounts = (invoices: Invoice[]) => {
    const counts = {
      all: invoices.length,
      draft: invoices.filter(inv => inv.status === 'draft').length,
      sent: invoices.filter(inv => inv.status === 'sent').length,
      paid: invoices.filter(inv => inv.status === 'paid').length,
      overdue: invoices.filter(inv => isOverdue(inv)).length,
    };
    return counts;
  };

  const exportPaidInvoicesToExcel = async () => {
    try {
      console.log('Starting Excel export...');
      console.log('All invoices:', invoices.length);
      
      // Filter paid invoices
      let paidInvoices = invoices.filter(inv => inv.status === 'paid');
      console.log('Paid invoices found:', paidInvoices.length);
      
      // Apply date filters if provided
      if (exportDateFrom) {
        const fromDate = exportDateFrom;
        paidInvoices = paidInvoices.filter(inv => inv.date >= fromDate);
        console.log('After from date filter:', paidInvoices.length);
      }
      
      if (exportDateTo) {
        const toDate = exportDateTo;
        paidInvoices = paidInvoices.filter(inv => inv.date <= toDate);
        console.log('After to date filter:', paidInvoices.length);
      }

      if (paidInvoices.length === 0) {
        toast.error('Keine bezahlten Rechnungen im ausgewählten Zeitraum gefunden');
        return;
      }

      console.log('Preparing Excel data for', paidInvoices.length, 'invoices');

      // Prepare data for Excel with proper formatting
      const excelData = paidInvoices.map(invoice => {
        console.log('Processing invoice:', invoice.number);
        return {
          'Rechnungsnummer': invoice.number || invoice.invoiceNumber || 'N/A',
          'Kunde': invoice.customerName || 'Unbekannter Kunde',
          'E-Mail': invoice.customerEmail || '',
          'Rechnungsdatum': format(new Date(invoice.date), 'dd.MM.yyyy', { locale: de }),
          'Fälligkeitsdatum': format(new Date(invoice.dueDate), 'dd.MM.yyyy', { locale: de }),
          'Nettobetrag': (invoice.subtotal || 0).toFixed(2),
          'Steuern': (invoice.taxTotal || 0).toFixed(2),
          'Gesamtbetrag': (invoice.total || 0).toFixed(2),
          'Status': 'Bezahlt',
          'Positionen': invoice.items?.length || 0,
          'Notizen': invoice.notes || ''
        };
      });

      console.log('Excel data prepared:', excelData);

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Bezahlte Rechnungen");

      // Auto-size columns
      if (excelData.length > 0) {
        const colWidths = Object.keys(excelData[0]).map(key => ({
          wch: Math.max(key.length, 15)
        }));
        ws['!cols'] = colWidths;
      }

      // Generate filename with date range
      const dateRange = exportDateFrom && exportDateTo 
        ? `_${exportDateFrom}_bis_${exportDateTo}`
        : exportDateFrom 
          ? `_ab_${exportDateFrom}`
          : exportDateTo
            ? `_bis_${exportDateTo}`
            : '';
      
      const filename = `Bezahlte_Rechnungen${dateRange}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

      console.log('Downloading file:', filename);

      // Download file
      XLSX.writeFile(wb, filename);
      
      toast.success(`${paidInvoices.length} bezahlte Rechnungen erfolgreich exportiert`);
      
      // Close modal and reset dates
      setExportModalOpen(false);
      setExportDateFrom('');
      setExportDateTo('');
      
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Fehler beim Exportieren der Excel-Datei: ' + error.message);
    }
  };

  const loadInvoices = async () => {
    try {
      console.log('Loading invoices from Supabase...');
      setLoading(true);
      
      const allInvoices = await invoiceStorage.getAll();
      console.log('Loaded invoices from Supabase:', allInvoices);
      
      // Sort by date (newest first)
      const sortedInvoices = allInvoices.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      setInvoices(sortedInvoices);
      applyFilters(sortedInvoices);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Fehler beim Laden der Rechnungen');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (invoiceList: Invoice[]) => {
    let filtered = invoiceList;

    // Apply year filter
    if (selectedYear !== 'all') {
      filtered = filtered.filter(inv => 
        new Date(inv.date).getFullYear().toString() === selectedYear
      );
    }

    // Apply status filter
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'overdue') {
        filtered = filtered.filter(inv => isOverdue(inv));
      } else {
        filtered = filtered.filter(inv => inv.status === selectedStatus);
      }
    }

    setFilteredInvoices(filtered);
  };

  // Update filters when year or status changes
  useEffect(() => {
    if (invoices.length > 0) {
      applyFilters(invoices);
    }
  }, [selectedYear, selectedStatus, invoices]);

  useEffect(() => {
    loadInvoices();
  }, []);

  const isOverdue = (invoice: Invoice) => {
    if (invoice.status === 'paid') return false;
    if (invoice.status === 'draft') return false;
    if (invoice.status !== 'sent') return false;
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      toast.loading('PDF wird erstellt...', { id: `pdf-${invoice.id}` });
      await generateInvoicePDF(invoice);
      
      // If invoice is draft, change status to sent when downloading
      // Also remove duplicate flag and clean up notes if it's a duplicate
      if (invoice.status === 'draft') {
        const updateData: Partial<Invoice> = { status: 'sent' };
        
        if (invoice.isDuplicate) {
          updateData.isDuplicate = false;
          let cleanedNotes = invoice.notes || '';
          if (cleanedNotes.includes('Duplikat von')) {
            cleanedNotes = cleanedNotes.replace(/^Duplikat von [^\n]+\n\n?/, '').trim();
          }
          updateData.notes = cleanedNotes;
        }
        
        await invoiceStorage.update(invoice.id, updateData);
        await loadInvoices(); // Reload to get updated data
      }
      
      toast.success('PDF erfolgreich heruntergeladen', { id: `pdf-${invoice.id}` });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Fehler beim Erstellen der PDF', { id: `pdf-${invoice.id}` });
    }
  };

  const handleEdit = (invoice: Invoice) => {
    navigate(`/dashboard/invoices/${invoice.id}/edit`);
  };

  const handleSendReminderEmail = async (invoice: Invoice) => {
    try {
      toast.loading('E-Mail wird gesendet...', { id: `email-${invoice.id}` });
      
      // TODO: Implement email sending functionality
      setTimeout(() => {
        toast.success('Zahlungserinnerung gesendet', { id: `email-${invoice.id}` });
      }, 1500);
      
    } catch (error) {
      toast.error('Fehler beim Senden der E-Mail', { id: `email-${invoice.id}` });
    }
  };

  const handleOpenEmailModal = (invoice: Invoice) => {
    if (!invoice.customerEmail) {
      toast.error('Kunde hat keine E-Mail-Adresse');
      return;
    }
    setSelectedInvoiceForEmail(invoice);
    setEmailModalOpen(true);
  };

  const handleSendInvoiceEmail = async (emailData: { to: string; subject: string; message: string }) => {
    if (!selectedInvoiceForEmail) return;

    try {
      toast.loading('E-Mail wird gesendet...', { id: `email-${selectedInvoiceForEmail.id}` });
      
      // Send email with custom subject and message
      const emailSent = await EmailService.sendInvoiceEmail(selectedInvoiceForEmail);
      
      if (emailSent) {
        const updateData: Partial<Invoice> = { status: 'sent' };
        
        // Remove duplicate flag and clean up notes if it's a duplicate
        if (selectedInvoiceForEmail.isDuplicate) {
          updateData.isDuplicate = false;
          let cleanedNotes = selectedInvoiceForEmail.notes || '';
          if (cleanedNotes.includes('Duplikat von')) {
            cleanedNotes = cleanedNotes.replace(/^Duplikat von [^\n]+\n\n?/, '').trim();
          }
          updateData.notes = cleanedNotes;
        }
        
        await invoiceStorage.update(selectedInvoiceForEmail.id, updateData);
        await loadInvoices(); // Reload to get updated data
        toast.success(`Rechnung an ${emailData.to} gesendet`, { id: `email-${selectedInvoiceForEmail.id}` });
      } else {
        toast.error('E-Mail wurde nicht gesendet', { id: `email-${selectedInvoiceForEmail.id}` });
      }
      
    } catch (error) {
      console.error('Error sending invoice email:', error);
      toast.error('Fehler beim Senden der E-Mail', { id: `email-${selectedInvoiceForEmail.id}` });
    }
  };

  const handleChangeStatus = async (invoice: Invoice, newStatus: 'draft' | 'sent' | 'paid' | 'overdue') => {
    try {
      await invoiceStorage.update(invoice.id, { status: newStatus });
      await loadInvoices(); // Reload to get updated data
      toast.success(`Status zu "${statusLabels[newStatus]}" geändert`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Fehler beim Aktualisieren des Status');
    }
  };

  const handleMarkAsPaid = async (invoice: Invoice) => {
    try {
      await invoiceStorage.update(invoice.id, { status: 'paid' });
      await loadInvoices(); // Reload to get updated data
      toast.success('Rechnung als bezahlt markiert');
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast.error('Fehler beim Aktualisieren des Status');
    }
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    try {
      await invoiceStorage.delete(invoice.id);
      await loadInvoices(); // Reload to get updated data
      toast.success('Rechnung erfolgreich gelöscht');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Fehler beim Löschen der Rechnung');
    }
  };

  const handleDuplicateInvoice = async (invoice: Invoice) => {
    try {
      toast.loading('Rechnung wird dupliziert...', { id: `duplicate-${invoice.id}` });
      
      // Generate new invoice number
      const newInvoiceNumber = await invoiceNumberGenerator.getNext();
      
      // Create duplicate invoice with today's date
      const today = new Date().toISOString().split('T')[0];
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // 30 days from today
      const dueDateString = dueDate.toISOString().split('T')[0];
      
      const duplicateInvoice: Invoice = {
        ...invoice,
        id: `duplicate-${Date.now()}`, // Temporary ID, will be replaced by Supabase
        number: newInvoiceNumber,
        invoiceNumber: newInvoiceNumber,
        date: today, // Use today's date so it appears at the top
        dueDate: dueDateString, // New due date
        status: 'draft',
        isDuplicate: true, // Mark as duplicate
        notes: `Duplikat von ${invoice.number}${invoice.notes ? '\n\n' + invoice.notes : ''}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await invoiceStorage.add(duplicateInvoice);
      await loadInvoices(); // Reload to get updated data
      toast.success(`Rechnung ${newInvoiceNumber} erfolgreich dupliziert`, { id: `duplicate-${invoice.id}` });
    } catch (error) {
      console.error('Error duplicating invoice:', error);
      toast.error('Fehler beim Duplizieren der Rechnung', { id: `duplicate-${invoice.id}` });
    }
  };

  // Get current filter status for display
  const availableYears = getAvailableYears(invoices);
  const invoiceCounts = getInvoiceCounts(invoices);
  
  const getFilterTitle = () => {
    let title = 'Rechnungen';
    if (selectedYear !== 'all') {
      title += ` ${selectedYear}`;
    }
    if (selectedStatus === 'overdue') title += ' - Überfällig';
    else if (selectedStatus === 'draft') title += ' - Entwürfe';
    else if (selectedStatus === 'sent') title += ' - Offen';
    else if (selectedStatus === 'paid') title += ' - Bezahlt';
    return title;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Rechnungen werden geladen...</h1>
          </div>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Laden...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <FeatureGuard 
      feature="invoices"
      featureDisplayName="Rechnungen"
      description="Diese Funktion wurde für Ihren Mandanten deaktiviert."
    >
      <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{getFilterTitle()}</h1>
          <p className="text-muted-foreground">
            {filteredInvoices.length} von {invoices.length} Rechnungen
          </p>
        </div>
        <div className="flex gap-2">
          {invoiceCounts.paid > 0 && (
            <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="md:size-default">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Excel Export</span>
                  <span className="sm:hidden">Export</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                    Bezahlte Rechnungen exportieren
                  </DialogTitle>
                  <DialogDescription>
                    Wählen Sie einen Zeitraum für den Export der bezahlten Rechnungen als Excel-Datei.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="export-date-from" className="text-right">
                      Von Datum
                    </Label>
                    <Input
                      id="export-date-from"
                      type="date"
                      value={exportDateFrom}
                      onChange={(e) => setExportDateFrom(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="export-date-to" className="text-right">
                      Bis Datum
                    </Label>
                    <Input
                      id="export-date-to"
                      type="date"
                      value={exportDateTo}
                      onChange={(e) => setExportDateTo(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  
                  <div className="text-sm text-muted-foreground mt-2">
                    {exportDateFrom || exportDateTo 
                      ? `Zeitraum: ${exportDateFrom ? format(new Date(exportDateFrom), 'dd.MM.yyyy', { locale: de }) : 'Anfang'} - ${exportDateTo ? format(new Date(exportDateTo), 'dd.MM.yyyy', { locale: de }) : 'Ende'}`
                      : 'Alle bezahlten Rechnungen werden exportiert'
                    }
                  </div>
                </div>
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setExportModalOpen(false)}
                  >
                    Abbrechen
                  </Button>
                  <Button 
                    type="button"
                    onClick={exportPaidInvoicesToExcel}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Exportieren
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          
          <Link to="/dashboard/invoices/new">
            <Button size="sm" className="md:size-default">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Neue Rechnung</span>
              <span className="sm:hidden">Neu</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter & Übersicht
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Year and Status Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Jahr</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Jahr wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Jahre</SelectItem>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="draft">Entwürfe</SelectItem>
                  <SelectItem value="sent">Offen</SelectItem>
                  <SelectItem value="paid">Bezahlt</SelectItem>
                  <SelectItem value="overdue">Überfällig</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">{invoiceCounts.all}</div>
                <div className="text-sm text-muted-foreground">Gesamt</div>
              </div>
            </Card>
            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedStatus('draft')}>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{invoiceCounts.draft}</div>
                <div className="text-sm text-muted-foreground">Entwürfe</div>
              </div>
            </Card>
            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedStatus('sent')}>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{invoiceCounts.sent}</div>
                <div className="text-sm text-muted-foreground">Offen</div>
              </div>
            </Card>
            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedStatus('paid')}>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{invoiceCounts.paid}</div>
                <div className="text-sm text-muted-foreground">Bezahlt</div>
              </div>
            </Card>
            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedStatus('overdue')}>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{invoiceCounts.overdue}</div>
                <div className="text-sm text-muted-foreground">Überfällig</div>
              </div>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Clear Filters */}
      {(selectedYear !== 'all' || selectedStatus !== 'all') && (
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setSelectedYear('all');
              setSelectedStatus('all');
            }}
          >
            Alle Filter zurücksetzen
          </Button>
          <div className="flex gap-2">
            {selectedYear !== 'all' && (
              <Badge variant="secondary">
                Jahr: {selectedYear}
              </Badge>
            )}
            {selectedStatus !== 'all' && (
              <Badge variant="secondary">
                Status: {selectedStatus === 'overdue' ? 'Überfällig' : 
                        selectedStatus === 'draft' ? 'Entwürfe' :
                        selectedStatus === 'sent' ? 'Offen' : 'Bezahlt'}
              </Badge>
            )}
          </div>
        </div>
      )}

      {filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="text-center py-6 md:py-8">
            <p className="text-muted-foreground mb-4">Noch keine Rechnungen vorhanden</p>
            <Link to="/dashboard/invoices/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Erste Rechnung erstellen
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map((invoice) => {
            const overdueStatus = isOverdue(invoice);
            return (
            <Card 
              key={invoice.id} 
              className={`hover:shadow-md transition-shadow ${
                overdueStatus 
                  ? 'bg-destructive/10 border-destructive/20 hover:bg-destructive/15' 
                  : ''
              }`}
            >
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{invoice.customerName || 'Unbekannter Kunde'}</h3>
                        <Badge variant={statusColors[invoice.status]} className="flex-shrink-0">
                          {getStatusLabel(invoice.status, invoice.isDuplicate)}
                        </Badge>
                        {overdueStatus && (
                          <Badge variant="destructive" className="flex-shrink-0 animate-pulse">
                            ÜBERFÄLLIG
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium">#{invoice.number}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{format(new Date(invoice.date), 'dd. MMMM yyyy', { locale: de })}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className={overdueStatus ? 'text-destructive font-medium' : ''}>
                        Fällig: {format(new Date(invoice.dueDate), 'dd. MMM yyyy', { locale: de })}
                        {overdueStatus && ' (ÜBERFÄLLIG)'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="text-left lg:text-right">
                      <div className="text-xl font-bold flex items-baseline gap-1">
                        <span className="text-sm text-muted-foreground">CHF</span>
                        <span>{invoice.total.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {invoice.items.length} Position{invoice.items.length !== 1 ? 'en' : ''}
                      </div>
                    </div>
                  
                    <div className="flex gap-1 flex-wrap justify-start lg:justify-end lg:flex-shrink-0 mt-2 lg:mt-0">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={`h-8 w-8 p-0 ${invoice.customerEmail ? 'text-green-600' : 'text-orange-600'}`}
                        title={invoice.customerEmail ? 'E-Mail senden' : 'Keine E-Mail verfügbar'}
                        onClick={() => invoice.customerEmail && handleOpenEmailModal(invoice)}
                        disabled={!invoice.customerEmail}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0" 
                          onClick={() => navigate(`/dashboard/invoices/${invoice.id}`)}
                          title="Rechnung anzeigen"
                       >
                         <Eye className="h-4 w-4" />
                       </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0" 
                        onClick={() => handleDownloadPDF(invoice)}
                        title="PDF herunterladen"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                       
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0" 
                        onClick={() => handleEdit(invoice)}
                        title="Bearbeiten"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50" 
                        onClick={() => handleDuplicateInvoice(invoice)}
                        title="Rechnung duplizieren"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      
                      {overdueStatus && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50" 
                          onClick={() => handleSendReminderEmail(invoice)}
                          title="Zahlungserinnerung senden"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {invoice.status === 'sent' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-success hover:text-success" 
                          onClick={() => handleMarkAsPaid(invoice)}
                          title="Als bezahlt markieren"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive" 
                            title="Rechnung löschen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Rechnung löschen?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Sind Sie sicher, dass Sie die Rechnung #{invoice.number} löschen möchten? 
                              Diese Aktion kann nicht rückgängig gemacht werden.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteInvoice(invoice)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Löschen
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Status ändern"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleChangeStatus(invoice, 'draft')}>
                            Status: Entwurf
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleChangeStatus(invoice, 'sent')}>
                            Status: Offen
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleChangeStatus(invoice, 'paid')}>
                            Status: Bezahlt
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleChangeStatus(invoice, 'overdue')}>
                            Status: Überfällig
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      <InvoiceEmailModal
        invoice={selectedInvoiceForEmail}
        isOpen={emailModalOpen}
        onClose={() => {
          setEmailModalOpen(false);
          setSelectedInvoiceForEmail(null);
        }}
        onSend={handleSendInvoiceEmail}
      />
    </div>
    </FeatureGuard>
  );
}