-- Check if offers and offer_items tables exist and create missing foreign key relationship

-- First, let's ensure the offers table exists with proper structure
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID NOT NULL,
    customer_id UUID,
    offer_no TEXT NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 8.1,
    tax_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create offer_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.offer_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    offer_id UUID NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add the missing foreign key constraint
ALTER TABLE public.offer_items 
DROP CONSTRAINT IF EXISTS fk_offer_items_offer_id;

ALTER TABLE public.offer_items 
ADD CONSTRAINT fk_offer_items_offer_id 
FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;

-- Add foreign key for customer relationship if customers table exists
ALTER TABLE public.offers 
DROP CONSTRAINT IF EXISTS fk_offers_customer_id;

ALTER TABLE public.offers 
ADD CONSTRAINT fk_offers_customer_id 
FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;

-- Add foreign key for vendor relationship
ALTER TABLE public.offers 
DROP CONSTRAINT IF EXISTS fk_offers_vendor_id;

ALTER TABLE public.offers 
ADD CONSTRAINT fk_offers_vendor_id 
FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for offers
DROP POLICY IF EXISTS "Users can view their vendor's offers" ON public.offers;
CREATE POLICY "Users can view their vendor's offers" 
ON public.offers FOR SELECT 
USING (
  vendor_id IN (
    SELECT vendor_id FROM public.user_profiles WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create offers for their vendor" ON public.offers;
CREATE POLICY "Users can create offers for their vendor" 
ON public.offers FOR INSERT 
WITH CHECK (
  vendor_id IN (
    SELECT vendor_id FROM public.user_profiles WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update their vendor's offers" ON public.offers;
CREATE POLICY "Users can update their vendor's offers" 
ON public.offers FOR UPDATE 
USING (
  vendor_id IN (
    SELECT vendor_id FROM public.user_profiles WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete their vendor's offers" ON public.offers;
CREATE POLICY "Users can delete their vendor's offers" 
ON public.offers FOR DELETE 
USING (
  vendor_id IN (
    SELECT vendor_id FROM public.user_profiles WHERE user_id = auth.uid()
  )
);

-- Create RLS policies for offer_items
DROP POLICY IF EXISTS "Users can view offer items through offers" ON public.offer_items;
CREATE POLICY "Users can view offer items through offers" 
ON public.offer_items FOR SELECT 
USING (
  offer_id IN (
    SELECT id FROM public.offers 
    WHERE vendor_id IN (
      SELECT vendor_id FROM public.user_profiles WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can create offer items for their offers" ON public.offer_items;
CREATE POLICY "Users can create offer items for their offers" 
ON public.offer_items FOR INSERT 
WITH CHECK (
  offer_id IN (
    SELECT id FROM public.offers 
    WHERE vendor_id IN (
      SELECT vendor_id FROM public.user_profiles WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can update offer items for their offers" ON public.offer_items;
CREATE POLICY "Users can update offer items for their offers" 
ON public.offer_items FOR UPDATE 
USING (
  offer_id IN (
    SELECT id FROM public.offers 
    WHERE vendor_id IN (
      SELECT vendor_id FROM public.user_profiles WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can delete offer items for their offers" ON public.offer_items;
CREATE POLICY "Users can delete offer items for their offers" 
ON public.offer_items FOR DELETE 
USING (
  offer_id IN (
    SELECT id FROM public.offers 
    WHERE vendor_id IN (
      SELECT vendor_id FROM public.user_profiles WHERE user_id = auth.uid()
    )
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_offers_vendor_id ON public.offers(vendor_id);
CREATE INDEX IF NOT EXISTS idx_offers_customer_id ON public.offers(customer_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers(status);
CREATE INDEX IF NOT EXISTS idx_offer_items_offer_id ON public.offer_items(offer_id);

-- Create function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_offer_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_offers_updated_at ON public.offers;
CREATE TRIGGER update_offers_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_offers_updated_at();

DROP TRIGGER IF EXISTS update_offer_items_updated_at ON public.offer_items;
CREATE TRIGGER update_offer_items_updated_at
  BEFORE UPDATE ON public.offer_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_offer_items_updated_at();