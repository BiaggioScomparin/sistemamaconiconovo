import { AppLayout } from '@/components/layout/AppLayout';
import { useDashboardReports } from '@/hooks/useDashboardReports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MapPin, Calendar, TrendingUp, DollarSign, GraduationCap } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from 'recharts';

const COLORS = ['#3b82f6', '#ef4444', '#eab308', '#22c55e', '#a855f7', '#f97316', '#06b6d4', '#ec4899'];

const DEGREE_COLORS: Record<string, string> = {
  'Aprendiz': '#3b82f6',
  'Companheiro': '#eab308',
  'Mestre': '#ef4444',
  'Mestre Instalado': '#a855f7',
};

export default function Reports() {
  const { data, isLoading } = useDashboardReports();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando relatórios...</p>
        </div>
      </AppLayout>
    );
  }

  if (!data) return null;

  const degreeData = Object.entries(data.degreeCounts)
    .filter(([_, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  const statusData = Object.entries(data.statusCounts)
    .map(([name, value]) => ({
      name: name === 'active' ? 'Ativo' : name === 'inactive' ? 'Inativo' : name === 'suspended' ? 'Suspenso' : name,
      value,
    }));

  const civilData = Object.entries(data.civilCounts)
    .filter(([_, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  const paymentRate = data.paymentStats.paid + data.paymentStats.pending + data.paymentStats.overdue > 0
    ? Math.round((data.paymentStats.paid / (data.paymentStats.paid + data.paymentStats.pending + data.paymentStats.overdue)) * 100)
    : 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display text-foreground">Relatórios</h1>
          <p className="text-muted-foreground font-body mt-1">Análise detalhada do sistema</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-elegant">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-body text-muted-foreground">Total de Membros</CardTitle>
              <Users className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display text-foreground">{data.totalMembers}</div>
            </CardContent>
          </Card>
          <Card className="card-elegant">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-body text-muted-foreground">Idade Média</CardTitle>
              <Calendar className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display text-foreground">{data.averageAge} <span className="text-lg text-muted-foreground">anos</span></div>
            </CardContent>
          </Card>
          <Card className="card-elegant">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-body text-muted-foreground">Adimplência (Mês)</CardTitle>
              <DollarSign className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display text-foreground">{paymentRate}%</div>
              <p className="text-xs text-muted-foreground">{data.paymentStats.paid} pagos de {data.paymentStats.paid + data.paymentStats.pending + data.paymentStats.overdue}</p>
            </CardContent>
          </Card>
          <Card className="card-elegant">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-body text-muted-foreground">Lojas</CardTitle>
              <TrendingUp className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display text-foreground">{data.lodgeMembers.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Row 1: Lodge x Members + Degree */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Users className="h-5 w-5" /> Membros por Loja
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.lodgeMembers} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="lodge_name" type="category" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Membros" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <GraduationCap className="h-5 w-5" /> Distribuição por Grau
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={degreeData} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {degreeData.map((entry, i) => (
                        <Cell key={i} fill={DEGREE_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Age distribution + Regions by State */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Calendar className="h-5 w-5" /> Distribuição por Faixa Etária
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.ageGroups}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} name="Membros" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <MapPin className="h-5 w-5" /> Membros por Estado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.regionsByState}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="region" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} name="Membros" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Cities + Growth */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <MapPin className="h-5 w-5" /> Top Cidades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.regionsByCity} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="region" type="category" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} name="Membros" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <TrendingUp className="h-5 w-5" /> Crescimento (Últimos 12 meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.monthlyGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" name="Novos membros" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 4: Civil Status + Member Status + Positions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="text-lg font-display">Estado Civil</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={civilData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {civilData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="text-lg font-display">Status dos Membros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="text-lg font-display">Cargos na Loja</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {data.positions.map((p) => (
                  <div key={p.position} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <span className="text-sm font-body text-foreground">{p.position}</span>
                    <span className="text-sm font-display text-primary">{p.count}</span>
                  </div>
                ))}
                {data.positions.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum cargo registrado</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Summary */}
        <Card className="card-elegant">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <DollarSign className="h-5 w-5" /> Resumo Financeiro do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground font-body">Total Esperado</p>
                <p className="text-2xl font-display text-foreground">
                  R$ {data.paymentStats.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-500/10">
                <p className="text-sm text-muted-foreground font-body">Total Recebido</p>
                <p className="text-2xl font-display text-green-600">
                  R$ {data.paymentStats.paid_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-yellow-500/10">
                <p className="text-sm text-muted-foreground font-body">Pendentes</p>
                <p className="text-2xl font-display text-yellow-600">{data.paymentStats.pending}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-red-500/10">
                <p className="text-sm text-muted-foreground font-body">Em Atraso</p>
                <p className="text-2xl font-display text-red-600">{data.paymentStats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
