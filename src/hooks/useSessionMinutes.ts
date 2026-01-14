import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SessionMinute {
  id: string;
  lodge_id: string;
  session_type: 'ordinaria' | 'magna';
  session_date: string;
  session_number: number | null;
  opening_time: string | null;
  closing_time: string | null;
  presiding_master: string | null;
  orator: string | null;
  secretary: string | null;
  members_present: string | null;
  visitors: string | null;
  correspondence_read: string | null;
  treasury_report: string | null;
  proposals: string | null;
  deliberations: string | null;
  word_of_order: string | null;
  general_matters: string | null;
  observations: string | null;
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
      const { data, error } = await supabase
        .from('session_minutes')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as SessionMinute;
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
          opening_time: minute.opening_time,
          closing_time: minute.closing_time,
          presiding_master: minute.presiding_master,
          orator: minute.orator,
          secretary: minute.secretary,
          members_present: minute.members_present,
          visitors: minute.visitors,
          correspondence_read: minute.correspondence_read,
          treasury_report: minute.treasury_report,
          proposals: minute.proposals,
          deliberations: minute.deliberations,
          word_of_order: minute.word_of_order,
          general_matters: minute.general_matters,
          observations: minute.observations,
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
        .update(minute)
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
    }) => {
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

      const positions = signatures?.map(s => s.signer_position) || [];
      const requiredPositions = ['Venerável Mestre', 'Orador', 'Secretário'];
      const allSigned = requiredPositions.every(pos => positions.includes(pos));

      if (allSigned) {
        await supabase
          .from('session_minutes')
          .update({ status: 'signed' })
          .eq('id', minuteId);
      }

      return signature;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['minute-signatures', variables.minuteId] });
      queryClient.invalidateQueries({ queryKey: ['session-minute', variables.minuteId] });
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
