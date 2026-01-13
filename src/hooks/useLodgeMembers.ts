import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/lib/supabase-types';

export function useLodgeMembers(lodgeId: string | undefined | null) {
  return useQuery({
    queryKey: ['lodge-members', lodgeId],
    queryFn: async () => {
      if (!lodgeId) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, photo_url, lodge_position, degree, status')
        .eq('lodge_id', lodgeId)
        .in('status', ['approved', 'membro'])
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data as Pick<Profile, 'id' | 'full_name' | 'photo_url' | 'lodge_position' | 'degree' | 'status'>[];
    },
    enabled: !!lodgeId,
  });
}

export function useLodgePositions(lodgeId: string | undefined | null) {
  return useQuery({
    queryKey: ['lodge-positions', lodgeId],
    queryFn: async () => {
      if (!lodgeId) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, photo_url, lodge_position, degree')
        .eq('lodge_id', lodgeId)
        .in('status', ['approved', 'membro'])
        .not('lodge_position', 'is', null)
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data as Pick<Profile, 'id' | 'full_name' | 'photo_url' | 'lodge_position' | 'degree'>[];
    },
    enabled: !!lodgeId,
  });
}
