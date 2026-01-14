import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AttendanceWithMember {
  id: string;
  profile_id: string;
  session_date: string;
  confirmed: boolean;
  full_name: string;
}

export function useAttendancesByDate(lodgeId: string | undefined, sessionDate: string | undefined) {
  return useQuery({
    queryKey: ['attendances-by-date', lodgeId, sessionDate],
    queryFn: async () => {
      if (!lodgeId || !sessionDate) {
        console.log('useAttendancesByDate: Missing lodgeId or sessionDate', { lodgeId, sessionDate });
        return [];
      }

      console.log('useAttendancesByDate: Fetching attendances', { lodgeId, sessionDate });

      // First get the attendances
      const { data: attendances, error: attendancesError } = await supabase
        .from('attendances')
        .select('id, profile_id, session_date, confirmed')
        .eq('lodge_id', lodgeId)
        .eq('session_date', sessionDate)
        .eq('confirmed', true);

      console.log('useAttendancesByDate: Attendances result', { attendances, error: attendancesError });

      if (!attendances || attendances.length === 0) {
        return [];
      }

      // Get the profile IDs
      const profileIds = attendances.map(a => a.profile_id);

      // Get the member names from the public view
      const { data: members, error: membersError } = await supabase
        .from('lodge_members_public')
        .select('id, full_name')
        .in('id', profileIds);

      if (membersError) {
        console.error('Error fetching members:', membersError);
        // Continue without names if this fails
      }

      // Create a map of profile_id to full_name
      const memberMap = new Map<string, string>();
      if (members) {
        (members as unknown as Array<{ id: string; full_name: string }>).forEach(m => {
          memberMap.set(m.id, m.full_name);
        });
      }

      // Combine the data
      const result: AttendanceWithMember[] = attendances.map(a => ({
        id: a.id,
        profile_id: a.profile_id,
        session_date: a.session_date,
        confirmed: a.confirmed,
        full_name: memberMap.get(a.profile_id) || 'Membro não encontrado'
      }));

      return result;
    },
    enabled: !!lodgeId && !!sessionDate,
  });
}
