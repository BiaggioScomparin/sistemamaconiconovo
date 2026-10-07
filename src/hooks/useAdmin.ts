import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile, ProfileStatus } from '@/lib/supabase-types';

export function useAllProfiles(status?: ProfileStatus) {
  return useQuery({
    queryKey: ['all-profiles', status],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*, lodges(*)')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Profile[];
    },
  });
}

export function usePendingProfiles() {
  return useAllProfiles('pending');
}

export function useApprovedProfiles() {
  return useQuery({
    queryKey: ['all-profiles', 'members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, lodges(*)')
        .in('status', ['approved', 'membro'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Profile[];
    },
  });
}

export function useUpdateProfileStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ profileId, status }: { profileId: string; status: ProfileStatus }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', profileId)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Não foi possível atualizar o status (registro não encontrado ou sem permissão).');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] });
    },
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // Total members
      const { count: totalMembers, error: totalMembersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .in('status', ['approved', 'membro']);
      if (totalMembersError) throw totalMembersError;

      // Pending approvals
      const { count: pendingApprovals, error: pendingError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (pendingError) throw pendingError;

      // Total lodges
      const { count: totalLodges, error: lodgesCountError } = await supabase
        .from('lodges')
        .select('*', { count: 'exact', head: true });
      if (lodgesCountError) throw lodgesCountError;

      // Members per lodge
      const { data: lodgesWithMembers, error: lodgesWithMembersError } = await supabase
        .from('lodges')
        .select('id, name, profiles(id)')
        .in('profiles.status', ['approved', 'membro']);
      if (lodgesWithMembersError) throw lodgesWithMembersError;

      // Birthday this month
      const currentMonth = new Date().getMonth() + 1;
      const { data: birthdays, error: birthdaysError } = await supabase
        .from('profiles')
        .select('id, full_name, birth_date')
        .in('status', ['approved', 'membro']);
      if (birthdaysError) throw birthdaysError;

      const birthdaysThisMonth = birthdays?.filter((profile) => {
        if (!profile.birth_date) return false;
        const birthMonth = new Date(profile.birth_date + 'T12:00:00').getMonth() + 1;
        return birthMonth === currentMonth;
      }) || [];

      // Members by degree (only active members)
      const { data: membersByDegree, error: degreeError } = await supabase
        .from('profiles')
        .select('degree')
        .in('status', ['approved', 'membro'])
        .eq('member_status', 'active');
      if (degreeError) throw degreeError;

      const degreeCount: Record<string, number> = {
        'Aprendiz': 0,
        'Companheiro': 0,
        'Mestre': 0,
        'Mestre Instalado': 0,
      };

      membersByDegree?.forEach((profile) => {
        const degree = profile.degree || 'Aprendiz';
        if (degreeCount[degree] !== undefined) {
          degreeCount[degree]++;
        }
      });

      return {
        totalMembers: totalMembers || 0,
        pendingApprovals: pendingApprovals || 0,
        totalLodges: totalLodges || 0,
        lodgesWithMembers: lodgesWithMembers || [],
        birthdaysThisMonth,
        membersByDegree: degreeCount,
      };
    },
  });
}
