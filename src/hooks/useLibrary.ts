import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LibraryItem {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  file_url: string | null;
  file_type: string | null;
  degree: 'Aprendiz' | 'Companheiro' | 'Mestre' | 'Mestre Instalado';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  creator_name?: string | null;
}

export function useLibraryItems() {
  return useQuery({
    queryKey: ['library-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_items')
        .select(`
          *,
          profiles:created_by (full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data.map((item: any) => ({
        ...item,
        creator_name: item.profiles?.full_name || null,
        profiles: undefined,
      })) as LibraryItem[];
    },
  });
}

export function useCreateLibraryItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (item: Omit<LibraryItem, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('library_items')
        .insert({
          ...item,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-items'] });
    },
  });
}

export function useUpdateLibraryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...item }: Partial<LibraryItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('library_items')
        .update(item)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-items'] });
    },
  });
}

export function useDeleteLibraryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('library_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-items'] });
    },
  });
}
