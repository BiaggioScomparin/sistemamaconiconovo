import { useState, useMemo } from 'react';
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
  TrendingUp,
  QrCode,
  Loader2,
  Trash2
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import { Label } from '@/components/ui/label';
import { LodgeFinancialReport } from '@/components/admin/LodgeFinancialReport';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

interface PaymentWithProfile {
  id: string;
  profile_id: string;
  reference_month: number;
  reference_year: number;
  amount: number;
  due_date: string;
  status: string;
  paid_at: string | null;
  pix_qr_code: string | null;
  pix_qr_code_base64: string | null;
  profiles: {
    full_name: string;
    cim_number: string | null;
    lodge_id: string | null;
    lodges: {
      name: string;
    } | null;
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
  const { isAdmin } = useAuth();
  const { data: profile } = useProfile();
  const userLodgeId = profile?.lodge_id;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [lodgeFilter, setLodgeFilter] = useState<string>('all');
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generateMonth, setGenerateMonth] = useState((new Date().getMonth() + 1).toString());
  const [generateYear, setGenerateYear] = useState(new Date().getFullYear().toString());
  const [generateAmount, setGenerateAmount] = useState('200');
  const [generateLodgeId, setGenerateLodgeId] = useState<string>('all');
  const [selectedPaymentForQR, setSelectedPaymentForQR] = useState<PaymentWithProfile | null>(null);
  const [generatingPixId, setGeneratingPixId] = useState<string | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<PaymentWithProfile | null>(null);

  const effectiveLodgeId = isAdmin ? lodgeFilter : (userLodgeId || 'all');

