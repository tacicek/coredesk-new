-- Drop the existing vendor_secrets table and create a proper one for API management
DROP TABLE IF EXISTS public.vendor_secrets CASCADE;

-- Create new vendor_api_keys table for API management
CREATE TABLE public.vendor_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  api_provider TEXT NOT NULL, -- 'openai', 'gemini', 'claude', 'resend', etc.
  api_key_name TEXT NOT NULL, -- 'openai_api_key', 'gemini_api_key', etc.
  encrypted_value TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(vendor_id, api_key_name)
);

-- Enable RLS
ALTER TABLE public.vendor_api_keys ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their vendor's API keys"
ON public.vendor_api_keys
FOR ALL
USING (vendor_id = get_user_vendor_id());

-- Create trigger for updated_at
CREATE TRIGGER update_vendor_api_keys_updated_at
  BEFORE UPDATE ON public.vendor_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default AI API entries for existing vendors (inactive)
INSERT INTO public.vendor_api_keys (vendor_id, api_provider, api_key_name, encrypted_value, description, is_active)
SELECT 
  v.id,
  'openai',
  'openai_api_key',
  '',
  'OpenAI API key for AI-powered features',
  false
FROM public.vendors v;

INSERT INTO public.vendor_api_keys (vendor_id, api_provider, api_key_name, encrypted_value, description, is_active)
SELECT 
  v.id,
  'gemini',
  'gemini_api_key',
  '',
  'Google Gemini API key for AI-powered features',
  false
FROM public.vendors v;

INSERT INTO public.vendor_api_keys (vendor_id, api_provider, api_key_name, encrypted_value, description, is_active)
SELECT 
  v.id,
  'claude',
  'claude_api_key',
  '',
  'Anthropic Claude API key for AI-powered features',
  false
FROM public.vendors v;