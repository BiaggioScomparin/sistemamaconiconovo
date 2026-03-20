import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationRule {
  id: string;
  lodge_id: string;
  category: string;
  is_enabled: boolean;
  days_offset: number | null;
  hours_before: number | null;
  repeat_interval_days: number | null;
  message_template: string | null;
  whatsapp_group_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppInstance {
  id: string;
  lodge_id: string;
  instance_id: string;
  token: string;
  base_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationLog {
  id: string;
  lodge_id: string;
  rule_id: string | null;
  profile_id: string | null;
  category: string;
  reference_id: string | null;
  phone: string | null;
  message: string | null;
  status: string;
  error_message: string | null;
  sent_at: string;
}

export function useNotificationRules(lodgeId?: string) {
  return useQuery({
    queryKey: ['notification-rules', lodgeId],
    queryFn: async () => {
      let query = supabase.from('notification_rules').select('*').order('category');
      if (lodgeId) query = query.eq('lodge_id', lodgeId);
      const { data, error } = await query;
      if (error) throw error;
      return data as NotificationRule[];
    },
  });
}

export function useCreateNotificationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rule: Omit<NotificationRule, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('notification_rules').insert(rule).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-rules'] }),
  });
}

export function useUpdateNotificationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rule }: Partial<NotificationRule> & { id: string }) => {
      const { data, error } = await supabase.from('notification_rules').update(rule).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-rules'] }),
  });
}

export function useDeleteNotificationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notification_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-rules'] }),
  });
}

export function useWhatsAppInstance(lodgeId?: string) {
  return useQuery({
    queryKey: ['whatsapp-instance', lodgeId],
    queryFn: async () => {
      if (!lodgeId) return null;
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('lodge_id', lodgeId)
        .maybeSingle();
      if (error) throw error;
      return data as WhatsAppInstance | null;
    },
    enabled: !!lodgeId,
  });
}

export function useUpsertWhatsAppInstance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (instance: { lodge_id: string; instance_id: string; token: string; base_url: string; is_active: boolean; api_format?: string }) => {
      // Check if exists
      const { data: existing } = await supabase
        .from('whatsapp_instances')
        .select('id')
        .eq('lodge_id', instance.lodge_id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('whatsapp_instances')
          .update(instance)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('whatsapp_instances')
          .insert(instance)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['whatsapp-instance'] }),
  });
}

export function useNotificationLogs(lodgeId?: string, limit = 50) {
  return useQuery({
    queryKey: ['notification-logs', lodgeId, limit],
    queryFn: async () => {
      let query = supabase
        .from('notification_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(limit);
      if (lodgeId) query = query.eq('lodge_id', lodgeId);
      const { data, error } = await query;
      if (error) throw error;
      return data as NotificationLog[];
    },
  });
}
