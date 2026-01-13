import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  lodge_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  lodge?: {
    name: string;
  } | null;
}

export interface CreateEventData {
  title: string;
  description?: string;
  event_date: string;
  event_time?: string;
  lodge_id?: string | null;
}

export function useEvents(lodgeId?: string) {
  return useQuery({
    queryKey: ['events', lodgeId],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select('*, lodge:lodges(name)')
        .order('event_date', { ascending: true });

      if (lodgeId) {
        query = query.or(`lodge_id.eq.${lodgeId},lodge_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Event[];
    },
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventData: CreateEventData) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('events')
        .insert({
          ...eventData,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...eventData }: CreateEventData & { id: string }) => {
      const { data, error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
