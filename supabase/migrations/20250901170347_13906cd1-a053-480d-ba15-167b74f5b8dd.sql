-- Enable realtime for tenant_features table
ALTER TABLE public.tenant_features REPLICA IDENTITY FULL;

-- Add tenant_features table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_features;