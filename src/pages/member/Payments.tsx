import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreditCard, CheckCircle, Clock, AlertCircle, QrCode } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface Payment {
  id: string;
  reference_month: number;
  reference_year: number;
  amount: number;
  due_date: string;
  status: string;
  paid_at: string | null;
  pix_qr_code: string | null;
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

export default function Payments() {
  const { data: profile } = useProfile();
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const { data: payments, isLoading } = useQuery({
    queryKey: ['member-payments', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('monthly_payments')
        .select('*')
        .eq('profile_id', profile.id)
        .order('reference_year', { ascending: false })
        .order('reference_month', { ascending: false });

      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!profile?.id,
  });

  const getAmount = (payment: Payment) => {
    const now = new Date();
    const due = parseISO(payment.due_date);
    // After day 10, value is 250
    if (now > due && payment.status !== 'paid') {
      return 250;
    }
    return payment.amount;
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <CreditCard className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Mensalidades</h1>
            <p className="text-muted-foreground">Gerencie suas mensalidades e pagamentos</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações de Pagamento</CardTitle>
            <CardDescription>
              Valor: R$ 200,00 até dia 10 | R$ 250,00 após dia 10
            </CardDescription>
          </CardHeader>
        </Card>

        {payments && payments.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {payments.map((payment) => (
              <Card key={payment.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {monthNames[payment.reference_month - 1]} {payment.reference_year}
                    </CardTitle>
                    {getStatusBadge(payment.status, payment.due_date)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor:</span>
                    <span className="font-medium">
                      R$ {getAmount(payment).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Vencimento:</span>
                    <span>{format(parseISO(payment.due_date), "dd/MM/yyyy")}</span>
                  </div>
                  {payment.paid_at && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pago em:</span>
                      <span>{format(parseISO(payment.paid_at), "dd/MM/yyyy 'às' HH:mm")}</span>
                    </div>
                  )}
                  {payment.status !== 'paid' && payment.pix_qr_code && (
                    <Button 
                      variant="outline" 
                      className="w-full mt-2"
                      onClick={() => setSelectedPayment(payment)}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Ver QR Code PIX
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma mensalidade encontrada</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code PIX</DialogTitle>
          </DialogHeader>
          {selectedPayment?.pix_qr_code && (
            <div className="flex flex-col items-center space-y-4">
              <QRCodeSVG value={selectedPayment.pix_qr_code} size={256} />
              <p className="text-sm text-muted-foreground text-center">
                Escaneie o QR Code com o app do seu banco para pagar
              </p>
              <div className="w-full">
                <p className="text-xs text-muted-foreground mb-1">Código PIX:</p>
                <div className="bg-muted p-2 rounded text-xs break-all">
                  {selectedPayment.pix_qr_code}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedPayment.pix_qr_code!);
                    import('sonner').then(({ toast }) => toast.success('Código PIX copiado!'));
                  }}
                >
                  Copiar Código
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
