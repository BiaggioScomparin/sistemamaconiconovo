import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { 
  DollarSign, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Search,
  Plus,
  Users,
  TrendingUp
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface PaymentWithProfile {
  id: string;
  profile_id: string;
  reference_month: number;
  reference_year: number;
  amount: number;
  due_date: string;
  status: string;
  paid_at: string | null;
  profiles: {
    full_name: string;
    cim_number: string | null;
  };
}

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const getStatusBadge = (status: string, dueDate: string) => {
  const now = new Date();
  const due = parseISO(dueDate);
  const isOverdue = now > due && status === 'pending';

  if (status === 'paid') {
    return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Pago</Badge>;
  }
  if (isOverdue || status === 'overdue') {
    return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Em Atraso</Badge>;
  }
  return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
};

export default function Financeiro() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generateMonth, setGenerateMonth] = useState((new Date().getMonth() + 1).toString());
  const [generateYear, setGenerateYear] = useState(new Date().getFullYear().toString());

  const { data: payments, isLoading } = useQuery({
    queryKey: ['admin-payments', statusFilter, monthFilter, yearFilter],
    queryFn: async () => {
      let query = supabase
        .from('monthly_payments')
        .select(`
          *,
          profiles!inner(full_name, cim_number)
        `)
        .order('reference_year', { ascending: false })
        .order('reference_month', { ascending: false });

      if (yearFilter !== 'all') {
        query = query.eq('reference_year', parseInt(yearFilter));
      }

      if (monthFilter !== 'all') {
        query = query.eq('reference_month', parseInt(monthFilter));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PaymentWithProfile[];
    },
  });

  const { data: approvedProfiles } = useQuery({
    queryKey: ['approved-profiles-for-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('status', ['approved', 'membro']);

      if (error) throw error;
      return data;
    },
  });

  const generatePaymentsMutation = useMutation({
    mutationFn: async ({ month, year }: { month: number; year: number }) => {
      if (!approvedProfiles) throw new Error('Nenhum membro aprovado encontrado');

      const dueDate = new Date(year, month - 1, 10);
      const payments = approvedProfiles.map(profile => ({
        profile_id: profile.id,
        reference_month: month,
        reference_year: year,
        amount: 200,
        due_date: format(dueDate, 'yyyy-MM-dd'),
        status: 'pending',
      }));

      const { error } = await supabase
        .from('monthly_payments')
        .upsert(payments, { 
          onConflict: 'profile_id,reference_month,reference_year',
          ignoreDuplicates: true 
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      toast.success('Mensalidades geradas com sucesso!');
      setShowGenerateDialog(false);
    },
    onError: (error) => {
      console.error('Error generating payments:', error);
      toast.error('Erro ao gerar mensalidades');
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from('monthly_payments')
        .update({ 
          status: 'paid', 
          paid_at: new Date().toISOString() 
        })
        .eq('id', paymentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      toast.success('Pagamento confirmado!');
    },
    onError: () => {
      toast.error('Erro ao confirmar pagamento');
    },
  });

  const filteredPayments = payments?.filter(payment => {
    const matchesSearch = payment.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.profiles.cim_number?.includes(searchTerm));
    
    const now = new Date();
    const due = parseISO(payment.due_date);
    const actualStatus = now > due && payment.status === 'pending' ? 'overdue' : payment.status;
    const matchesStatus = statusFilter === 'all' || actualStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: payments?.length || 0,
    paid: payments?.filter(p => p.status === 'paid').length || 0,
    pending: payments?.filter(p => p.status === 'pending' && new Date() <= parseISO(p.due_date)).length || 0,
    overdue: payments?.filter(p => p.status === 'pending' && new Date() > parseISO(p.due_date)).length || 0,
    totalReceived: payments?.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0) || 0,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Financeiro</h1>
              <p className="text-muted-foreground">Gerencie as mensalidades dos membros</p>
            </div>
          </div>
          <Button onClick={() => setShowGenerateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Gerar Mensalidades
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagos</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.paid}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Atraso</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.overdue}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Total Recebido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              R$ {stats.totalReceived.toFixed(2).replace('.', ',')}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou CIM..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="paid">Pagos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="overdue">Em Atraso</SelectItem>
                </SelectContent>
              </Select>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {monthNames.map((month, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os anos</SelectItem>
                  {[2024, 2025, 2026].map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Mensalidades</CardTitle>
            <CardDescription>Lista de todas as mensalidades</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : filteredPayments && filteredPayments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membro</TableHead>
                    <TableHead>CIM</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.profiles.full_name}</TableCell>
                      <TableCell>{payment.profiles.cim_number || '-'}</TableCell>
                      <TableCell>
                        {monthNames[payment.reference_month - 1]} {payment.reference_year}
                      </TableCell>
                      <TableCell>R$ {Number(payment.amount).toFixed(2).replace('.', ',')}</TableCell>
                      <TableCell>{format(parseISO(payment.due_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{getStatusBadge(payment.status, payment.due_date)}</TableCell>
                      <TableCell>
                        {payment.status !== 'paid' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsPaidMutation.mutate(payment.id)}
                            disabled={markAsPaidMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Confirmar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-8 text-muted-foreground">Nenhuma mensalidade encontrada</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Generate Payments Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Mensalidades</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Mês</Label>
              <Select value={generateMonth} onValueChange={setGenerateMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((month, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ano</Label>
              <Select value={generateYear} onValueChange={setGenerateYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Isso irá criar uma mensalidade de R$ 200,00 para cada membro aprovado, com vencimento no dia 10.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => generatePaymentsMutation.mutate({
                month: parseInt(generateMonth),
                year: parseInt(generateYear),
              })}
              disabled={generatePaymentsMutation.isPending}
            >
              Gerar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
