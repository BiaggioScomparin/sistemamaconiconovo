import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { usePendingProfiles, useUpdateProfileStatus } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { UserCheck, Check, X, Calendar, MapPin, Building2 } from 'lucide-react';

export default function AdminApprovals() {
  const { user, loading, isAdmin } = useAuth();
  const { data: profiles, isLoading } = usePendingProfiles();
  const updateStatus = useUpdateProfileStatus();
  const { toast } = useToast();

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

  const handleApprove = async (profileId: string) => {
    try {
      await updateStatus.mutateAsync({ profileId, status: 'approved' });
      toast({ title: 'Membro aprovado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleReject = async (profileId: string) => {
    if (!confirm('Tem certeza que deseja rejeitar este cadastro?')) return;
    
    try {
      await updateStatus.mutateAsync({ profileId, status: 'rejected' });
      toast({ title: 'Cadastro rejeitado.' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
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
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleApprove(profile.id)}
                      className="bg-green-600 hover:bg-green-700 text-white"
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
