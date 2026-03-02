import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { parseISO } from 'date-fns';

interface LodgeReportData {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  default_payment_amount: number;
  payment_gateway: string;
  paid_count: number;
  pending_count: number;
  overdue_count: number;
  total_paid: number;
  total_pending: number;
  total_overdue: number;
}

interface Props {
  monthFilter: string;
  yearFilter: string;
}

export function LodgeFinancialReport({ monthFilter, yearFilter }: Props) {
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['lodge-financial-report', monthFilter, yearFilter],
    queryFn: async () => {
      // Fetch lodges with their default payment amounts
      const { data: lodges, error: lodgesError } = await supabase
        .from('lodges')
        .select('id, name, city, state, default_payment_amount, payment_gateway')
        .order('name');

      if (lodgesError) throw lodgesError;

      // Fetch all payments with profiles (including lodge info)
      let paymentsQuery = supabase
        .from('monthly_payments')
        .select(`
          *,
          profiles!inner(lodge_id)
        `);

      if (yearFilter !== 'all') {
        paymentsQuery = paymentsQuery.eq('reference_year', parseInt(yearFilter));
      }

      if (monthFilter !== 'all') {
        paymentsQuery = paymentsQuery.eq('reference_month', parseInt(monthFilter));
      }

      const { data: payments, error: paymentsError } = await paymentsQuery;
      if (paymentsError) throw paymentsError;

      const now = new Date();

      // Calculate stats per lodge
      const lodgeStats: LodgeReportData[] = (lodges || []).map(lodge => {
        const lodgePayments = payments?.filter(p => p.profiles.lodge_id === lodge.id) || [];
        
        const paid = lodgePayments.filter(p => p.status === 'paid');
        const pending = lodgePayments.filter(p => p.status === 'pending' && now <= parseISO(p.due_date));
        const overdue = lodgePayments.filter(p => p.status === 'pending' && now > parseISO(p.due_date));

        return {
          id: lodge.id,
          name: lodge.name,
          city: lodge.city,
          state: lodge.state,
          default_payment_amount: Number(lodge.default_payment_amount) || 200,
          payment_gateway: lodge.payment_gateway || 'mercado_pago',
          paid_count: paid.length,
          pending_count: pending.length,
          overdue_count: overdue.length,
          total_paid: paid.reduce((sum, p) => sum + Number(p.amount), 0),
          total_pending: pending.reduce((sum, p) => sum + Number(p.amount), 0),
          total_overdue: overdue.reduce((sum, p) => sum + Number(p.amount) + 50, 0), // +50 de multa
        };
      });

      // Add "Sem Loja" for members without a lodge
      const noLodgePayments = payments?.filter(p => !p.profiles.lodge_id) || [];
      if (noLodgePayments.length > 0) {
        const paid = noLodgePayments.filter(p => p.status === 'paid');
        const pending = noLodgePayments.filter(p => p.status === 'pending' && now <= parseISO(p.due_date));
        const overdue = noLodgePayments.filter(p => p.status === 'pending' && now > parseISO(p.due_date));

        lodgeStats.push({
          id: 'no-lodge',
          name: 'Sem Loja',
          city: null,
          state: null,
          default_payment_amount: 200,
          payment_gateway: 'manual',
          paid_count: paid.length,
          pending_count: pending.length,
          overdue_count: overdue.length,
          total_paid: paid.reduce((sum, p) => sum + Number(p.amount), 0),
          total_pending: pending.reduce((sum, p) => sum + Number(p.amount), 0),
          total_overdue: overdue.reduce((sum, p) => sum + Number(p.amount) + 50, 0),
        });
      }

      return lodgeStats;
    },
  });

  const totals = reportData?.reduce(
    (acc, lodge) => ({
      paid_count: acc.paid_count + lodge.paid_count,
      pending_count: acc.pending_count + lodge.pending_count,
      overdue_count: acc.overdue_count + lodge.overdue_count,
      total_paid: acc.total_paid + lodge.total_paid,
      total_pending: acc.total_pending + lodge.total_pending,
      total_overdue: acc.total_overdue + lodge.total_overdue,
    }),
    { paid_count: 0, pending_count: 0, overdue_count: 0, total_paid: 0, total_pending: 0, total_overdue: 0 }
  );

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Carregando relatório...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Relatório por Loja Maçônica
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reportData && reportData.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loja</TableHead>
                <TableHead>Valor Padrão</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Pagos
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    Pendentes
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    Atrasados
                  </div>
                </TableHead>
                <TableHead className="text-right">Total Pago</TableHead>
                <TableHead className="text-right">Em Aberto</TableHead>
                <TableHead className="text-right">Atrasado (+R$50)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.map((lodge) => (
                <TableRow key={lodge.id}>
                  <TableCell className="font-medium">
                    <div>
                      {lodge.name}
                      {lodge.city && lodge.state && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({lodge.city}/{lodge.state})
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{formatCurrency(lodge.default_payment_amount)}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-green-500">{lodge.paid_count}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{lodge.pending_count}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="destructive">{lodge.overdue_count}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-green-600 font-medium">
                    {formatCurrency(lodge.total_paid)}
                  </TableCell>
                  <TableCell className="text-right text-yellow-600 font-medium">
                    {formatCurrency(lodge.total_pending)}
                  </TableCell>
                  <TableCell className="text-right text-red-600 font-medium">
                    {formatCurrency(lodge.total_overdue)}
                  </TableCell>
                </TableRow>
              ))}
              {/* Totals Row */}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell>Total Geral</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="text-center">
                  <Badge className="bg-green-500">{totals?.paid_count}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{totals?.pending_count}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="destructive">{totals?.overdue_count}</Badge>
                </TableCell>
                <TableCell className="text-right text-green-600">
                  {formatCurrency(totals?.total_paid || 0)}
                </TableCell>
                <TableCell className="text-right text-yellow-600">
                  {formatCurrency(totals?.total_pending || 0)}
                </TableCell>
                <TableCell className="text-right text-red-600">
                  {formatCurrency(totals?.total_overdue || 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <p className="text-center py-8 text-muted-foreground">
            Nenhum dado encontrado para o período selecionado.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
