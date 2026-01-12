import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';

export interface UserPermissions {
  id: string;
  profile_id: string;
  can_view_card: boolean;
  can_view_attendance: boolean;
  can_register_attendance: boolean;
  can_edit_profile: boolean;
  created_at: string;
  updated_at: string;
}

export function useUserPermissions() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['user-permissions', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (error) throw error;
      return data as UserPermissions | null;
    },
    enabled: !!profile?.id,
  });
}
