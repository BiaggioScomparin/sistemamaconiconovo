import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useLodges } from '@/hooks/useLodges';
import { 
  FileText, 
  Search as SearchIcon, 
  UserX, 
  UserCheck, 
  Calendar, 
  MapPin, 
  Building2, 
  Mail, 
  Phone,
  CreditCard,
  Eye,
  Printer,
  Kanban,
  List,
  ShieldCheck,
  MessageSquare,
  Send,
  Trash2,
  RotateCcw,
  MoreVertical,
  AlertTriangle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { generateEditalPDF } from '@/lib/generateEditalPDF';
import { EditalFormDialog, EditalFormData } from '@/components/admin/EditalFormDialog';
import { ProposalMessageSettingsDialog } from '@/components/admin/ProposalMessageSettingsDialog';
import { useProposalMessageTemplates, formatProposalMessage, ProposalStatusKey } from '@/hooks/useProposalMessageTemplates';

type ProfileStatus = 'proposta' | 'sindicancia' | 'sindicancia_aprovada' | 'aguardando_iniciacao' | 'reprovado' | 'membro' | 'pending' | 'approved' | 'rejected';

interface Profile {
  id: string;
  user_id?: string | null;
  full_name: string;
  email: string | null;
  cpf: string | null;
  birth_date: string;
  photo_url: string | null;
  status: ProfileStatus;
  city: string | null;
  state: string | null;
  phone: string | null;
  cell_phone: string | null;
  profession: string | null;
  lodge_id: string | null;
  proposal_date: string | null;
  created_at: string;
  naturality: string | null;
  nationality: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  cep: string | null;
  residence_time: string | null;
  voter_title: string | null;
  voter_zone: string | null;
  voter_city: string | null;
  identity_number: string | null;
  identity_issuer: string | null;
  father_name: string | null;
  mother_name: string | null;
  education_level: string | null;
  civil_status: string | null;
  spouse_name: string | null;
  spouse_profession: string | null;
  spouse_retired: boolean | null;
  marriage_date: string | null;
  is_retired: boolean | null;
  employer: string | null;
  employer_phone: string | null;
  work_street: string | null;
  work_neighborhood: string | null;
  work_city: string | null;
  work_state: string | null;
  work_cep: string | null;
  work_time: string | null;
  monthly_income: string | null;
  opinion_masonry: string | null;
  expectation_masonry: string | null;
  informed_financial_values: boolean | null;
  can_afford_financial: boolean | null;
  agrees_investigation_fee: boolean | null;
  aware_no_refund: boolean | null;
  opinion_family: string | null;
  believes_supreme_being: boolean | null;
  opinion_freedom: string | null;
  opinion_equality: string | null;
  opinion_fraternity: string | null;
  sponsor_name: string | null;
  initiation_scheduled_date: string | null;
  lodges?: { id: string; name: string; city?: string | null; state?: string | null } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  proposta: { label: 'Proposta', color: 'bg-blue-500', icon: FileText },
  pending: { label: 'Proposta', color: 'bg-blue-500', icon: FileText },
  sindicancia: { label: 'Sindicância', color: 'bg-yellow-500', icon: SearchIcon },
  sindicancia_aprovada: { label: 'Sindicância Aprovada', color: 'bg-orange-500', icon: UserCheck },
  proposta_completa: { label: 'Ficha Completa Preenchida', color: 'bg-emerald-600', icon: UserCheck },
  aguardando_iniciacao: { label: 'Aguardando Iniciação', color: 'bg-purple-500', icon: Calendar },
  reprovado: { label: 'Reprovado', color: 'bg-red-500', icon: UserX },
  rejected: { label: 'Reprovado', color: 'bg-red-500', icon: UserX },
  membro: { label: 'Membro', color: 'bg-green-500', icon: UserCheck },
  approved: { label: 'Membro', color: 'bg-green-500', icon: UserCheck },
};

function useAllProposals() {
  return useQuery({
    queryKey: ['all-proposals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, lodges(*)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Profile[];
    },
  });
}

export default function AdminProposals() {
  const { user, loading, isAdmin } = useAuth();
  const { data: profiles, isLoading } = useAllProposals();
  const { data: lodges } = useLodges();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [viewProfile, setViewProfile] = useState<Profile | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [selectedLodge, setSelectedLodge] = useState<string>('');
  const [initiationDate, setInitiationDate] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('proposta');
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);
  const [editalDialogOpen, setEditalDialogOpen] = useState(false);
  const [editalProfile, setEditalProfile] = useState<Profile | null>(null);
  const [viewProfileChildren, setViewProfileChildren] = useState<{ name: string; birth_date: string }[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'list' : 'kanban'
  );

  // Inactivate and delete states
  const [candidateToDelete, setCandidateToDelete] = useState<Profile | null>(null);
  const [deletingCandidate, setDeletingCandidate] = useState(false);
  const [togglingInactivateId, setTogglingInactivateId] = useState<string | null>(null);

  // WhatsApp notification states (desligadas por padrão conforme solicitado)
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(false);
  const [customWhatsappMsg, setCustomWhatsappMsg] = useState('');
  const [messageSettingsOpen, setMessageSettingsOpen] = useState(false);
  const { templates: messageTemplates } = useProposalMessageTemplates();

  const getWhatsAppTemplate = (status: string, profile: Profile | null, dateStr?: string) => {
    if (!profile) return '';
    const key = status as ProposalStatusKey;
    const templateConfig = messageTemplates?.[key];
    const templateStr = templateConfig?.template;

    const lodgeObj = lodges?.find(l => l.id === (selectedLodge || profile.lodge_id));
    const lodgeName = lodgeObj?.name ? `${lodgeObj.name}${lodgeObj.city ? ` (${lodgeObj.city}/${lodgeObj.state})` : ''}` : '';

    if (templateStr) {
      return formatProposalMessage(templateStr, profile, {
        lodgeName,
        initiationDate: dateStr || (profile.initiation_scheduled_date ? formatDate(profile.initiation_scheduled_date) : undefined),
      });
    }

    const name = profile.full_name || 'Candidato';
    switch (status) {
      case 'sindicancia':
        return `Olá, ${name}! Sua proposta para o GOIB avançou para a etapa de Sindicância & Verificação Preliminar. A comissão iniciou a análise do seu cadastro.`;
      case 'sindicancia_aprovada':
        return `Olá, ${name}! Parabéns! Sua Sindicância foi Aprovada pela Comissão. Acesse o sistema em https://sistemamaconiconovo.vercel.app/proposta para preencher a Ficha de Proposta Completa.`;
      case 'aguardando_iniciacao':
        return `Olá, ${name}! Sua proposta foi aprovada e sua Iniciação foi agendada${dateStr ? ` para a data ${dateStr}` : ''}. Em breve a secretaria entrará em contato com mais detalhes.`;
      case 'membro':
        return `Olá, ${name}! Seja muito bem-vindo ao GOIB! Seu acesso como Membro foi liberado no sistema.`;
      case 'reprovado':
        return `Olá, ${name}. Houve uma atualização no status da sua proposta junto ao GOIB. Entre em contato com a secretaria da Loja para mais informações.`;
      default:
        return `Olá, ${name}! O status da sua proposta para o GOIB foi atualizado para "${STATUS_CONFIG[status]?.label || status}".`;
    }
  };

  const handleSelectStatus = (status: string) => {
    setNewStatus(status);
    const key = status as ProposalStatusKey;
    const isEnabled = messageTemplates?.[key]?.enabled ?? false;
    setNotifyWhatsApp(isEnabled);

    if (selectedProfile) {
      setCustomWhatsappMsg(getWhatsAppTemplate(status, selectedProfile, initiationDate));
    }
  };

  // Fetch children when viewing a profile
  const fetchChildren = async (profileId: string) => {
    const { data } = await supabase
      .from('children')
      .select('name, birth_date')
      .eq('profile_id', profileId);
    setViewProfileChildren(data || []);
  };

  const handleToggleInactivate = async (profile: Profile) => {
    const isInactive = profile.status === 'reprovado' || profile.status === 'rejected';
    const targetStatus = isInactive ? 'proposta' : 'reprovado';
    const targetMemberStatus = isInactive ? 'active' : 'inactive';

    setTogglingInactivateId(profile.id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: targetStatus,
          member_status: targetMemberStatus 
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: isInactive ? 'Candidato reativado!' : 'Candidato inativado!',
        description: isInactive
          ? `${profile.full_name} foi reativado e voltou para o fluxo de Propostas.`
          : `${profile.full_name} foi inativado e movido para a lista de Reprovados.`,
      });

      if (viewProfile?.id === profile.id) {
        setViewProfile(null);
        setViewProfileChildren([]);
      }

      await queryClient.invalidateQueries({ queryKey: ['all-proposals'] });
    } catch (error: any) {
      console.error('Error toggling inactivate:', error);
      toast({ title: 'Erro ao alterar situação', description: error.message, variant: 'destructive' });
    } finally {
      setTogglingInactivateId(null);
    }
  };

  const handleConfirmDeleteCandidate = async () => {
    if (!candidateToDelete) return;
    setDeletingCandidate(true);
    try {
      const { error: rpcError } = await supabase.rpc('delete_candidate', {
        _profile_id: candidateToDelete.id,
      });

      if (rpcError) {
        console.warn('RPC delete_candidate falhou, aplicando fallback direto:', rpcError);
        await supabase.from('children').delete().eq('profile_id', candidateToDelete.id);
        const { error: delError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', candidateToDelete.id);
        if (delError) throw delError;
      }

      toast({
        title: 'Candidato excluído!',
        description: `O cadastro de ${candidateToDelete.full_name} foi excluído permanentemente.`,
      });

      if (viewProfile?.id === candidateToDelete.id) {
        setViewProfile(null);
        setViewProfileChildren([]);
      }
      setCandidateToDelete(null);
      await queryClient.invalidateQueries({ queryKey: ['all-proposals'] });
    } catch (error: any) {
      console.error('Error deleting candidate:', error);
      toast({ title: 'Erro ao excluir candidato', description: error.message, variant: 'destructive' });
    } finally {
      setDeletingCandidate(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const filterProfiles = (status: string) => {
    if (!profiles) return [];
    
    // Map legacy statuses
    const statusMap: Record<string, string[]> = {
      proposta: ['proposta', 'pending'],
      sindicancia: ['sindicancia'],
      sindicancia_aprovada: ['sindicancia_aprovada', 'proposta_completa'],
      aguardando_iniciacao: ['aguardando_iniciacao'],
      reprovado: ['reprovado', 'rejected'],
      membro: ['membro', 'approved'],
    };
    
    return profiles.filter(p => statusMap[status]?.includes(p.status));
  };

  const handleStatusChange = async () => {
    if (!selectedProfile || !newStatus) return;

    // If changing to 'membro', need to select a lodge first
    if (newStatus === 'membro' && !selectedLodge) {
      toast({ 
        title: 'Erro', 
        description: 'Selecione uma Loja Maçônica para o novo membro.', 
        variant: 'destructive' 
      });
      return;
    }

    // If changing to 'aguardando_iniciacao', need to select date and lodge
    if (newStatus === 'aguardando_iniciacao' && (!initiationDate || !selectedLodge)) {
      toast({ 
        title: 'Erro', 
        description: 'Informe a Loja Maçônica e a data prevista para a iniciação.', 
        variant: 'destructive' 
      });
      return;
    }

    setUpdating(true);
    try {
      if (newStatus === 'membro') {
        if (!selectedProfile.email) {
          throw new Error('E-mail é obrigatório para criar acesso.');
        }

        // Se o candidato já possui conta criada no Auth
        if (selectedProfile.user_id) {
          const { error: profileUpdateErr } = await supabase
            .from('profiles')
            .update({ 
              status: 'membro', 
              lodge_id: selectedLodge,
              member_status: 'active' 
            })
            .eq('id', selectedProfile.id);

          if (profileUpdateErr) throw profileUpdateErr;

          // Atribui a role de membro em user_roles
          const { error: roleErr } = await supabase
            .from('user_roles')
            .upsert({
              user_id: selectedProfile.user_id,
              role: 'member',
            }, { onConflict: 'user_id,role', ignoreDuplicates: true });

          if (roleErr) console.warn('Aviso ao registrar user_role:', roleErr);

          toast({ 
            title: 'Membro aprovado com sucesso!',
            description: `${selectedProfile.full_name || 'Candidato'} agora é Membro ativo do GOIB.`,
          });
        } else {
          // Invoca a Edge Function para criar o usuário Auth
          const response = await supabase.functions.invoke('approve-member', {
            body: {
              profileId: selectedProfile.id,
              email: selectedProfile.email,
              cpf: selectedProfile.cpf,
              lodgeId: selectedLodge,
            },
          });

          if (response.error || response.data?.error) {
            console.warn('Edge function approve-member retornou erro, aplicando fallback:', response.error || response.data?.error);
            const { error: fallbackErr } = await supabase
              .from('profiles')
              .update({ status: 'membro', lodge_id: selectedLodge, member_status: 'active' })
              .eq('id', selectedProfile.id);
            if (fallbackErr) throw fallbackErr;
          }

          toast({ 
            title: 'Membro aprovado com sucesso!',
            description: `${selectedProfile.full_name || 'Candidato'} agora é Membro ativo do GOIB.`,
          });
        }
      } else {
        // Just update the status
        console.log('Updating status to:', newStatus, 'for profile:', selectedProfile.id);
        
        const updatePayload: Record<string, any> = { status: newStatus };
        
        // If aguardando_iniciacao, also save initiation date and selected lodge
        if (newStatus === 'aguardando_iniciacao') {
          updatePayload.initiation_scheduled_date = initiationDate;
          if (selectedLodge) {
            updatePayload.lodge_id = selectedLodge;
          }
        }
        
        const { data: updateData, error } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', selectedProfile.id)
          .select();

        console.log('Update result:', { updateData, error });

        if (error) throw error;

        toast({ 
          title: 'Status atualizado!',
          description: `Status alterado para ${STATUS_CONFIG[newStatus]?.label || newStatus}.`,
        });
      }

      // Enviar notificação WhatsApp via Whaticket se opção estiver ativa
      if (notifyWhatsApp && selectedProfile && (selectedProfile.cell_phone || selectedProfile.phone)) {
        try {
          const candidatePhone = selectedProfile.cell_phone || selectedProfile.phone;
          const targetLodge = selectedProfile.lodge_id || selectedLodge || lodges?.[0]?.id || '';
          const messageToSend = customWhatsappMsg.trim() || getWhatsAppTemplate(newStatus, selectedProfile, initiationDate);

          if (targetLodge && candidatePhone) {
            await supabase.functions.invoke('send-whatsapp', {
              body: {
                lodge_id: targetLodge,
                phone: candidatePhone,
                message: messageToSend,
                profile_id: selectedProfile.id,
                category: 'kanban_status_change',
              },
            });

            toast({
              title: 'WhatsApp Enviado!',
              description: `Notificação enviada via Whaticket para ${candidatePhone}.`,
            });
          }
        } catch (wErr: any) {
          console.warn('Erro ao enviar WhatsApp:', wErr);
        }
      }

      // Invalidar e aguardar refresh antes de fechar o dialog
      await queryClient.invalidateQueries({ queryKey: ['all-proposals'] });
      
      // Mudar para a aba do novo status
      setActiveTab(newStatus);
      
      setSelectedProfile(null);
      setNewStatus('');
      setSelectedLodge('');
      setInitiationDate('');
      setCustomWhatsappMsg('');
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.proposta;
    return (
      <Badge className={`${config.color} text-white`}>
        {config.label}
      </Badge>
    );
  };

  const ProfileCard = ({ profile }: { profile: Profile }) => (
    <Card className="card-elegant">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3 font-display">
            <Avatar className="h-12 w-12">
              <AvatarImage src={profile.photo_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {profile.full_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <span className="text-lg">{profile.full_name}</span>
              <div className="mt-1">
                {getStatusBadge(profile.status)}
              </div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {formatDate(profile.proposal_date || profile.created_at)}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {profile.email && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Mail className="h-4 w-4" />
              <span>{profile.email}</span>
            </div>
          )}
          {profile.cpf && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CreditCard className="h-4 w-4" />
              <span>CPF: {profile.cpf}</span>
            </div>
          )}
          {(profile.phone || profile.cell_phone) && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Phone className="h-4 w-4" />
              <span>{profile.cell_phone || profile.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Calendar className="h-4 w-4" />
            <span>Nasc: {formatDate(profile.birth_date)}</span>
          </div>
          {(profile.city || profile.state) && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <MapPin className="h-4 w-4" />
              <span>{[profile.city, profile.state].filter(Boolean).join(' - ')}</span>
            </div>
          )}
          {profile.lodges?.name && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Building2 className="h-4 w-4" />
              <span>{profile.lodges.name}</span>
            </div>
          )}
          {profile.status === 'aguardando_iniciacao' && profile.initiation_scheduled_date && (
            <div className="flex items-center gap-2 text-purple-600 text-sm font-medium">
              <Calendar className="h-4 w-4" />
              <span>Iniciação: {formatDate(profile.initiation_scheduled_date)}</span>
            </div>
          )}
        </div>
        
        <div className="flex gap-3 flex-wrap">
          <Button
            variant="outline"
            onClick={() => {
              setViewProfile(profile);
              fetchChildren(profile.id);
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            Ver Detalhes
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setEditalProfile(profile);
              setEditalDialogOpen(true);
            }}
            disabled={generatingPDF === profile.id}
          >
            <Printer className="mr-2 h-4 w-4" />
            {generatingPDF === profile.id ? 'Gerando...' : 'Imprimir Edital'}
          </Button>
          {profile.status === 'sindicancia' && (
            <Button
              onClick={() => navigate(`/admin/sindicancia?candidateId=${profile.id}`)}
              className="gap-2 bg-amber-500 hover:bg-amber-600 text-black font-bold"
            >
              <ShieldCheck className="h-4 w-4" /> Analisar Sindicância
            </Button>
          )}
          <Button
            onClick={() => {
              setSelectedProfile(profile);
              setNewStatus('');
              setSelectedLodge(profile.lodge_id || '');
            }}
          >
            Alterar Status
          </Button>

          <Button
            variant="outline"
            onClick={() => handleToggleInactivate(profile)}
            disabled={togglingInactivateId === profile.id}
            className={
              profile.status === 'reprovado' || profile.status === 'rejected'
                ? 'border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10'
                : 'border-amber-500/40 text-amber-600 hover:bg-amber-500/10'
            }
          >
            {profile.status === 'reprovado' || profile.status === 'rejected' ? (
              <>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reativar
              </>
            ) : (
              <>
                <UserX className="mr-2 h-4 w-4" />
                Inativar
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => setCandidateToDelete(profile)}
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const kanbanColumns = [
    { key: 'proposta', title: 'Proposta', icon: FileText, color: 'border-blue-500/50 bg-blue-500/5' },
    { key: 'sindicancia', title: 'Sindicância', icon: SearchIcon, color: 'border-yellow-500/50 bg-yellow-500/5' },
    { key: 'sindicancia_aprovada', title: 'Sind. Aprovada', icon: UserCheck, color: 'border-orange-500/50 bg-orange-500/5' },
    { key: 'aguardando_iniciacao', title: 'Aguard. Iniciação', icon: Calendar, color: 'border-purple-500/50 bg-purple-500/5' },
    { key: 'membro', title: 'Iniciado / Membro', icon: UserCheck, color: 'border-emerald-500/50 bg-emerald-500/5' },
  ];

  const tabCounts = {
    proposta: filterProfiles('proposta').length,
    sindicancia: filterProfiles('sindicancia').length,
    sindicancia_aprovada: filterProfiles('sindicancia_aprovada').length,
    aguardando_iniciacao: filterProfiles('aguardando_iniciacao').length,
    reprovado: filterProfiles('reprovado').length,
    membro: filterProfiles('membro').length,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display text-foreground">Gestão de Propostas</h1>
            <p className="text-muted-foreground font-body mt-1">
              Acompanhe e gerencie o fluxo de candidatos à iniciação
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMessageSettingsOpen(true)}
              className="gap-2 text-xs font-semibold border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
              title="Configurar os modelos de mensagens de WhatsApp para cada etapa do funil"
            >
              <MessageSquare className="h-4 w-4" />
              Configurar Mensagens
            </Button>

            <div className="flex items-center gap-1 p-1 bg-accent/40 rounded-xl border border-border">
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className="gap-2 text-xs font-semibold"
              >
                <Kanban className="h-4 w-4" />
                Quadro Kanban
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="gap-2 text-xs font-semibold"
              >
                <List className="h-4 w-4" />
                Lista por Abas
              </Button>
            </div>
          </div>
        </div>

        {/* KANBAN BOARD VIEW */}
        {viewMode === 'kanban' && (
          <div className="overflow-x-auto pb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 min-w-[1000px]">
              {kanbanColumns.map((col) => {
                const candidates = filterProfiles(col.key);
                return (
                  <div key={col.key} className={`rounded-xl border p-3 flex flex-col space-y-3 ${col.color} min-h-[500px]`}>
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-border/50">
                      <div className="flex items-center gap-2 font-display text-sm text-foreground">
                        <col.icon size={16} className="text-primary" />
                        <span>{col.title}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {candidates.length}
                      </Badge>
                    </div>

                    {/* Cards Container */}
                    <div className="flex-1 space-y-3 overflow-y-auto">
                      {candidates.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-8">
                          Nenhum candidato
                        </p>
                      ) : (
                        candidates.map((candidate) => (
                          <Card key={candidate.id} className="card-elegant hover:shadow-md transition-shadow">
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-start gap-2.5">
                                <Avatar className="h-9 w-9 border border-border">
                                  <AvatarImage src={candidate.photo_url || undefined} />
                                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                                    {candidate.full_name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-semibold text-foreground truncate">
                                    {candidate.full_name}
                                  </h4>
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    {candidate.city ? `${candidate.city}${candidate.state ? `/${candidate.state}` : ''}` : 'Oriente não inf.'}
                                  </p>
                                </div>
                              </div>

                              <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/40">
                                <span>{formatDate(candidate.proposal_date || candidate.created_at)}</span>
                                {candidate.profession && <span className="truncate max-w-[90px]">{candidate.profession}</span>}
                              </div>

                              <div className="flex items-center gap-1 pt-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setViewProfile(candidate);
                                    fetchChildren(candidate.id);
                                  }}
                                  className="h-7 px-1.5 text-[11px] flex-1 gap-1"
                                >
                                  <Eye className="h-3 w-3" /> Ver
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditalProfile(candidate);
                                    setEditalDialogOpen(true);
                                  }}
                                  disabled={generatingPDF === candidate.id}
                                  className="h-7 px-1.5 text-[11px] flex-1 gap-1 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                                >
                                  <Printer className="h-3 w-3" /> Edital
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedProfile(candidate);
                                    setNewStatus('');
                                    setSelectedLodge(candidate.lodge_id || '');
                                  }}
                                  className="h-7 px-1.5 text-[11px] flex-1 gap-1"
                                >
                                  Avançar
                                </Button>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground shrink-0"
                                      title="Mais opções"
                                    >
                                      <MoreVertical className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem
                                      onClick={() => handleToggleInactivate(candidate)}
                                      disabled={togglingInactivateId === candidate.id}
                                      className="cursor-pointer"
                                    >
                                      {candidate.status === 'reprovado' || candidate.status === 'rejected' ? (
                                        <>
                                          <RotateCcw className="mr-2 h-4 w-4 text-emerald-600" />
                                          <span>Reativar Candidato</span>
                                        </>
                                      ) : (
                                        <>
                                          <UserX className="mr-2 h-4 w-4 text-amber-600" />
                                          <span>Inativar Candidato</span>
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setCandidateToDelete(candidate)}
                                      className="text-destructive focus:text-destructive cursor-pointer"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      <span>Excluir Definitivamente</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

                              {col.key === 'sindicancia' && (
                                <Button
                                  size="sm"
                                  onClick={() => navigate(`/admin/sindicancia?candidateId=${candidate.id}`)}
                                  className="h-7 px-2 text-[11px] w-full gap-1 bg-amber-500 hover:bg-amber-600 text-black font-bold mt-1"
                                >
                                  <ShieldCheck className="h-3.5 w-3.5" /> Analisar Sindicância
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LIST BY TABS VIEW */}
        {viewMode === 'list' && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="proposta" className="flex gap-2 text-xs">
              <FileText className="h-4 w-4" />
              Propostas ({tabCounts.proposta})
            </TabsTrigger>
            <TabsTrigger value="sindicancia" className="flex gap-2 text-xs">
              <SearchIcon className="h-4 w-4" />
              Sindicância ({tabCounts.sindicancia})
            </TabsTrigger>
            <TabsTrigger value="sindicancia_aprovada" className="flex gap-2 text-xs">
              <UserCheck className="h-4 w-4" />
              Sind. Aprovada ({tabCounts.sindicancia_aprovada})
            </TabsTrigger>
            <TabsTrigger value="aguardando_iniciacao" className="flex gap-2 text-xs">
              <Calendar className="h-4 w-4" />
              Aguard. Iniciação ({tabCounts.aguardando_iniciacao})
            </TabsTrigger>
            <TabsTrigger value="reprovado" className="flex gap-2 text-xs">
              <UserX className="h-4 w-4" />
              Reprovados ({tabCounts.reprovado})
            </TabsTrigger>
            <TabsTrigger value="membro" className="flex gap-2 text-xs">
              <UserCheck className="h-4 w-4" />
              Membros ({tabCounts.membro})
            </TabsTrigger>
          </TabsList>

          {['proposta', 'sindicancia', 'sindicancia_aprovada', 'aguardando_iniciacao', 'reprovado', 'membro'].map((status) => (
            <TabsContent key={status} value={status} className="mt-6">
              {isLoading ? (
                <p className="text-muted-foreground">Carregando...</p>
              ) : filterProfiles(status).length === 0 ? (
                <Card className="card-elegant">
                  <CardContent className="py-12 text-center">
                    {(() => {
                      const Icon = STATUS_CONFIG[status]?.icon || FileText;
                      return <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />;
                    })()}
                    <p className="text-muted-foreground">
                      Nenhum registro com status "{STATUS_CONFIG[status]?.label}".
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6">
                  {filterProfiles(status).map((profile) => (
                    <ProfileCard key={profile.id} profile={profile} />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
        )}
      </div>

      {/* Change Status Dialog */}
      <Dialog open={!!selectedProfile} onOpenChange={(open) => !open && setSelectedProfile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Alterar Status</DialogTitle>
            <DialogDescription>
              Altere o status do candidato {selectedProfile?.full_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status Atual</Label>
              <div>{getStatusBadge(selectedProfile?.status || 'proposta')}</div>
            </div>

            <div className="space-y-2">
              <Label>Novo Status</Label>
              <Select value={newStatus} onValueChange={handleSelectStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o novo status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proposta">Proposta</SelectItem>
                  <SelectItem value="sindicancia">Sindicância</SelectItem>
                  <SelectItem value="sindicancia_aprovada">Sindicância Aprovada</SelectItem>
                  <SelectItem value="aguardando_iniciacao">Aguardando Iniciação</SelectItem>
                  <SelectItem value="reprovado">Reprovado</SelectItem>
                  <SelectItem value="membro">Membro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* WhatsApp Notification Box */}
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-500" />
                  <Label htmlFor="notifyWp" className="text-xs font-bold text-foreground cursor-pointer">
                    Notificar Candidato via WhatsApp (Whaticket)
                  </Label>
                </div>
                <Checkbox
                  id="notifyWp"
                  checked={notifyWhatsApp}
                  onCheckedChange={(checked) => setNotifyWhatsApp(!!checked)}
                />
              </div>

              {notifyWhatsApp && (
                <div className="space-y-1.5 pt-1">
                  <Label className="text-[11px] text-muted-foreground">Mensagem Automática (Editável):</Label>
                  <Textarea
                    rows={3}
                    value={customWhatsappMsg}
                    onChange={(e) => setCustomWhatsappMsg(e.target.value)}
                    placeholder="Digite a mensagem para o candidato..."
                    className="text-xs border-emerald-500/30 focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Send size={10} className="text-emerald-500" />
                    Destinatário: {selectedProfile?.cell_phone || selectedProfile?.phone || 'Sem telefone cadastrado'}
                  </p>
                </div>
              )}
            </div>

            {newStatus === 'aguardando_iniciacao' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Loja Maçônica de Iniciação *</Label>
                  <Select value={selectedLodge} onValueChange={setSelectedLodge}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a Loja onde será realizada a iniciação" />
                    </SelectTrigger>
                    <SelectContent>
                      {lodges?.map((lodge) => (
                        <SelectItem key={lodge.id} value={lodge.id}>
                          {lodge.name} {lodge.city ? `(${lodge.city}/${lodge.state})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Data Prevista para Iniciação *</Label>
                  <input
                    type="date"
                    value={initiationDate}
                    onChange={(e) => setInitiationDate(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p className="text-sm text-muted-foreground">
                    Esta data e o endereço do Templo da Loja selecionada serão exibidos para o candidato.
                  </p>
                </div>
              </div>
            )}

            {newStatus === 'membro' && (
              <div className="space-y-2">
                <Label>Loja Maçônica *</Label>
                <Select value={selectedLodge} onValueChange={setSelectedLodge}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a loja" />
                  </SelectTrigger>
                  <SelectContent>
                    {lodges?.map((lodge) => (
                      <SelectItem key={lodge.id} value={lodge.id}>
                        {lodge.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedProfile?.email ? (
                  <p className="text-sm text-muted-foreground">
                    Um e-mail de redefinição de senha será enviado para: {selectedProfile.email}
                  </p>
                ) : (
                  <p className="text-sm text-destructive">
                    Este candidato não possui e-mail cadastrado. Não será possível criar acesso.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedProfile(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleStatusChange}
              disabled={
                updating || 
                !newStatus || 
                (newStatus === 'membro' && (!selectedProfile?.email || !selectedLodge)) || 
                (newStatus === 'aguardando_iniciacao' && (!initiationDate || !selectedLodge))
              }
            >
              {updating ? 'Atualizando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={!!viewProfile} onOpenChange={(open) => {
        if (!open) {
          setViewProfile(null);
          setViewProfileChildren([]);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={viewProfile?.photo_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {viewProfile?.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <span className="text-xl">{viewProfile?.full_name}</span>
                <div className="mt-1 flex items-center gap-2">
                  {viewProfile && getStatusBadge(viewProfile.status)}
                  <span className="text-sm text-muted-foreground font-normal">
                    Proposta em {formatDate(viewProfile?.proposal_date || viewProfile?.created_at || '')}
                  </span>
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {viewProfile && (
            <div className="space-y-6 py-4">
              {/* Dados Pessoais */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground border-b pb-2">Dados Pessoais</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">E-mail</Label>
                    <p className="text-sm">{viewProfile.email || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">CPF</Label>
                    <p className="text-sm">{viewProfile.cpf || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Data de Nascimento</Label>
                    <p className="text-sm">{formatDate(viewProfile.birth_date)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Naturalidade</Label>
                    <p className="text-sm">{viewProfile.naturality || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Nacionalidade</Label>
                    <p className="text-sm">{viewProfile.nationality || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Telefone Fixo</Label>
                    <p className="text-sm">{viewProfile.phone || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Celular</Label>
                    <p className="text-sm">{viewProfile.cell_phone || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">RG</Label>
                    <p className="text-sm">{viewProfile.identity_number || '-'} {viewProfile.identity_issuer ? `(${viewProfile.identity_issuer})` : ''}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Título de Eleitor</Label>
                    <p className="text-sm">{viewProfile.voter_title || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Zona Eleitoral</Label>
                    <p className="text-sm">{viewProfile.voter_zone || '-'} {viewProfile.voter_city ? `- ${viewProfile.voter_city}` : ''}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Escolaridade</Label>
                    <p className="text-sm">{viewProfile.education_level || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Endereço Residencial */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground border-b pb-2">Endereço Residencial</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">CEP</Label>
                    <p className="text-sm">{viewProfile.cep || '-'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-muted-foreground text-xs">Logradouro</Label>
                    <p className="text-sm">{viewProfile.street || '-'}{viewProfile.number ? `, ${viewProfile.number}` : ''}{viewProfile.complement ? ` - ${viewProfile.complement}` : ''}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Bairro</Label>
                    <p className="text-sm">{viewProfile.neighborhood || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Cidade/UF</Label>
                    <p className="text-sm">{[viewProfile.city, viewProfile.state].filter(Boolean).join(' - ') || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Tempo de Residência</Label>
                    <p className="text-sm">{viewProfile.residence_time || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Filiação */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground border-b pb-2">Filiação</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Nome do Pai</Label>
                    <p className="text-sm">{viewProfile.father_name || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Nome da Mãe</Label>
                    <p className="text-sm">{viewProfile.mother_name || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Estado Civil e Família */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground border-b pb-2">Estado Civil e Família</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Estado Civil</Label>
                    <p className="text-sm">{viewProfile.civil_status || '-'}</p>
                  </div>
                  {viewProfile.marriage_date && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Data de Casamento</Label>
                      <p className="text-sm">{formatDate(viewProfile.marriage_date)}</p>
                    </div>
                  )}
                  {viewProfile.spouse_name && (
                    <>
                      <div>
                        <Label className="text-muted-foreground text-xs">Nome do Cônjuge</Label>
                        <p className="text-sm">{viewProfile.spouse_name}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Profissão do Cônjuge</Label>
                        <p className="text-sm">{viewProfile.spouse_profession || '-'} {viewProfile.spouse_retired ? '(Aposentado(a))' : ''}</p>
                      </div>
                    </>
                  )}
                </div>
                {viewProfileChildren.length > 0 && (
                  <div className="mt-3">
                    <Label className="text-muted-foreground text-xs">Filhos</Label>
                    <div className="mt-1 space-y-1">
                      {viewProfileChildren.map((child, index) => (
                        <p key={index} className="text-sm">
                          {child.name} - Nascimento: {formatDate(child.birth_date)}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Dados Profissionais */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground border-b pb-2">Dados Profissionais</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Profissão</Label>
                    <p className="text-sm">{viewProfile.profession || '-'} {viewProfile.is_retired ? '(Aposentado)' : ''}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Empregador</Label>
                    <p className="text-sm">{viewProfile.employer || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Telefone do Trabalho</Label>
                    <p className="text-sm">{viewProfile.employer_phone || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Tempo na Empresa</Label>
                    <p className="text-sm">{viewProfile.work_time || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Renda Mensal</Label>
                    <p className="text-sm">{viewProfile.monthly_income || '-'}</p>
                  </div>
                </div>
                {(viewProfile.work_street || viewProfile.work_city) && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                    <div>
                      <Label className="text-muted-foreground text-xs">CEP do Trabalho</Label>
                      <p className="text-sm">{viewProfile.work_cep || '-'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-muted-foreground text-xs">Endereço do Trabalho</Label>
                      <p className="text-sm">{viewProfile.work_street || '-'}, {viewProfile.work_neighborhood || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Cidade/UF do Trabalho</Label>
                      <p className="text-sm">{[viewProfile.work_city, viewProfile.work_state].filter(Boolean).join(' - ') || '-'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Questionário Maçônico */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground border-b pb-2">Questionário Maçônico</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">O que pensa sobre a Maçonaria?</Label>
                    <p className="text-sm whitespace-pre-wrap">{viewProfile.opinion_masonry || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">O que espera da Maçonaria?</Label>
                    <p className="text-sm whitespace-pre-wrap">{viewProfile.expectation_masonry || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">O que sua família pensa sobre a sua decisão?</Label>
                    <p className="text-sm whitespace-pre-wrap">{viewProfile.opinion_family || '-'}</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Crê em um Ser Supremo?</Label>
                      <p className="text-sm">{viewProfile.believes_supreme_being ? 'Sim' : 'Não'}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">O que pensa sobre Liberdade?</Label>
                    <p className="text-sm whitespace-pre-wrap">{viewProfile.opinion_freedom || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">O que pensa sobre Igualdade?</Label>
                    <p className="text-sm whitespace-pre-wrap">{viewProfile.opinion_equality || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">O que pensa sobre Fraternidade?</Label>
                    <p className="text-sm whitespace-pre-wrap">{viewProfile.opinion_fraternity || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Informações Financeiras */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground border-b pb-2">Declarações Financeiras</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Foi informado dos valores?</Label>
                    <p className="text-sm">{viewProfile.informed_financial_values ? 'Sim' : 'Não'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Pode arcar com os custos?</Label>
                    <p className="text-sm">{viewProfile.can_afford_financial ? 'Sim' : 'Não'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Concorda com taxa de sindicância?</Label>
                    <p className="text-sm">{viewProfile.agrees_investigation_fee ? 'Sim' : 'Não'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Ciente da não devolução?</Label>
                    <p className="text-sm">{viewProfile.aware_no_refund ? 'Sim' : 'Não'}</p>
                  </div>
                </div>
              </div>

              {/* Padrinho */}
              {viewProfile.sponsor_name && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground border-b pb-2">Indicação</h3>
                  <div>
                    <Label className="text-muted-foreground text-xs">Nome do Padrinho/Indicador</Label>
                    <p className="text-sm">{viewProfile.sponsor_name}</p>
                  </div>
                </div>
              )}

              {/* Loja */}
              {viewProfile.lodges?.name && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground border-b pb-2">Loja Maçônica</h3>
                  <div>
                    <Label className="text-muted-foreground text-xs">Loja</Label>
                    <p className="text-sm">{viewProfile.lodges.name} {viewProfile.lodges.city ? `- ${viewProfile.lodges.city}/${viewProfile.lodges.state}` : ''}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2 flex-wrap sm:flex-row justify-between w-full">
            <div className="flex gap-2 flex-wrap">
              {viewProfile && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleToggleInactivate(viewProfile)}
                    disabled={togglingInactivateId === viewProfile.id}
                    className={
                      viewProfile.status === 'reprovado' || viewProfile.status === 'rejected'
                        ? 'border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10'
                        : 'border-amber-500/40 text-amber-600 hover:bg-amber-500/10'
                    }
                  >
                    {viewProfile.status === 'reprovado' || viewProfile.status === 'rejected' ? (
                      <>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reativar Candidato
                      </>
                    ) : (
                      <>
                        <UserX className="mr-2 h-4 w-4" />
                        Inativar Candidato
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCandidateToDelete(viewProfile)}
                    className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir Candidato
                  </Button>
                </>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => {
                setViewProfile(null);
                setViewProfileChildren([]);
              }}>
                Fechar
              </Button>
              {viewProfile && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditalProfile(viewProfile);
                    setEditalDialogOpen(true);
                  }}
                  disabled={generatingPDF === viewProfile.id}
                  className="border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir Edital
                </Button>
              )}
              <Button onClick={() => {
                const cur = viewProfile;
                setViewProfile(null);
                setViewProfileChildren([]);
                if (cur) {
                  setSelectedProfile(cur);
                  setNewStatus('');
                  setSelectedLodge(cur.lodge_id || '');
                }
              }}>
                Alterar Status
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edital Form Dialog */}
      <EditalFormDialog
        open={editalDialogOpen}
        onOpenChange={setEditalDialogOpen}
        profileName={editalProfile?.full_name || ''}
        lodgeName={editalProfile?.lodges?.name}
        lodgeCity={editalProfile?.lodges?.city}
        lodgeState={editalProfile?.lodges?.state}
        isGenerating={!!generatingPDF}
        onGenerate={async (formData: EditalFormData) => {
          if (!editalProfile) return;
          setGeneratingPDF(editalProfile.id);
          try {
            // Fetch children for this profile
            const { data: children } = await supabase
              .from('children')
              .select('name, birth_date')
              .eq('profile_id', editalProfile.id);
            
            await generateEditalPDF(
              editalProfile,
              children || [],
              editalProfile.lodges,
              formData
            );
            toast({ title: 'PDF gerado com sucesso!' });
            setEditalDialogOpen(false);
          } catch (error: any) {
            console.error('Error generating PDF:', error);
            toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
          } finally {
            setGeneratingPDF(null);
          }
        }}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!candidateToDelete} onOpenChange={(open) => !open && setCandidateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Excluir Candidato Definitivamente?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>
                Tem certeza que deseja excluir o cadastro de <strong>{candidateToDelete?.full_name}</strong>?
              </span>
              <span className="block text-xs text-muted-foreground pt-1">
                Esta ação é irreversível. Todos os dados da proposta, questionários e informações associadas serão permanentemente removidos.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingCandidate}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDeleteCandidate();
              }}
              disabled={deletingCandidate}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
            >
              {deletingCandidate ? 'Excluindo...' : 'Sim, Excluir Definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Configuração de Mensagens de Disparo */}
      <ProposalMessageSettingsDialog
        open={messageSettingsOpen}
        onOpenChange={setMessageSettingsOpen}
      />
    </AppLayout>
  );
}
