-- Create library_items table
CREATE TABLE public.library_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  file_url TEXT,
  file_type TEXT,
  degree TEXT NOT NULL CHECK (degree IN ('Aprendiz', 'Companheiro', 'Mestre')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;

-- Admin can manage all library items
CREATE POLICY "Admins can manage library items"
ON public.library_items
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Members can view items matching their degree
CREATE POLICY "Members can view items for their degree"
ON public.library_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.status = 'approved'
    AND (
      (p.degree = 'Aprendiz' AND library_items.degree = 'Aprendiz')
      OR (p.degree = 'Companheiro' AND library_items.degree IN ('Aprendiz', 'Companheiro'))
      OR (p.degree = 'Mestre' AND library_items.degree IN ('Aprendiz', 'Companheiro', 'Mestre'))
    )
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_library_items_updated_at
BEFORE UPDATE ON public.library_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();