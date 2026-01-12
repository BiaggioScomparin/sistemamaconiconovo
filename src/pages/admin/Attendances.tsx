import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLodges } from '@/hooks/useLodges';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CheckCircle, Clock, Filter, Users } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

const Attendances = () => {
  const { data: lodges } = useLodges();
  const { data: profile } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filterLodge, setFilterLodge] = useState<string>('all');
  const [filterSessionType, setFilterSessionType] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterConfirmed, setFilterConfirmed] = useState<string>('all');

  const { data: attendances, isLoading } = useQuery({
    queryKey: ['all-attendances', filterLodge, filterSessionType, filterDate, filterConfirmed],
    queryFn: async () => {
      let query = supabase
        .from('attendances')
        .select('*, profiles:profile_id(full_name, cim_number, cpf), lodges:lodge_id(name, city, state)')
        .order('session_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (filterLodge && filterLodge !== 'all') {
        query = query.eq('lodge_id', filterLodge);
      }
      if (filterSessionType && filterSessionType !== 'all') {
        query = query.eq('session_type', filterSessionType);
      }
      if (filterDate) {
        query = query.eq('session_date', filterDate);
      }
      if (filterConfirmed === 'confirmed') {
        query = query.eq('confirmed', true);
      } else if (filterConfirmed === 'pending') {
        query = query.eq('confirmed', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async ({ attendanceId, confirmed }: { attendanceId: string; confirmed: boolean }) => {
      const updateData: any = {
        confirmed,
        confirmed_at: confirmed ? new Date().toISOString() : null,
        confirmed_by: confirmed ? profile?.id : null,
      };

      const { error } = await supabase
        .from('attendances')
        .update(updateData)
        .eq('id', attendanceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-attendances'] });
      toast({
        title: 'Status atualizado',
        description: 'A presença foi atualizada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleToggleConfirm = (attendanceId: string, currentStatus: boolean) => {
    confirmMutation.mutate({ attendanceId, confirmed: !currentStatus });
  };

  const clearFilters = () => {
    setFilterLodge('all');
    setFilterSessionType('all');
    setFilterDate('');
    setFilterConfirmed('all');
  };

  const pendingCount = attendances?.filter((a: any) => !a.confirmed).length || 0;

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Gestão de Presenças</h1>
          </div>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-sm">
              {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Loja</Label>
                <Select value={filterLodge} onValueChange={setFilterLodge}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {lodges?.map((lodge) => (
                      <SelectItem key={lodge.id} value={lodge.id}>
                        {lodge.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Sessão</Label>
                <Select value={filterSessionType} onValueChange={setFilterSessionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="ordinaria">Ordinária</SelectItem>
                    <SelectItem value="magna">Magna</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filterConfirmed} onValueChange={setFilterConfirmed}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="confirmed">Confirmados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendances Table */}
        <Card>
          <CardHeader>
            <CardTitle>Presenças Registradas</CardTitle>
            <CardDescription>
              {attendances?.length || 0} registro{(attendances?.length || 0) !== 1 ? 's' : ''} encontrado{(attendances?.length || 0) !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : attendances && attendances.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Membro</TableHead>
                      <TableHead>CIM</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Loja</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Confirmar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendances.map((attendance: any) => (
                      <TableRow key={attendance.id}>
                        <TableCell>
                          {format(new Date(attendance.session_date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {attendance.profiles?.full_name}
                        </TableCell>
                        <TableCell>
                          {attendance.profiles?.cim_number || '-'}
                        </TableCell>
                        <TableCell>
                          {attendance.profiles?.cpf || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{attendance.lodges?.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {attendance.lodges?.city}/{attendance.lodges?.state}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={attendance.session_type === 'magna' ? 'default' : 'secondary'}>
                            {attendance.session_type === 'magna' ? 'Magna' : 'Ordinária'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {attendance.confirmed ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm">Confirmado</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-yellow-600">
                              <Clock className="h-4 w-4" />
                              <span className="text-sm">Pendente</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={attendance.confirmed}
                            onCheckedChange={() => handleToggleConfirm(attendance.id, attendance.confirmed)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma presença encontrada com os filtros selecionados.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Attendances;
