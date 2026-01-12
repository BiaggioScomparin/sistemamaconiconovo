import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProfile } from '@/hooks/useProfile';
import { useDashboardStats } from '@/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, UserCheck, Cake } from 'lucide-react';

export default function Dashboard() {
  const { user, loading, isAdmin } = useAuth();
  const { data: profile } = useProfile();
  const { data: stats } = useDashboardStats();

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

        {!isAdmin && profile?.status === 'pending' && (
          <Card className="card-elegant border-amber-500">
            <CardContent className="pt-6">
              <p className="text-amber-600 font-body">
                Seu cadastro está aguardando aprovação de um administrador.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
