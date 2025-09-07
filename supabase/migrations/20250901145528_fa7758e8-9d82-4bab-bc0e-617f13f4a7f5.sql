-- Add missing columns to tenants table for rejection tracking
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id);