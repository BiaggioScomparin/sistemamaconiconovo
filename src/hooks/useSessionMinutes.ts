import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SessionMinute {
  id: string;
  lodge_id: string;
  session_type: 'ordinaria' | 'magna';
  session_date: string;
  session_number: number | null;
  masonic_year: string | null;
  opening_time: string | null;
  closing_time: string | null;
  
  // Constituição da Loja - Oficiais
  presiding_master: string | null;
  first_vigilant: string | null;
  second_vigilant: string | null;
  orator: string | null;
  secretary: string | null;
  first_deacon: string | null;
  second_deacon: string | null;
  chancellor: string | null;
  inner_guard: string | null;
  master_of_ceremonies: string | null;
  hospitaller: string | null;
  treasurer: string | null;
  master_of_harmony: string | null;
  
  // Presença
  members_present: string | null;
  visitors: string | null;
  
  // Conteúdo da Sessão
  previous_minutes_reading: string | null;
  expedient: string | null;
  proposal_bag: string | null;
  order_of_the_day: string | null;
  study_time: string | null;
  beneficence_trunk: string | null;
  word_for_order: string | null;
  closing_ritual: string | null;
  observations: string | null;
  
  // Campos para Sessão Magna
  magna_ceremony_type: string | null;
  initiates: string | null;
  
  // Campos antigos (mantidos para compatibilidade)
  correspondence_read: string | null;
  treasury_report: string | null;
  proposals: string | null;
  deliberations: string | null;
  word_of_order: string | null;
  general_matters: string | null;
  
  // Status
  status: 'draft' | 'completed' | 'signed';
  completed_at: string | null;
  completed_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MinuteSignature {
  id: string;
  minute_id: string;
  signer_id: string;
  signer_name: string;
  signer_position: string;
  signature_hash: string;
  signed_at: string;
  ip_address: string | null;
}

export function useSessionMinutes(sessionType?: 'ordinaria' | 'magna') {
  return useQuery({
    queryKey: ['session-minutes', sessionType],
    queryFn: async () => {
      let query = supabase
        .from('session_minutes')
        .select('*')
        .order('session_date', { ascending: false });

      if (sessionType) {
        query = query.eq('session_type', sessionType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SessionMinute[];
    },
  });
}

export function useSessionMinute(id: string | undefined) {
  return useQuery({
    queryKey: ['session-minute', id],
    queryFn: async () => {
      if (!id) return null;
      // maybeSingle() returns null (instead of throwing PGRST116) when the row
      // doesn't exist or is hidden by RLS.
      const { data, error } = await supabase
        .from('session_minutes')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as SessionMinute | null;
    },
    enabled: !!id,
  });
}

export function useMinuteSignatures(minuteId: string | undefined) {
  return useQuery({
    queryKey: ['minute-signatures', minuteId],
    queryFn: async () => {
      if (!minuteId) return [];
      const { data, error } = await supabase
        .from('minute_signatures')
        .select('*')
        .eq('minute_id', minuteId)
        .order('signed_at', { ascending: true });
      if (error) throw error;
      return data as MinuteSignature[];
    },
    enabled: !!minuteId,
  });
}

export function useCreateSessionMinute() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (minute: Partial<SessionMinute>) => {
      const { data, error } = await supabase
        .from('session_minutes')
        .insert({
          lodge_id: minute.lodge_id!,
          session_type: minute.session_type || 'ordinaria',
          session_date: minute.session_date!,
          session_number: minute.session_number,
          masonic_year: minute.masonic_year,
          opening_time: minute.opening_time,
          closing_time: minute.closing_time,
          presiding_master: minute.presiding_master,
          first_vigilant: minute.first_vigilant,
          second_vigilant: minute.second_vigilant,
          orator: minute.orator,
          secretary: minute.secretary,
          first_deacon: minute.first_deacon,
          second_deacon: minute.second_deacon,
          chancellor: minute.chancellor,
          inner_guard: minute.inner_guard,
          master_of_ceremonies: minute.master_of_ceremonies,
          hospitaller: minute.hospitaller,
          treasurer: minute.treasurer,
          master_of_harmony: minute.master_of_harmony,
          members_present: minute.members_present,
          visitors: minute.visitors,
          previous_minutes_reading: minute.previous_minutes_reading,
          expedient: minute.expedient,
          proposal_bag: minute.proposal_bag,
          order_of_the_day: minute.order_of_the_day,
          study_time: minute.study_time,
          beneficence_trunk: minute.beneficence_trunk,
          word_for_order: minute.word_for_order,
          closing_ritual: minute.closing_ritual,
          observations: minute.observations,
          magna_ceremony_type: minute.magna_ceremony_type,
          initiates: minute.initiates,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-minutes'] });
    },
  });
}

export function useUpdateSessionMinute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...minute }: Partial<SessionMinute> & { id: string }) => {
      const { data, error } = await supabase
        .from('session_minutes')
        .update({
          session_date: minute.session_date,
          session_number: minute.session_number,
          masonic_year: minute.masonic_year,
          opening_time: minute.opening_time,
          closing_time: minute.closing_time,
          presiding_master: minute.presiding_master,
          first_vigilant: minute.first_vigilant,
          second_vigilant: minute.second_vigilant,
          orator: minute.orator,
          secretary: minute.secretary,
          first_deacon: minute.first_deacon,
          second_deacon: minute.second_deacon,
          chancellor: minute.chancellor,
          inner_guard: minute.inner_guard,
          master_of_ceremonies: minute.master_of_ceremonies,
          hospitaller: minute.hospitaller,
          treasurer: minute.treasurer,
          master_of_harmony: minute.master_of_harmony,
          members_present: minute.members_present,
          visitors: minute.visitors,
          previous_minutes_reading: minute.previous_minutes_reading,
          expedient: minute.expedient,
          proposal_bag: minute.proposal_bag,
          order_of_the_day: minute.order_of_the_day,
          study_time: minute.study_time,
          beneficence_trunk: minute.beneficence_trunk,
          word_for_order: minute.word_for_order,
          closing_ritual: minute.closing_ritual,
          observations: minute.observations,
          magna_ceremony_type: minute.magna_ceremony_type,
          initiates: minute.initiates,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['session-minutes'] });
      queryClient.invalidateQueries({ queryKey: ['session-minute', variables.id] });
    },
  });
}

