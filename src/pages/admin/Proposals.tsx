import { useState } from 'react';
import { Navigate } from 'react-router-dom';
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
  Printer
} from 'lucide-react';
import { generateEditalPDF } from '@/lib/generateEditalPDF';
import { EditalFormDialog, EditalFormData } from '@/components/admin/EditalFormDialog';

type ProfileStatus = 'proposta' | 'sindicancia' | 'reprovado' | 'membro' | 'pending' | 'approved' | 'rejected';

interface Profile {
  id: string;
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
  lodges?: { id: string; name: string; city?: string | null; state?: string | null } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  proposta: { label: 'Proposta', color: 'bg-blue-500', icon: FileText },
  pending: { label: 'Proposta', color: 'bg-blue-500', icon: FileText },
  sindicancia: { label: 'Sindicância', color: 'bg-yellow-500', icon: SearchIcon },
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
  
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [viewProfile, setViewProfile] = useState<Profile | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [selectedLodge, setSelectedLodge] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('proposta');
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);
  const [editalDialogOpen, setEditalDialogOpen] = useState(false);
  const [editalProfile, setEditalProfile] = useState<Profile | null>(null);
  const [viewProfileChildren, setViewProfileChildren] = useState<{ name: string; birth_date: string }[]>([]);

  // Fetch children when viewing a profile
  const fetchChildren = async (profileId: string) => {
    const { data } = await supabase
      .from('children')
      .select('name, birth_date')
      .eq('profile_id', profileId);
    setViewProfileChildren(data || []);
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

    setUpdating(true);
    try {
      if (newStatus === 'membro') {
        // Use the approve-member edge function
        if (!selectedProfile.email) {
          throw new Error('E-mail é obrigatório para criar acesso.');
        }

        const response = await supabase.functions.invoke('approve-member', {
          body: {
            profileId: selectedProfile.id,
            email: selectedProfile.email,
            cpf: selectedProfile.cpf,
            lodgeId: selectedLodge,
          },
        });

        if (response.error) throw new Error(response.error.message);
        if (response.data?.error) throw new Error(response.data.error);

        // Also update the status to 'membro'
        await supabase
          .from('profiles')
          .update({ status: 'membro', lodge_id: selectedLodge })
          .eq('id', selectedProfile.id);

        toast({ 
          title: 'Membro aprovado!',
          description: 'Um e-mail de redefinição de senha foi enviado ao novo membro.',
        });
      } else {
        // Just update the status
        console.log('Updating status to:', newStatus, 'for profile:', selectedProfile.id);
        
        const { data: updateData, error } = await supabase
          .from('profiles')
          .update({ status: newStatus })
          .eq('id', selectedProfile.id)
          .select();

        console.log('Update result:', { updateData, error });

        if (error) throw error;

        toast({ 
          title: 'Status atualizado!',
          description: `Status alterado para ${STATUS_CONFIG[newStatus]?.label || newStatus}.`,
        });
      }

      // Invalidar e aguardar refresh antes de fechar o dialog
      await queryClient.invalidateQueries({ queryKey: ['all-proposals'] });
      
      // Mudar para a aba do novo status
      setActiveTab(newStatus);
      
      setSelectedProfile(null);
      setNewStatus('');
      setSelectedLodge('');
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
          <Button
            onClick={() => {
              setSelectedProfile(profile);
              setNewStatus('');
              setSelectedLodge(profile.lodge_id || '');
            }}
          >
            Alterar Status
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const tabCounts = {
    proposta: filterProfiles('proposta').length,
    sindicancia: filterProfiles('sindicancia').length,
    reprovado: filterProfiles('reprovado').length,
    membro: filterProfiles('membro').length,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display text-foreground">Gestão de Propostas</h1>
          <p className="text-muted-foreground font-body mt-1">
            Gerencie propostas de filiação e altere status dos candidatos
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="proposta" className="flex gap-2">
              <FileText className="h-4 w-4" />
              Propostas ({tabCounts.proposta})
            </TabsTrigger>
            <TabsTrigger value="sindicancia" className="flex gap-2">
              <SearchIcon className="h-4 w-4" />
              Sindicância ({tabCounts.sindicancia})
            </TabsTrigger>
            <TabsTrigger value="reprovado" className="flex gap-2">
              <UserX className="h-4 w-4" />
              Reprovados ({tabCounts.reprovado})
            </TabsTrigger>
            <TabsTrigger value="membro" className="flex gap-2">
              <UserCheck className="h-4 w-4" />
              Membros ({tabCounts.membro})
            </TabsTrigger>
          </TabsList>

          {['proposta', 'sindicancia', 'reprovado', 'membro'].map((status) => (
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
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o novo status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proposta">Proposta</SelectItem>
                  <SelectItem value="sindicancia">Sindicância</SelectItem>
                  <SelectItem value="reprovado">Reprovado</SelectItem>
                  <SelectItem value="membro">Membro</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
              disabled={updating || !newStatus || (newStatus === 'membro' && !selectedProfile?.email)}
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

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setViewProfile(null);
              setViewProfileChildren([]);
            }}>
              Fechar
            </Button>
            <Button onClick={() => {
              setViewProfile(null);
              setViewProfileChildren([]);
              if (viewProfile) {
                setSelectedProfile(viewProfile);
                setNewStatus('');
                setSelectedLodge(viewProfile.lodge_id || '');
              }
            }}>
              Alterar Status
            </Button>
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
    </AppLayout>
  );
}
