-- Add logo_url column to lodges table
ALTER TABLE public.lodges 
ADD COLUMN IF NOT EXISTS logo_url text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.lodges.logo_url IS 'URL of the lodge logo stored in storage bucket';