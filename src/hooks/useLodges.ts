import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Lodge } from '@/lib/supabase-types';

export function useLodges() {
  return useQuery({
    queryKey: ['lodges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lodges')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Lodge[];
    },
  });
}

export function useCreateLodge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lodge: { name: string; city?: string; state?: string; default_payment_amount?: number; logo_url?: string }) => {
      const { data, error } = await supabase
        .from('lodges')
        .insert(lodge)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lodges'] });
    },
  });
}

export function useUpdateLodge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...lodge }: { id: string; name?: string; city?: string; state?: string; default_payment_amount?: number; logo_url?: string }) => {
      const { data, error } = await supabase
        .from('lodges')
        .update(lodge)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lodges'] });
      queryClient.invalidateQueries({ queryKey: ['lodge-financial-report'] });
    },
  });
}

export function useDeleteLodge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lodges')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lodges'] });
    },
  });
}
