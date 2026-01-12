import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Child } from '@/lib/supabase-types';
import { useAuth } from '@/contexts/AuthContext';

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*, lodges(*)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user?.id,
  });
}

export function useProfileChildren(profileId: string | undefined) {
  return useQuery({
    queryKey: ['children', profileId],
    queryFn: async () => {
      if (!profileId) return [];

      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('profile_id', profileId)
        .order('birth_date', { ascending: true });

      if (error) throw error;
      return data as Child[];
    },
    enabled: !!profileId,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (profileData: Partial<Profile>) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('user_id', user?.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });
}

export function useAddChild() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ profileId, name, birthDate }: { profileId: string; name: string; birthDate: string }) => {
      const { data, error } = await supabase
        .from('children')
        .insert({ profile_id: profileId, name, birth_date: birthDate })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['children', variables.profileId] });
    },
  });
}

export function useRemoveChild() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ childId, profileId }: { childId: string; profileId: string }) => {
      const { error } = await supabase
        .from('children')
        .delete()
        .eq('id', childId);

      if (error) throw error;
      return profileId;
    },
    onSuccess: (profileId) => {
      queryClient.invalidateQueries({ queryKey: ['children', profileId] });
    },
  });
}
