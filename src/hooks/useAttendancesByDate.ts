import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AttendanceWithProfile {
  id: string;
  profile_id: string;
  session_date: string;
  confirmed: boolean;
  profiles: {
    full_name: string;
  } | null;
}

export function useAttendancesByDate(lodgeId: string | undefined, sessionDate: string | undefined) {
  return useQuery({
    queryKey: ['attendances-by-date', lodgeId, sessionDate],
    queryFn: async () => {
      if (!lodgeId || !sessionDate) return [];

      const { data, error } = await supabase
        .from('attendances')
        .select(`
          id,
          profile_id,
          session_date,
          confirmed,
          profiles:profile_id (
            full_name
          )
        `)
        .eq('lodge_id', lodgeId)
        .eq('session_date', sessionDate)
        .eq('confirmed', true);

      if (error) throw error;
      
      return (data as unknown as AttendanceWithProfile[]) || [];
    },
    enabled: !!lodgeId && !!sessionDate,
  });
}
