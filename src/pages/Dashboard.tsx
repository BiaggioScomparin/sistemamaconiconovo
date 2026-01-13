import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProfile } from '@/hooks/useProfile';
import { useDashboardStats } from '@/hooks/useAdmin';
import { useLodgeMembers, useLodgePositions } from '@/hooks/useLodgeMembers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Building2, UserCheck, Cake, Crown, Shield } from 'lucide-react';

// Ordem de prioridade dos cargos para exibição
const POSITION_ORDER = [
  'Venerável Mestre',
  'Primeiro Vigilante',
  'Segundo Vigilante',
  'Orador',
  'Secretário',
  'Tesoureiro',
  'Mestre de Cerimônias',
  'Primeiro Diácono',
  'Segundo Diácono',
  'Primeiro Experto',
  'Segundo Experto',
  'Cobridor Interno',
  'Cobridor Externo',
  'Porta Bandeira',
  'Porta Estandarte',
  'Porta Espada',
  'Mestre de Banquetes',
  'Mestre de Harmonia',
];

function getPositionOrder(position: string | null): number {
  if (!position) return 999;
  const index = POSITION_ORDER.indexOf(position);
  return index === -1 ? 998 : index;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Dashboard() {
  const { user, loading, isAdmin } = useAuth();
  const { data: profile } = useProfile();
  const { data: stats } = useDashboardStats();
  const { data: lodgeMembers = [] } = useLodgeMembers(profile?.lodge_id);
  const { data: lodgePositions = [] } = useLodgePositions(profile?.lodge_id);

  // Ordenar por cargo
  const sortedPositions = [...lodgePositions].sort(
    (a, b) => getPositionOrder(a.lodge_position) - getPositionOrder(b.lodge_position)
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display text-foreground">
            {isAdmin ? 'Dashboard' : 'Bem-vindo!'}
          </h1>
          <p className="text-muted-foreground font-body mt-1">
            {isAdmin ? 'Visão geral do sistema' : `Olá, ${profile?.full_name || user.email}`}
          </p>
        </div>

        {/* Admin Stats */}
        {isAdmin && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="card-elegant">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-body text-muted-foreground">
                  Total de Membros
                </CardTitle>
                <Users className="h-5 w-5 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-display text-foreground">
                  {stats.totalMembers}
                </div>
              </CardContent>
            </Card>

            <Card className="card-elegant">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-body text-muted-foreground">
                  Lojas Cadastradas
                </CardTitle>
                <Building2 className="h-5 w-5 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-display text-foreground">
                  {stats.totalLodges}
                </div>
              </CardContent>
            </Card>

            <Card className="card-elegant">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-body text-muted-foreground">
                  Pendentes
                </CardTitle>
                <UserCheck className="h-5 w-5 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-display text-foreground">
                  {stats.pendingApprovals}
                </div>
              </CardContent>
            </Card>

            <Card className="card-elegant">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-body text-muted-foreground">
                  Aniversários do Mês
                </CardTitle>
                <Cake className="h-5 w-5 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-display text-foreground">
                  {stats.birthdaysThisMonth.length}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Member View - Lodge Info */}
        {!isAdmin && profile?.status !== 'pending' && profile?.lodge_id && (
          <div className="space-y-6">
            {/* Lodge Info Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="card-elegant">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-body text-muted-foreground">
                    Sua Loja
                  </CardTitle>
                  <Building2 className="h-5 w-5 text-secondary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-display text-foreground">
                    {(profile as any).lodges?.name || 'Loja não encontrada'}
                  </div>
                  {(profile as any).lodges?.city && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {(profile as any).lodges.city}
                      {(profile as any).lodges.state && ` - ${(profile as any).lodges.state}`}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="card-elegant">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-body text-muted-foreground">
                    Membros da Loja
                  </CardTitle>
                  <Users className="h-5 w-5 text-secondary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-display text-foreground">
                    {lodgeMembers.length}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    membros ativos
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Lodge Positions */}
            <Card className="card-elegant">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-display text-foreground">
                  <Crown className="h-5 w-5 text-secondary" />
                  Oficiais da Loja
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sortedPositions.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedPositions.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border"
                      >
                        <Avatar className="h-12 w-12 border-2 border-secondary/30">
                          <AvatarImage src={member.photo_url || ''} alt={member.full_name} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                            {getInitials(member.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {member.full_name}
                          </p>
                          <p className="text-sm text-secondary font-medium">
                            {member.lodge_position}
                          </p>
                          {member.degree && (
                            <p className="text-xs text-muted-foreground">
                              {member.degree}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum cargo de loja cadastrado ainda.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pending Status Message */}
        {!isAdmin && profile?.status === 'pending' && (
          <Card className="card-elegant border-amber-500">
            <CardContent className="pt-6">
              <p className="text-amber-600 font-body">
                Seu cadastro está aguardando aprovação de um administrador.
              </p>
            </CardContent>
          </Card>
        )}

        {/* No Lodge Message */}
        {!isAdmin && profile?.status !== 'pending' && !profile?.lodge_id && (
          <Card className="card-elegant">
            <CardContent className="pt-6 text-center">
              <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground font-body">
                Você ainda não está vinculado a nenhuma loja.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
