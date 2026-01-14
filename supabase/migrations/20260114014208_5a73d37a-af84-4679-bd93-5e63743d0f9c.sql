-- Add category column to library_items
ALTER TABLE public.library_items 
ADD COLUMN category text NOT NULL DEFAULT 'Documentos';

-- Add check constraint for valid categories
ALTER TABLE public.library_items 
ADD CONSTRAINT library_items_category_check 
CHECK (category IN ('Documentos', 'Livros', 'Cursos', 'Trabalhos'));