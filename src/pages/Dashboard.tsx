import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProfile } from '@/hooks/useProfile';
import { useDashboardStats } from '@/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Building2, Cake, ShieldAlert, FileText, Mail, DollarSign, Calendar, ClipboardList, ArrowUpRight, BarChart3, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const DEGREE_COLORS: Record<string, string> = {
  'Aprendiz': '#3b82f6',
  'Companheiro': '#eab308',
  'Mestre': '#ef4444',
  'Mestre Instalado': '#a855f7',
};

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

  const degreeChartData = stats?.membersByDegree
    ? Object.entries(stats.membersByDegree)
        .filter(([_, count]) => count > 0)
        .map(([name, value]) => ({ name, value }))
    : [];

  const quickActions = [
    { title: 'Convidar Irmão', description: 'Enviar convite de cadastro', href: '/admin/invites', icon: Mail, color: 'text-blue-500 bg-blue-500/10' },
    { title: 'Gerenciar Propostas', description: 'Candidatos em análise', href: '/admin/proposals', icon: FileText, color: 'text-amber-500 bg-amber-500/10' },
    { title: 'Aprovações Pendentes', description: 'Novos cadastros de usuários', href: '/admin/approvals', icon: ShieldAlert, color: 'text-purple-500 bg-purple-500/10' },
    { title: 'Tesouraria & Finanças', description: 'Controle de mensalidades', href: '/admin/financeiro', icon: DollarSign, color: 'text-emerald-500 bg-emerald-500/10' },
    { title: 'Atas de Sessão', description: 'Livro de atas e registros', href: '/admin/minutes', icon: ClipboardList, color: 'text-indigo-500 bg-indigo-500/10' },
    { title: 'Calendário de Sessões', description: 'Agendamento de trabalhos', href: '/admin/calendar', icon: Calendar, color: 'text-rose-500 bg-rose-500/10' },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display text-foreground">
            {isAdmin ? 'Dashboard Administrativo' : 'Bem-vindo!'}
          </h1>
          <p className="text-muted-foreground font-body mt-1">
            {isAdmin ? 'Visão geral do sistema e gestão da Loja' : `Olá, ${profile?.full_name || user.email}`}
          </p>
        </div>

        {isAdmin && stats && (
          <>
            {/* KPI CARDS GRID - 2 columns on mobile */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <Link to="/admin/members">
                <Card className="card-elegant hover:border-primary/50 transition-all hover:shadow-md cursor-pointer group h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-3 sm:p-6">
                    <CardTitle className="text-xs sm:text-sm font-body text-muted-foreground group-hover:text-primary transition-colors">
                      Membros Ativos
                    </CardTitle>
                    <div className="p-1.5 sm:p-2.5 rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform shrink-0">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                    <div className="text-2xl sm:text-3xl font-display text-foreground">
                      {stats.totalMembers}
                    </div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 flex items-center gap-0.5 sm:gap-1">
                      Ver cadastro <ArrowUpRight size={12} />
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/admin/approvals">
                <Card className="card-elegant hover:border-amber-500/50 transition-all hover:shadow-md cursor-pointer group h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-3 sm:p-6">
                    <CardTitle className="text-xs sm:text-sm font-body text-muted-foreground group-hover:text-amber-500 transition-colors">
                      Aprovações
                    </CardTitle>
                    <div className="p-1.5 sm:p-2.5 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform shrink-0">
                      <ShieldAlert className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                    <div className="text-2xl sm:text-3xl font-display text-foreground">
                      {stats.pendingApprovals}
                    </div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 flex items-center gap-0.5 sm:gap-1">
                      Validação <ArrowUpRight size={12} />
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/admin/lodges">
                <Card className="card-elegant hover:border-purple-500/50 transition-all hover:shadow-md cursor-pointer group h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-3 sm:p-6">
                    <CardTitle className="text-xs sm:text-sm font-body text-muted-foreground group-hover:text-purple-500 transition-colors">
                      Lojas
                    </CardTitle>
                    <div className="p-1.5 sm:p-2.5 rounded-xl bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform shrink-0">
                      <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                    <div className="text-2xl sm:text-3xl font-display text-foreground">
                      {stats.totalLodges}
                    </div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 flex items-center gap-0.5 sm:gap-1">
                      Gerenciar <ArrowUpRight size={12} />
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Card className="card-elegant h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-3 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-body text-muted-foreground">
                    Aniversários
                  </CardTitle>
                  <div className="p-1.5 sm:p-2.5 rounded-xl bg-rose-500/10 text-rose-500 shrink-0">
                    <Cake className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <div className="text-2xl sm:text-3xl font-display text-foreground">
                    {stats.birthdaysThisMonth.length}
                  </div>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                    No mês
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* QUICK ACTIONS GRID */}
            <div className="space-y-4">
              <h2 className="text-xl font-display text-foreground">Atalhos Rápidos de Gestão</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {quickActions.map((action, idx) => (
                  <Link key={idx} to={action.href}>
                    <Card className="card-elegant hover:border-primary/40 hover:bg-accent/40 transition-all cursor-pointer group h-full">
                      <CardContent className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${action.color} group-hover:scale-105 transition-transform`}>
                            <action.icon className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {action.title}
                            </h3>
                            <p className="text-xs text-muted-foreground font-body">
                              {action.description}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>

            {/* Degree Distribution Chart */}
            {degreeChartData.length > 0 && (
              <Card className="card-elegant">
                <CardHeader>
                  <CardTitle className="text-lg font-display">
                    Membros Ativos por Grau
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={degreeChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value, percent }) => 
                            `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                          }
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {degreeChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={DEGREE_COLORS[entry.name] || '#888888'} 
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
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
