import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useLodges } from '@/hooks/useLodges';
import { useEvents, Event } from '@/hooks/useEvents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, ClipboardList, Filter, Users, BarChart3, UserCheck } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AttendanceSessionManager } from '@/components/admin/AttendanceSessionManager';

const Attendances = () => {
  const { isAdmin } = useAuth();
  const { data: profile } = useProfile();
  const { data: lodges } = useLodges();

  const [selectedLodge, setSelectedLodge] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [filterMonth, setFilterMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [reportMember, setReportMember] = useState<string>('all');

  // Determine the active lodge
  const activeLodgeId = isAdmin ? (selectedLodge || profile?.lodge_id || '') : (profile?.lodge_id || '');

  // Fetch events for the lodge (sessions)
  const { data: events, isLoading: eventsLoading } = useEvents(activeLodgeId || undefined);

  // Filter events by month
  const filteredEvents = useMemo(() => {
    if (!events || !filterMonth) return events || [];
    return events.filter(e => e.event_date.startsWith(filterMonth))
      .sort((a, b) => b.event_date.localeCompare(a.event_date));
  }, [events, filterMonth]);

  // Fetch attendance summary per session
  const { data: attendanceSummary } = useQuery({
    queryKey: ['attendance-summary', activeLodgeId, filterMonth],
    queryFn: async () => {
      if (!activeLodgeId) return {};
      const startDate = filterMonth + '-01';
      const endDate = filterMonth + '-31';

      const { data, error } = await supabase
        .from('attendances')
        .select('session_date, confirmed')
        .eq('lodge_id', activeLodgeId)
        .gte('session_date', startDate)
        .lte('session_date', endDate)
        .eq('confirmed', true);

      if (error) throw error;

      const summary: Record<string, number> = {};
      data?.forEach(a => {
        summary[a.session_date] = (summary[a.session_date] || 0) + 1;
      });
      return summary;
    },
    enabled: !!activeLodgeId,
  });

  // Fetch members for reports
  const { data: lodgeMembers } = useQuery({
    queryKey: ['lodge-members-report', activeLodgeId],
    queryFn: async () => {
      if (!activeLodgeId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, cim_number')
        .eq('lodge_id', activeLodgeId)
        .in('status', ['approved', 'membro'])
        .eq('member_status', 'active')
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!activeLodgeId,
  });

  // Fetch attendance history for reports
  const { data: attendanceHistory } = useQuery({
    queryKey: ['attendance-history', activeLodgeId, filterMonth, reportMember],
    queryFn: async () => {
      if (!activeLodgeId) return [];
      let query = supabase
        .from('attendances')
        .select('*, profiles:profile_id(full_name, cim_number)')
        .eq('lodge_id', activeLodgeId)
        .eq('confirmed', true)
        .order('session_date', { ascending: false });

      if (filterMonth) {
        query = query.gte('session_date', filterMonth + '-01').lte('session_date', filterMonth + '-31');
      }
      if (reportMember && reportMember !== 'all') {
        query = query.eq('profile_id', reportMember);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!activeLodgeId,
  });

  // Calculate frequency report
  const frequencyReport = useMemo(() => {
    if (!attendanceHistory || !lodgeMembers) return [];
    const totalSessions = new Set(attendanceHistory.map(a => a.session_date)).size;
    const memberPresences: Record<string, number> = {};

    attendanceHistory.forEach(a => {
      memberPresences[a.profile_id] = (memberPresences[a.profile_id] || 0) + 1;
    });

    return lodgeMembers.map(m => ({
      id: m.id,
      name: m.full_name,
      cim: m.cim_number,
      presences: memberPresences[m.id] || 0,
      totalSessions,
      percentage: totalSessions > 0 ? Math.round(((memberPresences[m.id] || 0) / totalSessions) * 100) : 0,
    })).sort((a, b) => b.percentage - a.percentage);
  }, [attendanceHistory, lodgeMembers]);

  if (selectedEvent && activeLodgeId) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6">
          <AttendanceSessionManager
            event={selectedEvent}
            lodgeId={activeLodgeId}
            onBack={() => setSelectedEvent(null)}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Gestão de Presenças</h1>
          </div>
        </div>

        {/* Lodge selector for admins */}
        {isAdmin && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-4">
                <Label className="shrink-0">Loja:</Label>
                <Select value={selectedLodge || '__auto__'} onValueChange={(v) => setSelectedLodge(v === '__auto__' ? '' : v)}>
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder="Selecione a loja" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__auto__">Minha Loja</SelectItem>
                    {lodges?.map((lodge) => (
                      <SelectItem key={lodge.id} value={lodge.id}>
                        {lodge.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {!activeLodgeId ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Selecione uma loja para gerenciar presenças.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="sessions">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="sessions" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Sessões
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Relatórios
              </TabsTrigger>
            </TabsList>

            {/* Sessions Tab */}
            <TabsContent value="sessions" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      Filtrar por Mês
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Input
                    type="month"
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="max-w-xs"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Sessões do Período
                  </CardTitle>
                  <CardDescription>
                    {filteredEvents?.length || 0} sessão(ões) encontrada(s). Clique em uma sessão para gerenciar presenças.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {eventsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-muted-foreground animate-pulse">Carregando sessões...</p>
                    </div>
                  ) : filteredEvents && filteredEvents.length > 0 ? (
                    <div className="space-y-2">
                      {filteredEvents.map((event) => {
                        const presentCount = attendanceSummary?.[event.event_date] || 0;
                        return (
                          <button
                            key={event.id}
                            onClick={() => setSelectedEvent(event)}
                            className="w-full flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                          >
                            <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-primary/10 text-primary shrink-0">
                              <span className="text-lg font-bold leading-none">
                                {format(new Date(event.event_date + 'T12:00:00'), 'd')}
                              </span>
                              <span className="text-xs uppercase">
                                {format(new Date(event.event_date + 'T12:00:00'), 'MMM', { locale: ptBR })}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{event.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(event.event_date + 'T12:00:00'), 'EEEE', { locale: ptBR })}
                                {event.event_time && ` • ${event.event_time.slice(0, 5)}`}
                              </p>
                            </div>
                            <Badge variant={presentCount > 0 ? 'default' : 'outline'} className="shrink-0">
                              <UserCheck className="h-3.5 w-3.5 mr-1" />
                              {presentCount} presente{presentCount !== 1 ? 's' : ''}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma sessão encontrada neste período. Crie sessões no Calendário.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filtros do Relatório
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Período</Label>
                      <Input
                        type="month"
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Membro</Label>
                      <Select value={reportMember} onValueChange={setReportMember}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os membros" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os membros</SelectItem>
                          {lodgeMembers?.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Frequency Report */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Frequência por Membro
                  </CardTitle>
                  <CardDescription>
                    {frequencyReport.length > 0 
                      ? `${frequencyReport[0]?.totalSessions || 0} sessão(ões) no período`
                      : 'Sem dados para o período selecionado'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {frequencyReport.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Membro</TableHead>
                            <TableHead>CIM</TableHead>
                            <TableHead className="text-center">Presenças</TableHead>
                            <TableHead className="text-center">Frequência</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {frequencyReport.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell className="font-medium">{member.name}</TableCell>
                              <TableCell>{member.cim || '-'}</TableCell>
                              <TableCell className="text-center">
                                {member.presences}/{member.totalSessions}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={
                                  member.percentage >= 75 ? 'default' :
                                  member.percentage >= 50 ? 'secondary' : 'destructive'
                                }>
                                  {member.percentage}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum dado de presença para o período selecionado.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Individual History */}
              {reportMember !== 'all' && attendanceHistory && attendanceHistory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Histórico Individual
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data da Sessão</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendanceHistory.map((a: any) => (
                            <TableRow key={a.id}>
                              <TableCell>
                                {format(new Date(a.session_date + 'T12:00:00'), "dd/MM/yyyy - EEEE", { locale: ptBR })}
                              </TableCell>
                              <TableCell>
                                <Badge variant={a.session_type === 'magna' ? 'default' : 'secondary'}>
                                  {a.session_type === 'magna' ? 'Magna' : 'Ordinária'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 text-green-600">
                                  <UserCheck className="h-4 w-4" />
                                  <span className="text-sm">Presente</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
};

export default Attendances;
