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
  return useAllProfiles('approved');
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
        .single();

      if (error) throw error;
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
      const { count: totalMembers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      // Pending approvals
      const { count: pendingApprovals } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Total lodges
      const { count: totalLodges } = await supabase
        .from('lodges')
        .select('*', { count: 'exact', head: true });

      // Members per lodge
      const { data: lodgesWithMembers } = await supabase
        .from('lodges')
        .select('id, name, profiles(id)')
        .eq('profiles.status', 'approved');

      // Birthday this month
      const currentMonth = new Date().getMonth() + 1;
      const { data: birthdays } = await supabase
        .from('profiles')
        .select('id, full_name, birth_date')
        .eq('status', 'approved');

      const birthdaysThisMonth = birthdays?.filter((profile) => {
        const birthMonth = new Date(profile.birth_date).getMonth() + 1;
        return birthMonth === currentMonth;
      }) || [];

      return {
        totalMembers: totalMembers || 0,
        pendingApprovals: pendingApprovals || 0,
        totalLodges: totalLodges || 0,
        lodgesWithMembers: lodgesWithMembers || [],
        birthdaysThisMonth,
      };
    },
  });
}
