import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LodgeMember {
  id: string;
  full_name: string;
  lodge_position: string | null;
  member_status: string;
  photo_url: string | null;
  birth_date: string;
  initiation_date: string | null;
}

export function useLodgeMembers(lodgeId: string | undefined) {
  return useQuery({
    queryKey: ['lodge-members', lodgeId],
    queryFn: async () => {
      if (!lodgeId) return [];

      // Using the secure view that only exposes public member data
      const { data, error } = await supabase
        .from('lodge_members_public' as any)
        .select('id, full_name, lodge_position, member_status, photo_url, birth_date, initiation_date')
        .eq('lodge_id', lodgeId)
        .in('status', ['approved', 'membro'])
        .eq('member_status', 'active')
        .order('full_name');

      if (error) throw error;
      return (data as unknown) as LodgeMember[];
    },
    enabled: !!lodgeId,
  });
}
