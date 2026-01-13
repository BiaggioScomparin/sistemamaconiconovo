import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LodgeMember {
  id: string;
  full_name: string;
  lodge_position: string | null;
  member_status: string;
  photo_url: string | null;
  birth_date: string;
}

export function useLodgeMembers(lodgeId: string | undefined) {
  return useQuery({
    queryKey: ['lodge-members', lodgeId],
    queryFn: async () => {
      if (!lodgeId) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, lodge_position, member_status, photo_url, birth_date')
        .eq('lodge_id', lodgeId)
        .in('status', ['approved', 'membro'])
        .eq('member_status', 'active')
        .order('full_name');

      if (error) throw error;
      return data as LodgeMember[];
    },
    enabled: !!lodgeId,
  });
}
