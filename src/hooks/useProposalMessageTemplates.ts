import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProposalMessageTemplate {
  template: string;
  enabled: boolean;
}

export type ProposalStatusKey = 
  | 'proposta' 
  | 'sindicancia' 
  | 'sindicancia_aprovada' 
  | 'aguardando_iniciacao' 
  | 'membro' 
  | 'reprovado';

export const DEFAULT_PROPOSAL_TEMPLATES: Record<ProposalStatusKey, ProposalMessageTemplate> = {
  proposta: {
    enabled: false,
    template: 'Olá, {nome}! Recebemos a sua proposta para o Grande Oriente Independente do Brasil (GOIB). Seu cadastro está sob análise preliminar pela secretaria da Ordem.',
  },
  sindicancia: {
    enabled: false,
    template: 'Olá, {nome}! Sua proposta para o GOIB avançou para a etapa de Sindicância & Verificação Preliminar. A comissão de sindicantes iniciou a análise e em breve entrará em contato para agendar a entrevista.',
  },
  sindicancia_aprovada: {
    enabled: false,
    template: 'Olá, {nome}! Parabéns! Sua Sindicância foi Aprovada pela Comissão. Acesse o sistema em {link_sistema}/proposta para conferir ou atualizar sua Ficha de Proposta Completa.',
  },
  aguardando_iniciacao: {
    enabled: false,
    template: 'Olá, {nome}! Sua proposta foi aprovada pela Loja {loja} e sua Cerimônia de Iniciação foi agendada para {data_iniciacao}. Em breve a secretaria entrará em contato com todas as instruções de preparação e vestimenta.',
  },
  membro: {
    enabled: false,
    template: 'Ilustre Irmão {nome}, seja muito bem-vindo ao Grande Oriente Independente do Brasil (GOIB) e à A.·.R.·.L.·.S.·. {loja}! Seu cadastro foi aprovado como {grau} e seu CIM é {cim}. Acesse o sistema em {link_sistema}/login com o e-mail {email}. Fraternal T.·.F.·.A.·.',
  },
  reprovado: {
    enabled: false,
    template: 'Olá, {nome}. Houve uma atualização no status da sua proposta junto ao GOIB. Entre em contato com a secretaria da Loja para mais informações.',
  },
};

export const TEMPLATE_VARIABLES = [
  { key: '{nome}', label: 'Nome Completo', example: 'Erbely Pericles da Silva' },
  { key: '{primeiro_nome}', label: 'Primeiro Nome', example: 'Erbely' },
  { key: '{loja}', label: 'Nome da Loja', example: 'Lealdade e Justiça 001' },
  { key: '{cim}', label: 'Número do CIM', example: '720168' },
  { key: '{grau}', label: 'Grau Maçônico', example: 'Aprendiz' },
  { key: '{data_iniciacao}', label: 'Data de Iniciação', example: '25/10/2026' },
  { key: '{email}', label: 'E-mail do Candidato', example: 'candidato@email.com' },
  { key: '{celular}', label: 'Celular / WhatsApp', example: '(11) 99471-4504' },
  { key: '{link_sistema}', label: 'Link do Sistema', example: 'https://sistemamaconiconovo.vercel.app' },
];

export function formatProposalMessage(
  templateStr: string,
  profile: {
    full_name?: string | null;
    email?: string | null;
    cell_phone?: string | null;
    phone?: string | null;
    cim_number?: string | null;
    degree?: string | null;
  } | null,
  extra?: {
    lodgeName?: string | null;
    initiationDate?: string | null;
  }
): string {
  if (!templateStr) return '';
  const fullName = profile?.full_name?.trim() || 'Candidato';
  const firstName = fullName.split(' ')[0] || fullName;
  const systemUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sistemamaconiconovo.vercel.app';

  return templateStr
    .replace(/{nome}/gi, fullName)
    .replace(/{primeiro_nome}/gi, firstName)
    .replace(/{loja}/gi, extra?.lodgeName || 'Loja Maçônica')
    .replace(/{cim}/gi, profile?.cim_number || 'A emitir')
    .replace(/{grau}/gi, profile?.degree || 'Aprendiz')
    .replace(/{data_iniciacao}/gi, extra?.initiationDate || 'a definir')
    .replace(/{email}/gi, profile?.email || '')
    .replace(/{celular}/gi, profile?.cell_phone || profile?.phone || '')
    .replace(/{link_sistema}/gi, systemUrl);
}

export function useProposalMessageTemplates() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['proposal-message-templates'],
    queryFn: async (): Promise<Record<ProposalStatusKey, ProposalMessageTemplate>> => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'proposal_message_templates')
        .maybeSingle();

      if (error) {
        console.warn('Erro ao carregar proposal_message_templates de app_settings:', error);
        return DEFAULT_PROPOSAL_TEMPLATES;
      }

      if (data?.value) {
        try {
          const parsed = JSON.parse(data.value);
          return {
            ...DEFAULT_PROPOSAL_TEMPLATES,
            ...parsed,
          };
        } catch (e) {
          console.error('Erro ao interpretar JSON de proposal_message_templates:', e);
        }
      }

      return DEFAULT_PROPOSAL_TEMPLATES;
    },
    staleTime: 5 * 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: async (newConfig: Record<ProposalStatusKey, ProposalMessageTemplate>) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert(
          {
            key: 'proposal_message_templates',
            value: JSON.stringify(newConfig, null, 2),
            description: 'Modelos de mensagens de WhatsApp disparadas na mudança de status de propostas e candidatos',
          },
          { onConflict: 'key' }
        );

      if (error) throw error;
      return newConfig;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['proposal-message-templates'], data);
      toast.success('Modelos de mensagens salvos com sucesso!');
    },
    onError: (err: any) => {
      console.error('Erro ao salvar templates de mensagens:', err);
      toast.error('Erro ao salvar mensagens: ' + err.message);
    },
  });

  return {
    templates: query.data || DEFAULT_PROPOSAL_TEMPLATES,
    isLoading: query.isLoading,
    saveTemplates: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}
