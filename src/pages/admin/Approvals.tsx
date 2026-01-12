import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { usePendingProfiles } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UserCheck, Check, X, Calendar, MapPin, Building2, CreditCard, Mail } from 'lucide-react';
import { Profile } from '@/lib/supabase-types';

export default function AdminApprovals() {
  const { user, loading, isAdmin } = useAuth();
  const { data: profiles, isLoading } = usePendingProfiles();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [approving, setApproving] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

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

  const handleApproveClick = (profile: Profile) => {
    setSelectedProfile(profile);
  };

  const handleApprove = async () => {
    if (!selectedProfile) return;

    const cpf = selectedProfile.cpf;
    const email = selectedProfile.email;

    if (!cpf) {
      toast({ 
        title: 'Erro', 
        description: 'CPF é obrigatório para aprovação.', 
        variant: 'destructive' 
      });
      return;
    }

    if (!email) {
      toast({ 
        title: 'Erro', 
        description: 'E-mail é obrigatório para aprovação.', 
        variant: 'destructive' 
      });
      return;
    }

    setApproving(true);
    try {
      const response = await supabase.functions.invoke('approve-member', {
        body: {
          profileId: selectedProfile.id,
          email,
          cpf,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({ 
        title: 'Membro aprovado com sucesso!',
        description: `Senha provisória: CPF sem pontuação (${cpf.replace(/\D/g, '')})`,
      });
      setSelectedProfile(null);
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] });
    } catch (error: any) {
      console.error('Approval error:', error);
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (profileId: string) => {
    if (!confirm('Tem certeza que deseja rejeitar este cadastro?')) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'rejected' })
        .eq('id', profileId);

      if (error) throw error;

      toast({ title: 'Cadastro rejeitado.' });
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const canApprove = (profile: Profile) => {
    return profile.cpf && profile.email;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display text-foreground">Aprovações Pendentes</h1>
          <p className="text-muted-foreground font-body mt-1">Revise e aprove novos cadastros</p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : profiles?.length === 0 ? (
          <Card className="card-elegant">
            <CardContent className="py-12 text-center">
              <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum cadastro pendente de aprovação.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {profiles?.map((profile) => (
              <Card key={profile.id} className="card-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 font-display">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={profile.photo_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                        {profile.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {profile.full_name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {profile.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{profile.email}</span>
                      </div>
                    )}
                    {profile.cpf && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CreditCard className="h-4 w-4" />
                        <span>CPF: {profile.cpf}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Nascimento: {formatDate(profile.birth_date)}</span>
                    </div>
                    {profile.initiation_date && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Iniciação: {formatDate(profile.initiation_date)}</span>
                      </div>
                    )}
                    {profile.cim_number && (
                      <div className="text-muted-foreground">
                        <span className="font-medium">CIM:</span> {profile.cim_number}
                      </div>
                    )}
                    {profile.lodge?.name && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <span>{profile.lodge.name}</span>
                      </div>
                    )}
                    {(profile.city || profile.state) && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{[profile.city, profile.state].filter(Boolean).join(' - ')}</span>
                      </div>
                    )}
                    {profile.mother_name && (
                      <div className="text-muted-foreground">
                        <span className="font-medium">Mãe:</span> {profile.mother_name}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-3 flex-wrap">
                    <Button
                      onClick={() => handleApproveClick(profile)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={!canApprove(profile)}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Aprovar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleReject(profile.id)}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Rejeitar
                    </Button>
                    {!canApprove(profile) && (
                      <span className="text-sm text-amber-600 flex items-center">
                        {!profile.cpf && !profile.email 
                          ? 'CPF e E-mail não informados'
                          : !profile.cpf 
                            ? 'CPF não informado' 
                            : 'E-mail não informado'}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Approval Confirmation Dialog */}
      <Dialog open={!!selectedProfile} onOpenChange={(open) => !open && setSelectedProfile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Confirmar Aprovação</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={selectedProfile?.full_name || ''} disabled />
            </div>
            
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={selectedProfile?.email || ''} disabled />
            </div>
            
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input value={selectedProfile?.cpf || ''} disabled />
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium">Senha provisória:</p>
              <p className="text-lg font-mono">
                {selectedProfile?.cpf?.replace(/\D/g, '') || ''}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                O membro deve alterar a senha no primeiro acesso
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedProfile(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approving}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {approving ? 'Aprovando...' : 'Confirmar Aprovação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