  const { data: payments, isLoading } = useQuery({
    queryKey: ['admin-payments', statusFilter, monthFilter, yearFilter, effectiveLodgeId],
    queryFn: async () => {
      let query = supabase
        .from('monthly_payments')
        .select(`
          *,
          profiles!inner(full_name, cim_number, lodge_id, lodges(name))
        `)
        .order('reference_year', { ascending: false })
        .order('reference_month', { ascending: false });

      if (effectiveLodgeId !== 'all') {
        query = query.eq('profiles.lodge_id', effectiveLodgeId);
      }

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
    queryKey: ['approved-profiles-for-payments', effectiveLodgeId, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, full_name, lodge_id')
        .in('status', ['approved', 'membro']);

      if (!isAdmin) {
        query = query.or('member_status.eq.active,member_status.is.null');
      }

      if (effectiveLodgeId !== 'all') {
        query = query.eq('lodge_id', effectiveLodgeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: lodges } = useQuery({
    queryKey: ['lodges-for-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lodges')
        .select('id, name, default_payment_amount, payment_gateway')
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  // Update amount when lodge changes
  const handleLodgeChange = (lodgeId: string) => {
    setGenerateLodgeId(lodgeId);
    if (lodgeId !== 'all') {
      const lodge = lodges?.find(l => l.id === lodgeId);
      if (lodge) {
        setGenerateAmount(String(lodge.default_payment_amount || 200));
      }
    } else {
      setGenerateAmount('200');
    }
  };

  const generatePaymentsMutation = useMutation({
    mutationFn: async ({ month, year, amount, lodgeId }: { month: number; year: number; amount: number; lodgeId: string }) => {
      if (!approvedProfiles) throw new Error('Nenhum membro aprovado encontrado');

      // Filter profiles by lodge if selected
      const filteredProfiles = lodgeId === 'all' 
        ? approvedProfiles 
        : approvedProfiles.filter(p => p.lodge_id === lodgeId);

      if (filteredProfiles.length === 0) {
        throw new Error('Nenhum membro encontrado para a loja selecionada');
      }

      const dueDate = new Date(year, month - 1, 10);
      const payments = filteredProfiles.map(profile => ({
        profile_id: profile.id,
        reference_month: month,
        reference_year: year,
        amount: amount,
        due_date: format(dueDate, 'yyyy-MM-dd'),
        status: 'pending',
      }));

      const { error } = await supabase
        .from('monthly_payments')
        .insert(payments);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      queryClient.invalidateQueries({ queryKey: ['lodge-financial-report'] });
      toast.success('Mensalidades geradas com sucesso!');
      setShowGenerateDialog(false);
    },
    onError: (error: any) => {
      console.error('Error generating payments:', error);
      toast.error(error?.message || 'Erro ao gerar mensalidades');
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

  const generatePixMutation = useMutation({
    mutationFn: async (payment: PaymentWithProfile) => {
      const now = new Date();
      const due = parseISO(payment.due_date);
      // Usa o valor armazenado + multa de 50 se em atraso
      const amount = now > due ? Number(payment.amount) + 50 : Number(payment.amount);

      const response = await supabase.functions.invoke('generate-pix', {
        body: {
          payment_id: payment.id,
          amount,
          description: `Mensalidade ${monthNames[payment.reference_month - 1]}/${payment.reference_year}`,
          payer_name: payment.profiles.full_name,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      toast.success('QR Code PIX gerado com sucesso!');
      setGeneratingPixId(null);
    },
    onError: (error: any) => {
      console.error('Error generating PIX:', error);
      toast.error(error?.message || 'Erro ao gerar QR Code PIX');
      setGeneratingPixId(null);
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from('monthly_payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      toast.success('Mensalidade excluída com sucesso!');
      setPaymentToDelete(null);
    },
    onError: () => {
      toast.error('Erro ao excluir mensalidade');
    },
  });

  const filteredPayments = payments?.filter(payment => {
    const matchesSearch = payment.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.profiles.cim_number?.includes(searchTerm));
    
    const now = new Date();
    const due = parseISO(payment.due_date);
    const actualStatus = now > due && payment.status === 'pending' ? 'overdue' : payment.status;
    const matchesStatus = statusFilter === 'all' || actualStatus === statusFilter;

    const matchesLodge = lodgeFilter === 'all' || payment.profiles.lodge_id === lodgeFilter;

    return matchesSearch && matchesStatus && matchesLodge;
  });

  const { data: lodgeMembers, isLoading: membersLoading } = useQuery({
    queryKey: ['approved-profiles-with-details', effectiveLodgeId, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, full_name, cim_number, degree, lodge_position, lodge_id, member_status, lodges(name)')
        .in('status', ['approved', 'membro'])
        .order('full_name');

      if (!isAdmin) {
        query = query.or('member_status.eq.active,member_status.is.null');
      }

      if (effectiveLodgeId !== 'all') {
        query = query.eq('lodge_id', effectiveLodgeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const memberStatusList = useMemo(() => {
    if (!lodgeMembers) return [];

    return lodgeMembers.map(member => {
      const payment = payments?.find(p => p.profile_id === member.id);
      return {
        member,
        payment: payment || null,
      };
    }).filter(item => {
      const matchesSearch = item.member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.member.cim_number?.includes(searchTerm));
      
      const now = new Date();
      const actualStatus = item.payment 
        ? (now > parseISO(item.payment.due_date) && item.payment.status === 'pending' ? 'overdue' : item.payment.status)
        : 'none';

      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'none' ? !item.payment : actualStatus === statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [lodgeMembers, payments, searchTerm, statusFilter]);

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
              <p className="text-muted-foreground">Gerencie as mensalidades dos membros da Loja</p>
            </div>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowGenerateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Gerar Mensalidades
            </Button>
          )}
        </div>

        {/* Stats Cards - Only for Admin */}
        {isAdmin && (
          <>
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
          </>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou CIM..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {isAdmin && (
                <Select value={lodgeFilter} onValueChange={setLodgeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Loja" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Lojas</SelectItem>
                    {lodges?.map((lodge) => (
                      <SelectItem key={lodge.id} value={lodge.id}>
                        {lodge.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="paid">Pagos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="overdue">Em Atraso</SelectItem>
                  <SelectItem value="none">Sem Lançamento</SelectItem>
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

        {/* Lodge Financial Report */}
        <LodgeFinancialReport monthFilter={monthFilter} yearFilter={yearFilter} lodgeIdFilter={effectiveLodgeId} />

        {/* Members & Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Membros da Loja e Status das Mensalidades
            </CardTitle>
            <CardDescription>
              Lista de membros e a situação de pagamento da mensalidade no período selecionado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || membersLoading ? (
              <p className="text-center py-8 text-muted-foreground">Carregando membros...</p>
            ) : memberStatusList && memberStatusList.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membro</TableHead>
                    <TableHead>Grau / Cargo</TableHead>
                    <TableHead>CIM</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status da Mensalidade</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberStatusList.map(({ member, payment }) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        <div>
                          {member.full_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {[member.degree, member.lodge_position].filter(Boolean).join(' • ') || '-'}
                      </TableCell>
                      <TableCell>{member.cim_number || '-'}</TableCell>
                      <TableCell>{member.lodges?.name || '-'}</TableCell>
                      <TableCell>
                        {payment ? (
                          `${monthNames[payment.reference_month - 1]} ${payment.reference_year}`
                        ) : monthFilter !== 'all' ? (
                          `${monthNames[parseInt(monthFilter) - 1]} ${yearFilter}`
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {payment ? `R$ ${Number(payment.amount).toFixed(2).replace('.', ',')}` : '-'}
                      </TableCell>
                      <TableCell>
                        {payment ? format(parseISO(payment.due_date), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        {payment ? (
                          getStatusBadge(payment.status, payment.due_date)
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Sem Lançamento
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="space-x-2">
                        {payment && payment.status !== 'paid' && (
                          <>
                            {payment.pix_qr_code ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedPaymentForQR(payment)}
                              >
                                <QrCode className="h-4 w-4 mr-1" />
                                Ver QR
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setGeneratingPixId(payment.id);
                                  generatePixMutation.mutate(payment);
                                }}
                                disabled={generatingPixId === payment.id}
                              >
                                {generatingPixId === payment.id ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <QrCode className="h-4 w-4 mr-1" />
                                )}
                                Gerar PIX
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markAsPaidMutation.mutate(payment.id)}
                              disabled={markAsPaidMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Confirmar
                            </Button>
                            {isAdmin && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setPaymentToDelete(payment)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-8 text-muted-foreground">Nenhum membro encontrado</p>
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
              <Label>Loja Maçônica</Label>
              <Select value={generateLodgeId} onValueChange={handleLodgeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma loja" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Lojas</SelectItem>
                  {lodges?.map((lodge) => (
                    <SelectItem key={lodge.id} value={lodge.id}>
                      {lodge.name} (R$ {Number(lodge.default_payment_amount || 200).toFixed(2).replace('.', ',')} - {lodge.payment_gateway === 'infinitepay' ? 'InfinitePay' : lodge.payment_gateway === 'manual' ? 'Manual' : 'Mercado Pago'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                value={generateAmount}
                onChange={(e) => setGenerateAmount(e.target.value)}
                placeholder="200"
                min="0"
                step="0.01"
              />
              <p className="text-xs text-muted-foreground">
                {generateLodgeId !== 'all' ? 'Valor padrão da loja selecionada. Você pode alterar se necessário.' : 'Valor padrão para todas as lojas.'}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Isso irá criar uma mensalidade de R$ {parseFloat(generateAmount || '0').toFixed(2).replace('.', ',')} para cada membro {generateLodgeId === 'all' ? 'aprovado' : 'da loja selecionada'}, com vencimento no dia 10.
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
                amount: parseFloat(generateAmount) || 200,
                lodgeId: generateLodgeId,
              })}
              disabled={generatePaymentsMutation.isPending}
            >
              Gerar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={!!selectedPaymentForQR} onOpenChange={() => setSelectedPaymentForQR(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code PIX</DialogTitle>
          </DialogHeader>
          {selectedPaymentForQR?.pix_qr_code && (
            <div className="flex flex-col items-center space-y-4">
              <QRCodeSVG value={selectedPaymentForQR.pix_qr_code} size={256} />
              <p className="text-sm text-muted-foreground text-center">
                {selectedPaymentForQR.profiles.full_name} - {monthNames[selectedPaymentForQR.reference_month - 1]}/{selectedPaymentForQR.reference_year}
              </p>
              <div className="w-full">
                <p className="text-xs text-muted-foreground mb-1">Código PIX:</p>
                <div className="bg-muted p-2 rounded text-xs break-all">
                  {selectedPaymentForQR.pix_qr_code}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!paymentToDelete} onOpenChange={() => setPaymentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a mensalidade de{' '}
              <strong>{paymentToDelete?.profiles.full_name}</strong> referente a{' '}
              <strong>{paymentToDelete && monthNames[paymentToDelete.reference_month - 1]}/{paymentToDelete?.reference_year}</strong>?
              <br /><br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => paymentToDelete && deletePaymentMutation.mutate(paymentToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
