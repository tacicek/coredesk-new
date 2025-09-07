import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Package, CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { productStorage } from "@/lib/storage-simple";
import { supabase } from "@/integrations/supabase/client";
import { simpleInvoiceStorage } from "@/lib/simple-invoice-storage";
import { invoiceNumberGenerator } from "@/lib/invoice-storage";
import { customerStorage } from "@/lib/customerStorage";
import { CustomerSelector } from "@/components/customer/CustomerSelector";
import { CustomerModal } from "@/components/customer/CustomerModal";
import { Invoice, InvoiceItem, Product, Customer } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import FeatureGuard from "@/components/FeatureGuard";

interface NewInvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

export default function NewInvoice() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State declarations
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<Date>();
  const [notes, setNotes] = useState<string>("");
  const [includeTax, setIncludeTax] = useState<boolean>(false);
  const [taxRate, setTaxRate] = useState<number>(8.1);
  const [items, setItems] = useState<NewInvoiceItem[]>([
    { id: '1', description: '', quantity: 1, price: 0 }
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Loading data for new invoice...');
        
        // Load products from Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('vendor_id')
            .eq('user_id', user.id)
            .single();

          if (profile?.vendor_id) {
            // Load products
            const { data: productsData, error: productsError } = await supabase
              .from('products')
              .select('*')
              .eq('vendor_id', profile.vendor_id)
              .eq('is_active', true)
              .order('created_at', { ascending: false });

            if (productsError) {
              console.error('Error loading products:', productsError);
            } else {
              // Map database fields to interface
              const mappedProducts: Product[] = (productsData || []).map(item => ({
                id: item.id,
                name: item.name,
                description: item.description || "",
                price: parseFloat(item.price.toString()),
                taxRate: parseFloat(item.tax_rate.toString()),
                category: item.category,
                imageUrl: item.image_url,
                isActive: item.is_active,
                vendorId: item.vendor_id,
                createdBy: item.created_by,
                createdAt: item.created_at,
                updatedAt: item.updated_at
              }));
              
              setProducts(mappedProducts);
            }

            // Load company settings
            const { data: companySettings } = await supabase
              .from('company_settings')
              .select('*')
              .eq('vendor_id', profile.vendor_id)
              .single();

            if (companySettings) {
              setTaxRate(companySettings.default_tax_rate || 8.1);
              
              // Set due date from settings
              const dueDateCalc = new Date();
              dueDateCalc.setDate(dueDateCalc.getDate() + (companySettings.default_due_days || 30));
              setDueDate(dueDateCalc);
            }
          }
        }
        
        // Generate invoice number using Supabase (for display purposes only)
        const nextNumber = await invoiceNumberGenerator.getNext();
        setInvoiceNumber(nextNumber);
        
      } catch (error) {
        console.error('Error in loadData:', error);
      }
    };
    
    loadData();
  }, []);

  const addItem = () => {
    const newItem: NewInvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      price: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof NewInvoiceItem, value: string | number) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const addProductToInvoice = (product: Product) => {
    const newItem: NewInvoiceItem = {
      id: Date.now().toString(),
      description: product.name,
      quantity: 1,
      price: product.price
    };
    setItems([...items, newItem]);
  };

  // Get unique categories from products
  const getCategories = () => {
    const categories = products
      .filter(product => product.category)
      .map(product => product.category!)
      .filter((category, index, array) => array.indexOf(category) === index)
      .sort();
    return categories;
  };

  // Filter products based on search term and category
  const getFilteredProducts = () => {
    return products.filter(product => {
      const matchesSearch = searchTerm === "" || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategoryFilter === "all" ||
        (selectedCategoryFilter === "uncategorized" && !product.category) ||
        product.category === selectedCategoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  };

  const calculateSubtotal = () => {
    return items.reduce((total, item) => total + (item.quantity * item.price), 0);
  };

  const calculateTax = (subtotal: number) => {
    return includeTax ? subtotal * (taxRate / 100) : 0;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal + calculateTax(subtotal);
  };

  const handleSave = async () => {
    console.log('Starting handleSave...');
    console.log('Selected customer:', selectedCustomer);
    console.log('Items:', items);
    
    if (!selectedCustomer) {
      console.log('No customer selected');
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie einen Kunden aus.",
        variant: "destructive"
      });
      return;
    }

    if (items.some(item => !item.description || item.quantity <= 0 || item.price <= 0)) {
      console.log('Invalid items found');
      toast({
        title: "Fehler", 
        description: "Bitte füllen Sie alle Positionen vollständig aus.",
        variant: "destructive"
      });
      return;
    }

    const subtotal = calculateSubtotal();
    const taxTotal = calculateTax(subtotal);
    const total = subtotal + taxTotal;

    // Convert items to invoice items
    const invoiceItems: InvoiceItem[] = items.map(item => ({
      id: crypto.randomUUID(),
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.price,
      taxRate: includeTax ? taxRate : 0,
      total: item.quantity * item.price
    }));

    const invoice: Invoice = {
      id: crypto.randomUUID(),
      number: 'TEMP', // Will be generated at insertion time
      invoiceNumber: 'TEMP', // Will be generated at insertion time
      customerName: selectedCustomer.name,
      customerEmail: selectedCustomer.email,
      date: new Date(invoiceDate).toISOString(),
      dueDate: dueDate ? dueDate.toISOString() : new Date().toISOString(),
      items: invoiceItems,
      subtotal,
      taxTotal,
      total,
      status: 'draft',
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('About to save invoice:', invoice);
    
    try {
      console.log('Using simple invoice storage');
      
      await simpleInvoiceStorage.add(invoice);
      
      console.log('Invoice saved to Supabase successfully');
      
      toast({
        title: "Rechnung erstellt",
        description: "Die Rechnung wurde erfolgreich erstellt.",
      });
      console.log('Navigating to invoices...');
      navigate("/dashboard/invoices");
    } catch (error) {
      console.error('Invoice creation error details:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      toast({
        title: "Fehler",
        description: `Rechnung konnte nicht erstellt werden: ${error?.message || error}`,
        variant: "destructive"
      });
    }
  };

  const handleCustomerSelect = (customerId: string, customer: Customer | null) => {
    setSelectedCustomerId(customerId);
    setSelectedCustomer(customer);
  };

  const handleCreateNewCustomer = () => {
    setIsCustomerModalOpen(true);
  };

  const handleCustomerCreated = async (customerData: Omit<Customer, 'id' | 'createdAt'>) => {
    try {
      const newCustomer = await customerStorage.add(customerData);
      setSelectedCustomerId(newCustomer.id);
      setSelectedCustomer(newCustomer);
      setIsCustomerModalOpen(false);
      toast({
        title: 'Erfolg',
        description: 'Kunde wurde erfolgreich erstellt und ausgewählt.',
      });
    } catch (error) {
      console.error('Error creating customer:', error);
      toast({
        title: 'Fehler',
        description: 'Kunde konnte nicht erstellt werden.',
        variant: 'destructive',
      });
    }
  };

  return (
    <FeatureGuard 
      feature="invoices"
      featureDisplayName="Rechnungen"
      description="Diese Funktion wurde für Ihren Mandanten deaktiviert."
    >
      <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/dashboard/invoices")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Zurück</span>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Neue Rechnung</h1>
          <p className="text-muted-foreground">Erstellen Sie eine neue Rechnung</p>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Rechnungsdetails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4">
            <div className="grid grid-cols-1 gap-3 md:gap-4">
              <div>
                <Label htmlFor="invoiceNumber">Rechnungsnummer</Label>
                <Input 
                  id="invoiceNumber" 
                  value={invoiceNumber}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div>
                <Label htmlFor="date">Rechnungsdatum</Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="dueDate">Fälligkeitsdatum</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "dd.MM.yyyy") : "Datum auswählen"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="customer">Kunde *</Label>
              <CustomerSelector
                value={selectedCustomerId}
                onValueChange={handleCustomerSelect}
                onCreateNew={handleCreateNewCustomer}
                placeholder="Kunde auswählen..."
              />
              {selectedCustomer && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <div className="font-medium">{selectedCustomer.name}</div>
                  <div className="text-muted-foreground">{selectedCustomer.email}</div>
                  {selectedCustomer.contactPerson && (
                    <div className="text-muted-foreground">
                      Ansprechpartner: {selectedCustomer.contactPerson}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="notes">Notizen</Label>
              <Textarea 
                id="notes" 
                placeholder="Zusätzliche Informationen..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="includeTax"
                  checked={includeTax}
                  onCheckedChange={(checked) => setIncludeTax(checked === true)}
                />
                <Label htmlFor="includeTax">MwSt. hinzufügen</Label>
              </div>
              {includeTax && (
                <div>
                  <Label htmlFor="taxRate">MwSt. Satz (%)</Label>
                  <Input 
                    id="taxRate" 
                    type="number" 
                    step="0.1"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Positionen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4">
            {products.length > 0 && (
              <div className="w-full">
                <Label className="text-sm font-medium mb-2 block">Produkt aus Liste hinzufügen</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      type="button"
                    >
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <span>Produkt auswählen ({products.length} verfügbar)</span>
                      </div>
                      <div className="ml-2">↓</div>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-screen max-w-[95vw] sm:max-w-[600px] p-0 pointer-events-auto" align="start">
                    {/* Search and Filter Header */}
                    <div className="p-3 border-b bg-muted/30 space-y-3">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex-1">
                          <Input
                            placeholder="Produkte suchen..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div className="min-w-[140px]">
                          <Select 
                            value={selectedCategoryFilter} 
                            onValueChange={setSelectedCategoryFilter}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Kategorie" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Alle Kategorien</SelectItem>
                              {getCategories().map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                              {products.some(p => !p.category) && (
                                <SelectItem value="uncategorized">Ohne Kategorie</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getFilteredProducts().length} von {products.length} Produkten
                      </div>
                    </div>

                    <div className="max-h-80 overflow-auto">
                      {getFilteredProducts().length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-sm">
                            {searchTerm || selectedCategoryFilter !== "all" 
                              ? "Keine Produkte gefunden"
                              : "Keine Produkte verfügbar"
                            }
                          </p>
                          {(searchTerm || selectedCategoryFilter !== "all") && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={() => {
                                setSearchTerm("");
                                setSelectedCategoryFilter("all");
                              }}
                            >
                              Filter zurücksetzen
                            </Button>
                          )}
                        </div>
                      ) : (
                        <>
                          {/* Mobile Card View */}
                          <div className="block sm:hidden">
                            <div className="p-2 space-y-2">
                              {getFilteredProducts().map((product) => (
                                <div
                                  key={product.id}
                                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                                  onClick={() => addProductToInvoice(product)}
                                >
                                  <div className="flex-shrink-0">
                                    {product.imageUrl ? (
                                      <img
                                        src={product.imageUrl}
                                        alt={product.name}
                                        className="w-12 h-10 object-cover rounded border"
                                      />
                                    ) : (
                                      <div className="w-12 h-10 bg-muted rounded border flex items-center justify-center">
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{product.name}</div>
                                    {product.category && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {product.category}
                                      </div>
                                    )}
                                    <div className="text-xs font-medium text-primary mt-1">
                                      CHF {product.price.toFixed(2)}
                                    </div>
                                  </div>
                                  <div className="flex-shrink-0">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 px-2"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addProductToInvoice(product);
                                      }}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Desktop Table View */}
                          <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full min-w-[500px]">
                              <thead className="bg-muted/50 sticky top-0">
                                <tr>
                                  <th className="text-left p-3 font-medium text-sm">Bild</th>
                                  <th className="text-left p-3 font-medium text-sm">Produktname</th>
                                  <th className="text-left p-3 font-medium text-sm hidden md:table-cell">Kategorie</th>
                                  <th className="text-right p-3 font-medium text-sm">Preis</th>
                                  <th className="text-center p-3 font-medium text-sm">Aktion</th>
                                </tr>
                              </thead>
                              <tbody>
                                {getFilteredProducts().map((product, index) => (
                                  <tr 
                                    key={product.id} 
                                    className={`border-t hover:bg-accent/30 cursor-pointer ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
                                    onClick={() => addProductToInvoice(product)}
                                  >
                                    <td className="p-3">
                                      <div className="flex justify-center">
                                        {product.imageUrl ? (
                                          <img
                                            src={product.imageUrl}
                                            alt={product.name}
                                            className="w-12 h-10 object-cover rounded border"
                                          />
                                        ) : (
                                          <div className="w-12 h-10 bg-muted rounded border flex items-center justify-center">
                                            <Package className="h-4 w-4 text-muted-foreground" />
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      <div className="font-medium text-sm">{product.name}</div>
                                      {product.description && (
                                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2 sm:hidden">
                                          {product.description}
                                        </div>
                                      )}
                                    </td>
                                    <td className="p-3 hidden md:table-cell">
                                      {product.category ? (
                                        <span className="inline-block px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-full">
                                          {product.category}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground text-sm">-</span>
                                      )}
                                    </td>
                                    <td className="p-3 text-right font-medium whitespace-nowrap">
                                      CHF {product.price.toFixed(2)}
                                    </td>
                                    <td className="p-3 text-center">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-3"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          addProductToInvoice(product);
                                        }}
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        <span className="hidden sm:inline">Hinzufügen</span>
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-2 items-end border p-3 rounded-lg md:border-0 md:p-0 md:rounded-none">
                <div className="md:col-span-6">
                  <Label htmlFor={`description-${index}`}>Beschreibung</Label>
                  <Input
                    id={`description-${index}`}
                    placeholder="Produktbeschreibung"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 md:contents">
                <div className="md:col-span-2">
                  <Label htmlFor={`quantity-${index}`}>Menge</Label>
                  <Input
                    id={`quantity-${index}`}
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="md:col-span-3">
                  <Label htmlFor={`price-${index}`}>Preis (CHF)</Label>
                  <Input
                    id={`price-${index}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.price}
                    onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="md:col-span-1 flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                </div>
              </div>
            ))}
            
            <Button variant="outline" onClick={addItem} className="w-full" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Position hinzufügen
            </Button>

            <div className="border-t pt-3 md:pt-4 space-y-2">
              <div className="flex justify-between text-sm md:text-base">
                <span>Zwischensumme:</span>
                <span>CHF {calculateSubtotal().toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
              </div>
              {includeTax && (
                <div className="flex justify-between text-sm md:text-base">
                  <span>MwSt. ({taxRate}%):</span>
                  <span>CHF {calculateTax(calculateSubtotal()).toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-base md:text-lg font-semibold border-t pt-2">
                <span>Gesamtbetrag:</span>
                <span>CHF {calculateTotal().toLocaleString('de-CH', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
        <Button onClick={handleSave} className="flex-1 sm:flex-none">
          Rechnung speichern
        </Button>
        <Button variant="outline" onClick={() => navigate("/dashboard/invoices")} className="flex-1 sm:flex-none">
          Abbrechen
        </Button>
      </div>

      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSave={handleCustomerCreated}
        customer={null}
      />
    </div>
    </FeatureGuard>
  );
}