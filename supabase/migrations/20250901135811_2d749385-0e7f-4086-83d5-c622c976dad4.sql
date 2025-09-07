-- Create vendor_secrets table for storing tenant-specific API keys
CREATE TABLE IF NOT EXISTS public.vendor_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  secret_type TEXT NOT NULL,
  secret_name TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(vendor_id, secret_type, secret_name)
);

-- Enable RLS
ALTER TABLE public.vendor_secrets ENABLE ROW LEVEL SECURITY;

-- Create policies for vendor_secrets
CREATE POLICY "Users can manage their vendor's secrets"
ON public.vendor_secrets
FOR ALL
USING (vendor_id = get_user_vendor_id());

-- Create trigger for updated_at
CREATE TRIGGER update_vendor_secrets_updated_at
  BEFORE UPDATE ON public.vendor_secrets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default AI API types for existing vendors
INSERT INTO public.vendor_secrets (vendor_id, secret_type, secret_name, encrypted_value, description, is_active)
SELECT 
  v.id,
  'ai_api',
  'openai_api_key',
  '',
  'OpenAI API key for AI-powered features',
  false
FROM public.vendors v
WHERE NOT EXISTS (
  SELECT 1 FROM public.vendor_secrets vs 
  WHERE vs.vendor_id = v.id AND vs.secret_type = 'ai_api' AND vs.secret_name = 'openai_api_key'
);

INSERT INTO public.vendor_secrets (vendor_id, secret_type, secret_name, encrypted_value, description, is_active)
SELECT 
  v.id,
  'ai_api',
  'gemini_api_key',
  '',
  'Google Gemini API key for AI-powered features',
  false
FROM public.vendors v
WHERE NOT EXISTS (
  SELECT 1 FROM public.vendor_secrets vs 
  WHERE vs.vendor_id = v.id AND vs.secret_type = 'ai_api' AND vs.secret_name = 'gemini_api_key'
);

INSERT INTO public.vendor_secrets (vendor_id, secret_type, secret_name, encrypted_value, description, is_active)
SELECT 
  v.id,
  'ai_api',
  'claude_api_key',
  '',
  'Anthropic Claude API key for AI-powered features',
  false
FROM public.vendors v
WHERE NOT EXISTS (
  SELECT 1 FROM public.vendor_secrets vs 
  WHERE vs.vendor_id = v.id AND vs.secret_type = 'ai_api' AND vs.secret_name = 'claude_api_key'
);