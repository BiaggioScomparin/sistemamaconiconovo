import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useLodges } from '@/hooks/useLodges';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Calendar, CheckCircle, Clock, Lock, Users } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const Attendance = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: lodges } = useLodges();
  const { data: permissions, isLoading: permissionsLoading } = useUserPermissions();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [lodgeId, setLodgeId] = useState('');
  const [sessionType, setSessionType] = useState<'magna' | 'ordinaria'>('ordinaria');
  const [sessionDate, setSessionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dailyViewDate, setDailyViewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: attendances, refetch: refetchAttendances } = useQuery({
    queryKey: ['my-attendances', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('attendances')
        .select('*, lodges:lodge_id(name)')
        .eq('profile_id', profile.id)
        .order('session_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  // Query for daily attendances (when user has permission)
  const { data: dailyAttendances } = useQuery({
    queryKey: ['daily-attendances', dailyViewDate, permissions?.can_view_daily_attendances],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendances')
        .select('*, profiles:profile_id(full_name, cim_number), lodges:lodge_id(name)')
        .eq('session_date', dailyViewDate)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!permissions?.can_view_daily_attendances,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.id || !lodgeId) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('attendances').insert({
        profile_id: profile.id,
        lodge_id: lodgeId,
        session_type: sessionType,
        session_date: sessionDate,
      });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Presença já registrada',
            description: 'Você já registrou presença para esta sessão.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: 'Presença registrada!',
        description: 'Sua presença foi registrada com sucesso e aguarda confirmação.',
      });

      refetchAttendances();
      setLodgeId('');
    } catch (error: any) {
      toast({
        title: 'Erro ao registrar presença',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || profileLoading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has any attendance permission
  const canViewAttendance = permissions?.can_view_attendance;
  const canRegisterAttendance = permissions?.can_register_attendance;

  if (!canViewAttendance && !canRegisterAttendance) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6 space-y-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Registro de Frequência</h1>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-medium">
                Acesso não liberado
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Entre em contato com a administração para liberar esta funcionalidade.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Registro de Frequência</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Registration Form - only show if user can register */}
          {canRegisterAttendance && (
            <Card>
              <CardHeader>
                <CardTitle>Nova Presença</CardTitle>
                <CardDescription>
                  Registre sua presença em uma sessão maçônica
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cim">CIM</Label>
                    <Input
                      id="cim"
                      value={profile.cim_number || 'Não atribuído'}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={profile.cpf || 'Não informado'}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                <div className="space-y-2">
                  <Label htmlFor="session_date">Data da Sessão</Label>
                  <Input
                    id="session_date"
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lodge">Loja Frequentada</Label>
                  <Select value={lodgeId} onValueChange={setLodgeId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a Loja" />
                    </SelectTrigger>
                    <SelectContent>
                      {lodges?.map((lodge) => (
                        <SelectItem key={lodge.id} value={lodge.id}>
                          {lodge.name} - {lodge.city}/{lodge.state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Sessão</Label>
                  <RadioGroup
                    value={sessionType}
                    onValueChange={(value) => setSessionType(value as 'magna' | 'ordinaria')}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ordinaria" id="ordinaria" />
                      <Label htmlFor="ordinaria" className="cursor-pointer">Ordinária</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="magna" id="magna" />
                      <Label htmlFor="magna" className="cursor-pointer">Magna</Label>
                    </div>
                  </RadioGroup>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Registrando...' : 'Registrar Presença'}
                </Button>
              </form>
            </CardContent>
          </Card>
          )}

          {/* Attendance History - show if user can view attendance */}
          {canViewAttendance && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Histórico de Presenças
              </CardTitle>
              <CardDescription>
                Suas presenças registradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attendances && attendances.length > 0 ? (
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Loja</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendances.map((attendance: any) => (
                        <TableRow key={attendance.id}>
                          <TableCell>
                            {format(new Date(attendance.session_date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="max-w-[120px] truncate">
                            {attendance.lodges?.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant={attendance.session_type === 'magna' ? 'default' : 'secondary'}>
                              {attendance.session_type === 'magna' ? 'Magna' : 'Ordinária'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {attendance.confirmed ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <Clock className="h-5 w-5 text-yellow-500" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma presença registrada ainda.
                </p>
              )}
            </CardContent>
          </Card>
          )}
        </div>

        {/* Daily Attendances View - for users with permission */}
        {permissions?.can_view_daily_attendances && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Presenças do Dia
              </CardTitle>
              <CardDescription>
                Visualize todos os membros que registraram presença em uma data específica
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="daily_view_date">Selecionar Data</Label>
                  <Input
                    id="daily_view_date"
                    type="date"
                    value={dailyViewDate}
                    onChange={(e) => setDailyViewDate(e.target.value)}
                    className="w-[200px]"
                  />
                </div>
              </div>

              {dailyAttendances && dailyAttendances.length > 0 ? (
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Membro</TableHead>
                        <TableHead>CIM</TableHead>
                        <TableHead>Loja</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyAttendances.map((attendance: any) => (
                        <TableRow key={attendance.id}>
                          <TableCell className="font-medium">
                            {attendance.profiles?.full_name}
                          </TableCell>
                          <TableCell>
                            {attendance.profiles?.cim_number || '-'}
                          </TableCell>
                          <TableCell>
                            {attendance.lodges?.name}
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma presença registrada para esta data.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Attendance;
