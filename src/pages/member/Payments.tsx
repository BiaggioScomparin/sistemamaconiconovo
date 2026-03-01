import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { CreditCard, CheckCircle, Clock, AlertCircle, QrCode, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

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
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [generatingPixId, setGeneratingPixId] = useState<string | null>(null);
  const [creditCardFee, setCreditCardFee] = useState(4.99);
  const [generatingCardCheckoutId, setGeneratingCardCheckoutId] = useState<string | null>(null);
  const [paymentGateway, setPaymentGateway] = useState('mercado_pago');

  // Derive payment gateway from the member's lodge
  useEffect(() => {
    if (profile) {
      const lodgeData = (profile as any)?.lodges || (profile as any)?.lodge;
      if (lodgeData?.payment_gateway) {
        setPaymentGateway(lodgeData.payment_gateway);
      }
    }
  }, [profile]);

  // Fetch credit card fee from settings
  const { data: settings } = useQuery({
    queryKey: ['app-settings-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .eq('key', 'credit_card_fee_percent');

      if (error) {
        console.error('Error fetching settings:', error);
        return [];
      }
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      const feeSetting = settings.find(s => s.key === 'credit_card_fee_percent');
      if (feeSetting?.value) {
        setCreditCardFee(parseFloat(feeSetting.value));
      }
    }
  }, [settings]);

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

  const generatePixMutation = useMutation({
    mutationFn: async (payment: Payment) => {
      const now = new Date();
      const due = parseISO(payment.due_date);
      // Usa o valor armazenado + multa de 50 se em atraso
      const amount = now > due ? payment.amount + 50 : payment.amount;

      // Choose the correct function based on gateway
      const functionName = paymentGateway === 'infinitepay' ? 'generate-pix-infinitepay' : 'generate-pix';

      const response = await supabase.functions.invoke(functionName, {
        body: {
          payment_id: payment.id,
          amount,
          description: `Mensalidade ${monthNames[payment.reference_month - 1]}/${payment.reference_year}`,
          payer_name: profile?.full_name,
          payer_email: profile?.email,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-payments'] });
      toast.success('QR Code PIX gerado com sucesso!');
      setGeneratingPixId(null);
    },
    onError: (error: any) => {
      console.error('Error generating PIX:', error);
      toast.error(error?.message || 'Erro ao gerar QR Code PIX');
      setGeneratingPixId(null);
    },
  });

  const createCardCheckoutMutation = useMutation({
    mutationFn: async (payment: Payment) => {
      const cardAmount = getCardAmount(payment);

      // Choose the correct function based on gateway
      const functionName = paymentGateway === 'infinitepay' ? 'create-card-checkout-infinitepay' : 'create-card-checkout';

      const response = await supabase.functions.invoke(functionName, {
        body: {
          payment_id: payment.id,
          amount: parseFloat(cardAmount.toFixed(2)),
          description: `Mensalidade ${monthNames[payment.reference_month - 1]}/${payment.reference_year}`,
          payer_name: profile?.full_name,
          payer_email: profile?.email,
          back_url: window.location.origin + '/member/payments',
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      setGeneratingCardCheckoutId(null);
      if (data.checkout_url) {
        // Redireciona para o checkout
        window.location.href = data.checkout_url;
      } else {
        toast.error('Erro ao obter URL de checkout');
      }
    },
    onError: (error: any) => {
      console.error('Error creating checkout:', error);
      toast.error(error?.message || 'Erro ao criar checkout');
      setGeneratingCardCheckoutId(null);
    },
  });

  const getAmount = (payment: Payment) => {
    const now = new Date();
    const due = parseISO(payment.due_date);
    // Se está em atraso e não pago, adiciona 50 reais de multa
    if (now > due && payment.status !== 'paid') {
      return payment.amount + 50;
    }
    return payment.amount;
  };

  const getCardAmount = (payment: Payment) => {
    const baseAmount = getAmount(payment);
    // Calcula o valor com taxa repassada: valor / (1 - taxa/100)
    return baseAmount / (1 - creditCardFee / 100);
  };

  const handleGeneratePix = (payment: Payment) => {
    setGeneratingPixId(payment.id);
    generatePixMutation.mutate(payment);
  };

  const handleCardPayment = (payment: Payment) => {
    setGeneratingCardCheckoutId(payment.id);
    createCardCheckoutMutation.mutate(payment);
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
              {(() => {
                const lodgeData = profile?.lodges || profile?.lodge;
                const baseAmount = lodgeData?.default_payment_amount ?? 200;
                const lateAmount = baseAmount + 50;
                return `Valor: R$ ${baseAmount.toFixed(2).replace('.', ',')} até dia 10 | R$ ${lateAmount.toFixed(2).replace('.', ',')} após dia 10`;
              })()}
              <br />
              <span className="text-xs text-muted-foreground">
                Pagamento com cartão inclui taxa de {creditCardFee.toFixed(2).replace('.', ',')}%
              </span>
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
                    <span className="text-muted-foreground">Valor PIX:</span>
                    <span className="font-medium">
                      R$ {getAmount(payment).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor Cartão:</span>
                    <span className="font-medium">
                      R$ {getCardAmount(payment).toFixed(2).replace('.', ',')}
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
                  {payment.status !== 'paid' && paymentGateway !== 'manual' && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {payment.pix_qr_code ? (
                        <Button 
                          variant="outline" 
                          className="w-full h-auto py-2 px-3"
                          onClick={() => setSelectedPayment(payment)}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <QrCode className="h-5 w-5" />
                            <span className="text-xs font-medium">PIX</span>
                            <span className="text-xs">R$ {getAmount(payment).toFixed(2).replace('.', ',')}</span>
                          </div>
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          className="w-full h-auto py-2 px-3"
                          onClick={() => handleGeneratePix(payment)}
                          disabled={generatingPixId === payment.id}
                        >
                          <div className="flex flex-col items-center gap-1">
                            {generatingPixId === payment.id ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <QrCode className="h-5 w-5" />
                            )}
                            <span className="text-xs font-medium">PIX</span>
                            <span className="text-xs">R$ {getAmount(payment).toFixed(2).replace('.', ',')}</span>
                          </div>
                        </Button>
                      )}
                      <Button 
                        variant="default" 
                        className="w-full h-auto py-2 px-3"
                        onClick={() => handleCardPayment(payment)}
                        disabled={generatingCardCheckoutId === payment.id}
                      >
                        <div className="flex flex-col items-center gap-1">
                          {generatingCardCheckoutId === payment.id ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <CreditCard className="h-5 w-5" />
                          )}
                          <span className="text-xs font-medium">Cartão</span>
                          <span className="text-xs">R$ {getCardAmount(payment).toFixed(2).replace('.', ',')}</span>
                        </div>
                      </Button>
                    </div>
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

      {/* Dialog PIX QR Code */}
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
                    toast.success('Código PIX copiado!');
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
