import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Filter, Image as ImageIcon, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Product, ProductCategory } from "@/types";
import { ImageUpload } from "@/components/ui/image-upload";
import { CategoryManager } from "@/components/product/CategoryManager";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState({
    name: "",
    description: ""
  });
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    taxRate: 8.1,
    category: "",
    imageUrl: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('vendor_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.vendor_id) return;

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('vendor_id', profile.vendor_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map database fields to interface
      const mappedProducts: Product[] = (data || []).map(item => ({
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
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: "Fehler",
        description: "Beim Laden der Produkte ist ein Fehler aufgetreten.",
        variant: "destructive"
      });
    }
  };

  const loadCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('vendor_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.vendor_id) return;

      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .eq('vendor_id', profile.vendor_id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      const mappedCategories: ProductCategory[] = (data || []).map(item => ({
        id: item.id,
        vendorId: item.vendor_id,
        name: item.name,
        description: item.description,
        sortOrder: item.sort_order,
        isActive: item.is_active,
        createdBy: item.created_by,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
      
      setCategories(mappedCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: 0,
      taxRate: 8.1,
      category: "",
      imageUrl: ""
    });
    setEditingProduct(null);
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price,
        taxRate: product.taxRate,
        category: product.category || "",
        imageUrl: product.imageUrl || ""
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Fehler",
        description: "Produktname ist erforderlich.",
        variant: "destructive"
      });
      return;
    }

    if (formData.price <= 0) {
      toast({
        title: "Fehler",
        description: "Preis muss größer als 0 sein.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('vendor_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.vendor_id) return;

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update({
            name: formData.name,
            description: formData.description,
            price: formData.price,
            tax_rate: formData.taxRate,
            category: formData.category || null,
            image_url: formData.imageUrl || null
          })
          .eq('id', editingProduct.id);

        if (error) throw error;

        toast({
          title: "Produkt aktualisiert",
          description: "Das Produkt wurde erfolgreich aktualisiert.",
        });
      } else {
        const { error } = await supabase
          .from('products')
          .insert({
            vendor_id: profile.vendor_id,
            name: formData.name,
            description: formData.description,
            price: formData.price,
            tax_rate: formData.taxRate,
            category: formData.category || null,
            image_url: formData.imageUrl || null,
            created_by: user.id
          });

        if (error) throw error;

        toast({
          title: "Produkt erstellt",
          description: "Das Produkt wurde erfolgreich erstellt.",
        });
      }
      
      await loadProducts();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: "Fehler",
        description: "Beim Speichern des Produkts ist ein Fehler aufgetreten.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (productId: string, productName: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', productId);

      if (error) throw error;

      await loadProducts();
      toast({
        title: "Produkt gelöscht",
        description: `${productName} wurde erfolgreich gelöscht.`,
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Fehler",
        description: "Beim Löschen des Produkts ist ein Fehler aufgetreten.",
        variant: "destructive"
      });
    }
  };

  const handleCreateNewCategory = async () => {
    if (!newCategoryData.name.trim()) {
      toast({
        title: "Fehler",
        description: "Kategoriename ist erforderlich.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('vendor_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.vendor_id) return;

      const { error } = await supabase
        .from('product_categories')
        .insert({
          vendor_id: profile.vendor_id,
          name: newCategoryData.name,
          description: newCategoryData.description || null,
          sort_order: categories.length,
          created_by: user.id
        });

      if (error) throw error;

      // Reload categories and select the new one
      await loadCategories();
      setFormData({ ...formData, category: newCategoryData.name });
      setNewCategoryData({ name: "", description: "" });
      setIsNewCategoryModalOpen(false);
      
      toast({
        title: "Kategorie erstellt",
        description: `"${newCategoryData.name}" wurde erfolgreich erstellt und ausgewählt.`,
      });
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: "Fehler",
        description: "Beim Erstellen der Kategorie ist ein Fehler aufgetreten.",
        variant: "destructive"
      });
    }
  };

  const handleCategorySelectChange = (value: string) => {
    if (value === "create_new") {
      setIsNewCategoryModalOpen(true);
    } else {
      setFormData({ ...formData, category: value === "none" ? "" : value });
    }
  };

  const filteredProducts = selectedCategory === "all" 
    ? products 
    : products.filter(product => product.category === selectedCategory);

  const getCategoryProducts = (categoryName: string) => {
    return products.filter(product => product.category === categoryName);
  };

  const getUncategorizedProducts = () => {
    return products.filter(product => !product.category);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">Produkte</h1>
          <p className="text-sm text-muted-foreground">Verwalten Sie Ihre Produkte und Dienstleistungen mit Fotos und Kategorien</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => handleOpenDialog()} 
              className="w-full sm:w-auto text-xs sm:text-sm md:text-base px-3 py-2 sm:px-4 sm:py-2 h-9 sm:h-10"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Neues Produkt</span>
              <span className="sm:hidden">Neu</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Produkt bearbeiten" : "Neues Produkt"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <ImageUpload
                value={formData.imageUrl}
                onChange={(url) => setFormData({ ...formData, imageUrl: url || "" })}
              />
              
              <div>
                <Label htmlFor="name">Produktname</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="z.B. Margherita Pizza, Cappuccino..."
                />
              </div>
              
              <div>
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Produktbeschreibung, Zutaten, Allergene..."
                />
              </div>
              
              <div>
                <Label htmlFor="category">Kategorie</Label>
                <Select value={formData.category || "none"} onValueChange={handleCategorySelectChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategorie wählen (optional)" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-background border shadow-lg">
                    <SelectItem value="none">Keine Kategorie</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="create_new" className="text-primary font-medium border-t mt-1 pt-2">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Neue Kategorie erstellen
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Preis (CHF)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="taxRate">MwSt. Satz (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button onClick={handleSave}>
                  {editingProduct ? "Aktualisieren" : "Erstellen"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* New Category Modal */}
      <Dialog open={isNewCategoryModalOpen} onOpenChange={setIsNewCategoryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Neue Kategorie erstellen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="categoryName">Kategoriename *</Label>
              <Input
                id="categoryName"
                value={newCategoryData.name}
                onChange={(e) => setNewCategoryData({ ...newCategoryData, name: e.target.value })}
                placeholder="z.B. Pizza, Getränke, Desserts..."
                autoFocus
              />
            </div>
            
            <div>
              <Label htmlFor="categoryDescription">Beschreibung (optional)</Label>
              <Textarea
                id="categoryDescription"
                value={newCategoryData.description}
                onChange={(e) => setNewCategoryData({ ...newCategoryData, description: e.target.value })}
                placeholder="Kurze Beschreibung der Kategorie..."
                rows={2}
              />
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsNewCategoryModalOpen(false);
                  setNewCategoryData({ name: "", description: "" });
                }}
              >
                Abbrechen
              </Button>
              <Button onClick={handleCreateNewCategory}>
                Kategorie erstellen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Produkte ({products.length})
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Kategorien ({categories.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <CategoryManager onCategoryChange={() => {
            loadCategories();
            loadProducts();
          }} />
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          {/* Category Filter */}
          <div className="flex gap-2 items-center flex-wrap">
            <Button 
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
            >
              Alle ({products.length})
            </Button>
            {categories.map((category) => {
              const count = getCategoryProducts(category.name).length;
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.name ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.name)}
                >
                  {category.name} ({count})
                </Button>
              );
            })}
            {getUncategorizedProducts().length > 0 && (
              <Button
                variant={selectedCategory === "" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("")}
              >
                Ohne Kategorie ({getUncategorizedProducts().length})
              </Button>
            )}
          </div>

          {filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <div className="flex flex-col items-center gap-4">
                  <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                  <div>
                    <p className="text-muted-foreground mb-2">
                      {selectedCategory === "all" 
                        ? "Noch keine Produkte vorhanden" 
                        : `Keine Produkte in der Kategorie "${selectedCategory === "" ? "Ohne Kategorie" : selectedCategory}"`
                      }
                    </p>
                    <Button onClick={() => handleOpenDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Erstes Produkt erstellen
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block md:hidden space-y-3">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="p-4">
                    <div className="flex gap-3">
                      {/* Image */}
                      <div className="flex-shrink-0 flex justify-center">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-20 h-16 object-cover rounded-lg border shadow-sm"
                          />
                        ) : (
                          <div className="w-20 h-16 bg-muted rounded-lg border flex items-center justify-center shadow-sm">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate">{product.name}</h3>
                            {product.category && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                {product.category}
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleOpenDialog(product)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Produkt löschen</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Sind Sie sicher, dass Sie "{product.name}" löschen möchten? 
                                    Diese Aktion kann nicht rückgängig gemacht werden.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDelete(product.id, product.name)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Löschen
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                        
                        {product.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {product.description}
                          </p>
                        )}
                        
                        <div className="flex justify-between items-center mt-2">
                          <span className="font-medium text-sm">
                            CHF {product.price.toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            MwSt: {product.taxRate}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block">
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Bild</TableHead>
                        <TableHead className="min-w-32">Produktname</TableHead>
                        <TableHead className="min-w-48">Beschreibung</TableHead>
                        <TableHead className="w-32">Kategorie</TableHead>
                        <TableHead className="w-24 text-right">Preis</TableHead>
                        <TableHead className="w-20 text-center">MwSt</TableHead>
                        <TableHead className="w-32 text-center">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-16 h-12 object-cover rounded border"
                              />
                            ) : (
                              <div className="w-16 h-12 bg-muted rounded border flex items-center justify-center">
                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            <div className="max-w-xs" title={product.description}>
                              {product.description || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {product.category ? (
                              <Badge variant="secondary">{product.category}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium whitespace-nowrap">
                            CHF {product.price.toLocaleString('de-CH', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{product.taxRate}%</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleOpenDialog(product)}
                                title="Produkt bearbeiten"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                    title="Produkt löschen"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Produkt löschen</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Sind Sie sicher, dass Sie "{product.name}" löschen möchten? 
                                      Diese Aktion kann nicht rückgängig gemacht werden.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDelete(product.id, product.name)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Löschen
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}