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
  Eye
} from 'lucide-react';

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
  lodges?: { id: string; name: string } | null;
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
        const { error } = await supabase
          .from('profiles')
          .update({ status: newStatus })
          .eq('id', selectedProfile.id);

        if (error) throw error;

        toast({ 
          title: 'Status atualizado!',
          description: `Status alterado para ${STATUS_CONFIG[newStatus]?.label || newStatus}.`,
        });
      }

      setSelectedProfile(null);
      setNewStatus('');
      setSelectedLodge('');
      queryClient.invalidateQueries({ queryKey: ['all-proposals'] });
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
            onClick={() => setViewProfile(profile)}
          >
            <Eye className="mr-2 h-4 w-4" />
            Ver Detalhes
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
      <Dialog open={!!viewProfile} onOpenChange={(open) => !open && setViewProfile(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={viewProfile?.photo_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {viewProfile?.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {viewProfile?.full_name}
            </DialogTitle>
          </DialogHeader>
          
          {viewProfile && (
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-2">
                {getStatusBadge(viewProfile.status)}
                <span className="text-sm text-muted-foreground">
                  Cadastrado em {formatDate(viewProfile.created_at)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">E-mail</Label>
                  <p>{viewProfile.email || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">CPF</Label>
                  <p>{viewProfile.cpf || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Telefone</Label>
                  <p>{viewProfile.phone || viewProfile.cell_phone || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data de Nascimento</Label>
                  <p>{formatDate(viewProfile.birth_date)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Cidade/Estado</Label>
                  <p>{[viewProfile.city, viewProfile.state].filter(Boolean).join(' - ') || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Profissão</Label>
                  <p>{viewProfile.profession || '-'}</p>
                </div>
                {viewProfile.lodges?.name && (
                  <div>
                    <Label className="text-muted-foreground">Loja</Label>
                    <p>{viewProfile.lodges.name}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewProfile(null)}>
              Fechar
            </Button>
            <Button onClick={() => {
              setViewProfile(null);
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
    </AppLayout>
  );
}
