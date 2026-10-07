import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { parseISO } from 'date-fns';

const LATE_FEE = 50; // multa fixa por atraso (R$)

// Soma valores monetários em centavos (inteiros) para evitar erros de ponto flutuante.
function sumAmountsToReais(values: number[], extraPerItemReais = 0): number {
  const totalCents = values.reduce(
    (acc, v) => acc + Math.round((Number(v) || 0) * 100) + Math.round(extraPerItemReais * 100),
    0
  );
  return totalCents / 100;
}

// Interpreta due_date: strings date-only (YYYY-MM-DD) são tratadas no fuso local
// (meio-dia) para evitar off-by-one; demais formatos usam parseISO.
function parseDueDate(due: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(due)) {
    return new Date(`${due}T12:00:00`);
  }
  return parseISO(due);
}

// Acesso null-safe ao lodge_id do join profiles (pode vir objeto, array ou null).
function getProfileLodgeId(profiles: unknown): string | null {
  if (!profiles) return null;
  const p = Array.isArray(profiles) ? profiles[0] : profiles;
  return (p as { lodge_id?: string | null })?.lodge_id ?? null;
}

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
  lodgeIdFilter?: string;
}

export function LodgeFinancialReport({ monthFilter, yearFilter, lodgeIdFilter }: Props) {
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['lodge-financial-report', monthFilter, yearFilter, lodgeIdFilter],
    queryFn: async () => {
      // Fetch lodges with their default payment amounts
      let lodgesQuery = supabase
        .from('lodges')
        .select('id, name, city, state, default_payment_amount, payment_gateway')
        .order('name');

      if (lodgeIdFilter && lodgeIdFilter !== 'all') {
        lodgesQuery = lodgesQuery.eq('id', lodgeIdFilter);
      }

      const { data: lodges, error: lodgesError } = await lodgesQuery;
      if (lodgesError) throw lodgesError;

      // Fetch all payments with profiles (including lodge info).
      // Paginate explicitly: PostgREST caps results (~1000 rows) by default, which would
      // silently truncate the financial totals once the base grows past that limit.
      type PaymentRow = {
        status: string;
        amount: number;
        due_date: string;
        profiles: unknown;
      };

      const PAGE_SIZE = 1000;
      const payments: PaymentRow[] = [];
      let page = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        let paymentsQuery = supabase
          .from('monthly_payments')
          .select(`
            *,
            profiles!inner(lodge_id)
          `)
          .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

        if (yearFilter !== 'all') {
          paymentsQuery = paymentsQuery.eq('reference_year', parseInt(yearFilter));
        }

        if (monthFilter !== 'all') {
          paymentsQuery = paymentsQuery.eq('reference_month', parseInt(monthFilter));
        }

        const { data: pageData, error: paymentsError } = await paymentsQuery;
        if (paymentsError) throw paymentsError;

        const rows = (pageData || []) as PaymentRow[];
        payments.push(...rows);
        if (rows.length < PAGE_SIZE) break;
        page++;
      }

      const now = new Date();

      const buildStats = (rows: PaymentRow[]) => {
        const paid = rows.filter(p => p.status === 'paid');
        const pending = rows.filter(p => p.status === 'pending' && now <= parseDueDate(p.due_date));
        const overdue = rows.filter(p => p.status === 'pending' && now > parseDueDate(p.due_date));
        return {
          paid_count: paid.length,
          pending_count: pending.length,
          overdue_count: overdue.length,
          total_paid: sumAmountsToReais(paid.map(p => p.amount)),
          total_pending: sumAmountsToReais(pending.map(p => p.amount)),
          total_overdue: sumAmountsToReais(overdue.map(p => p.amount), LATE_FEE),
        };
      };

      // Calculate stats per lodge
      const lodgeStats: LodgeReportData[] = (lodges || []).map(lodge => {
        const lodgePayments = payments.filter(p => getProfileLodgeId(p.profiles) === lodge.id);
        return {
          id: lodge.id,
          name: lodge.name,
          city: lodge.city,
          state: lodge.state,
          default_payment_amount: Number(lodge.default_payment_amount) || 200,
          payment_gateway: lodge.payment_gateway || 'mercado_pago',
          ...buildStats(lodgePayments),
        };
      });

      // Add "Sem Loja" only if no specific lodge filter is active
      if (!lodgeIdFilter || lodgeIdFilter === 'all') {
        const noLodgePayments = payments.filter(p => !getProfileLodgeId(p.profiles));
        if (noLodgePayments.length > 0) {
          lodgeStats.push({
            id: 'no-lodge',
            name: 'Sem Loja',
            city: null,
            state: null,
            default_payment_amount: 200,
            payment_gateway: 'manual',
            ...buildStats(noLodgePayments),
          });
        }
      }

      return lodgeStats;
    },
  });

  // Soma os totais em centavos para evitar acúmulo de erro de ponto flutuante.
  const totals = reportData?.reduce(
    (acc, lodge) => ({
      paid_count: acc.paid_count + lodge.paid_count,
      pending_count: acc.pending_count + lodge.pending_count,
      overdue_count: acc.overdue_count + lodge.overdue_count,
      total_paid_cents: acc.total_paid_cents + Math.round(lodge.total_paid * 100),
      total_pending_cents: acc.total_pending_cents + Math.round(lodge.total_pending * 100),
      total_overdue_cents: acc.total_overdue_cents + Math.round(lodge.total_overdue * 100),
    }),
    { paid_count: 0, pending_count: 0, overdue_count: 0, total_paid_cents: 0, total_pending_cents: 0, total_overdue_cents: 0 }
  );

  const totalsReais = totals && {
    ...totals,
    total_paid: totals.total_paid_cents / 100,
    total_pending: totals.total_pending_cents / 100,
    total_overdue: totals.total_overdue_cents / 100,
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" aria-hidden="true" />
            Relatório por Loja Maçônica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3" role="status" aria-live="polite" aria-label="Carregando relatório financeiro">
            <span className="sr-only">Carregando relatório…</span>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
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
                <TableHead>Gateway</TableHead>
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
                    <Badge variant="outline" className="text-xs">
                      {lodge.payment_gateway === 'infinitepay' ? 'InfinitePay' : lodge.payment_gateway === 'manual' ? 'Manual' : 'Mercado Pago'}
                    </Badge>
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
                  {formatCurrency(totalsReais?.total_paid || 0)}
                </TableCell>
                <TableCell className="text-right text-yellow-600">
                  {formatCurrency(totalsReais?.total_pending || 0)}
                </TableCell>
                <TableCell className="text-right text-red-600">
                  {formatCurrency(totalsReais?.total_overdue || 0)}
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
