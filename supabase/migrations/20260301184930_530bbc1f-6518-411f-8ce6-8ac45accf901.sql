
-- Add api_format column to whatsapp_instances to support different providers
ALTER TABLE public.whatsapp_instances 
ADD COLUMN IF NOT EXISTS api_format text NOT NULL DEFAULT 'z-pro';