export function useCompleteSessionMinute() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('session_minutes')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['session-minutes'] });
      queryClient.invalidateQueries({ queryKey: ['session-minute', id] });
    },
  });
}

export function useSignMinute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      minuteId,
      signerId,
      signerName,
      signerPosition,
    }: {
      minuteId: string;
      signerId: string;
      signerName: string;
      signerPosition: string;
    }): Promise<{ signature: MinuteSignature; allSigned: boolean }> => {
      // Generate signature hash (timestamp + signer info)
      const signatureData = `${minuteId}-${signerId}-${Date.now()}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(signatureData);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const signatureHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { data: signature, error } = await supabase
        .from('minute_signatures')
        .insert({
          minute_id: minuteId,
          signer_id: signerId,
          signer_name: signerName,
          signer_position: signerPosition,
          signature_hash: signatureHash,
        })
        .select()
        .single();

      if (error) throw error;

      // Check if all required signatures are present and update status
      const { data: signatures } = await supabase
        .from('minute_signatures')
        .select('signer_position')
        .eq('minute_id', minuteId);

      const positions = signatures?.map(s => s.signer_position.toLowerCase()) || [];
      // Support both snake_case and formatted names
      const requiredPositions = ['veneravel_mestre', 'orador', 'secretario'];
      const allSigned = requiredPositions.every(pos => 
        positions.includes(pos) || 
        positions.includes(pos.replace(/_/g, ' '))
      );

      if (allSigned) {
        await supabase
          .from('session_minutes')
          .update({ 
            status: 'signed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', minuteId);
      }

      return { signature: signature as MinuteSignature, allSigned };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['minute-signatures', variables.minuteId] });
      queryClient.invalidateQueries({ queryKey: ['session-minute', variables.minuteId] });
      queryClient.invalidateQueries({ queryKey: ['session-minutes'] });
    },
  });
}

export function useReprocessMinutesStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Get all completed minutes (not yet signed)
      const { data: minutes, error: minutesError } = await supabase
        .from('session_minutes')
        .select('id')
        .eq('status', 'completed');

      if (minutesError) throw minutesError;

      const requiredPositions = ['veneravel_mestre', 'orador', 'secretario'];
      let updatedCount = 0;

      for (const minute of minutes || []) {
        // Get signatures for this minute
        const { data: signatures } = await supabase
          .from('minute_signatures')
          .select('signer_position')
          .eq('minute_id', minute.id);

        const positions = signatures?.map(s => s.signer_position.toLowerCase()) || [];
        const allSigned = requiredPositions.every(pos => positions.includes(pos));

        if (allSigned) {
          await supabase
            .from('session_minutes')
            .update({ 
              status: 'signed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', minute.id);
          updatedCount++;
        }
      }

      return updatedCount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-minutes'] });
    },
  });
}

export function useDeleteSessionMinute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('session_minutes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-minutes'] });
    },
  });
}
