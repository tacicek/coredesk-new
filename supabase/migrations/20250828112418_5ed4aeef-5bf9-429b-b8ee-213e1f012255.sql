-- Create products table with photo and category support
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 8.1,
  category TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create policies for vendor access
CREATE POLICY "Users can view their vendor's products" 
ON public.products 
FOR SELECT 
USING (vendor_id = get_user_vendor_id());

CREATE POLICY "Users can create products for their vendor" 
ON public.products 
FOR INSERT 
WITH CHECK (vendor_id = get_user_vendor_id() AND created_by = auth.uid());

CREATE POLICY "Users can update their vendor's products" 
ON public.products 
FOR UPDATE 
USING (vendor_id = get_user_vendor_id());

CREATE POLICY "Users can delete their vendor's products" 
ON public.products 
FOR DELETE 
USING (vendor_id = get_user_vendor_id());

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_products_updated_at();

-- Create product categories table for better organization
CREATE TABLE public.product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, name)
);

-- Enable RLS on categories table
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for product categories
CREATE POLICY "Users can view their vendor's categories" 
ON public.product_categories 
FOR SELECT 
USING (vendor_id = get_user_vendor_id());

CREATE POLICY "Users can create categories for their vendor" 
ON public.product_categories 
FOR INSERT 
WITH CHECK (vendor_id = get_user_vendor_id() AND created_by = auth.uid());

CREATE POLICY "Users can update their vendor's categories" 
ON public.product_categories 
FOR UPDATE 
USING (vendor_id = get_user_vendor_id());

CREATE POLICY "Users can delete their vendor's categories" 
ON public.product_categories 
FOR DELETE 
USING (vendor_id = get_user_vendor_id());

-- Add foreign key constraint for category
ALTER TABLE public.products 
ADD CONSTRAINT fk_products_category 
FOREIGN KEY (vendor_id, category) 
REFERENCES public.product_categories(vendor_id, name) 
ON DELETE SET NULL;