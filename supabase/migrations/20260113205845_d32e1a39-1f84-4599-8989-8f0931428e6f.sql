-- Drop the existing policy
DROP POLICY IF EXISTS "Members can view items for their degree" ON public.library_items;

-- Create corrected policy including 'membro' status
CREATE POLICY "Members can view items for their degree"
ON public.library_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.status IN ('approved', 'membro')
    AND (
      (p.degree = 'Aprendiz' AND library_items.degree = 'Aprendiz')
      OR (p.degree = 'Companheiro' AND library_items.degree IN ('Aprendiz', 'Companheiro'))
      OR (p.degree = 'Mestre' AND library_items.degree IN ('Aprendiz', 'Companheiro', 'Mestre'))
    )
  )
);