import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Save, Settings as SettingsIcon, Percent, Database, CreditCard } from 'lucide-react';
import { DatabaseBackupButton } from '@/components/admin/DatabaseBackupButton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface AppSetting {
  id: string;
  key: string;
  value: string | null;
  description: string | null;
}

export default function Settings() {
  const queryClient = useQueryClient();
  const [mercadoPagoToken, setMercadoPagoToken] = useState('');
  const [showMpToken, setShowMpToken] = useState(false);
  const [creditCardFee, setCreditCardFee] = useState('4.99');
  const [paymentGateway, setPaymentGateway] = useState('mercado_pago');
  const [infinitepayClientId, setInfinitepayClientId] = useState('');
  const [infinitepayClientSecret, setInfinitepayClientSecret] = useState('');
  const [showInfinitepaySecret, setShowInfinitepaySecret] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*');

      if (error) throw error;
      return data as AppSetting[];
    },
  });

  useEffect(() => {
    if (settings) {
      const mpToken = settings.find(s => s.key === 'mercado_pago_access_token');
      if (mpToken?.value) {
        setMercadoPagoToken(mpToken.value);
      }
      const ccFee = settings.find(s => s.key === 'credit_card_fee_percent');
      if (ccFee?.value) {
        setCreditCardFee(ccFee.value);
      }
      const gateway = settings.find(s => s.key === 'payment_gateway');
      if (gateway?.value) {
        setPaymentGateway(gateway.value);
      }
      const ipClientId = settings.find(s => s.key === 'infinitepay_client_id');
      if (ipClientId?.value) {
        setInfinitepayClientId(ipClientId.value);
      }
      const ipClientSecret = settings.find(s => s.key === 'infinitepay_client_secret');
      if (ipClientSecret?.value) {
        setInfinitepayClientSecret(ipClientSecret.value);
      }
    }
  }, [settings]);

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('app_settings')
        .update({ value })
        .eq('key', key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      toast.success('Configuração salva com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating setting:', error);
      toast.error('Erro ao salvar configuração');
    },
  });

  const handleSaveMpToken = () => {
    if (!mercadoPagoToken.trim()) {
      toast.error('Por favor, insira o token do Mercado Pago');
      return;
    }
    updateSettingMutation.mutate({
      key: 'mercado_pago_access_token',
      value: mercadoPagoToken,
    });
  };

  const handleSaveFee = () => {
    const feeValue = parseFloat(creditCardFee);
    if (isNaN(feeValue) || feeValue < 0 || feeValue > 100) {
      toast.error('Por favor, insira uma taxa válida (0-100%)');
      return;
    }
    updateSettingMutation.mutate({
      key: 'credit_card_fee_percent',
      value: creditCardFee,
    });
  };

  const handleSaveGateway = (value: string) => {
    setPaymentGateway(value);
    // Gateway is now configured per lodge, this is kept for backward compatibility
    updateSettingMutation.mutate({
      key: 'payment_gateway',
      value: value,
    });
  };

  const handleSaveInfinitepayCredentials = () => {
    if (!infinitepayClientId.trim() || !infinitepayClientSecret.trim()) {
      toast.error('Por favor, insira o Client ID e Client Secret do InfinitePay');
      return;
    }
    
    Promise.all([
      updateSettingMutation.mutateAsync({ key: 'infinitepay_client_id', value: infinitepayClientId }),
      updateSettingMutation.mutateAsync({ key: 'infinitepay_client_secret', value: infinitepayClientSecret }),
    ]).then(() => {
      toast.success('Credenciais do InfinitePay salvas com sucesso!');
    }).catch(() => {
      toast.error('Erro ao salvar credenciais do InfinitePay');
    });
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
          <SettingsIcon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Configurações</h1>
            <p className="text-muted-foreground">Gerencie as configurações do sistema</p>
          </div>
        </div>

        {/* Mercado Pago Config */}
        {paymentGateway === 'mercado_pago' && (
          <Card>
            <CardHeader>
              <CardTitle>Integração Mercado Pago</CardTitle>
              <CardDescription>
                Configure o token de acesso do Mercado Pago para habilitar pagamentos via PIX e Cartão
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mercado-pago-token">Access Token</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="mercado-pago-token"
                      type={showMpToken ? 'text' : 'password'}
                      value={mercadoPagoToken}
                      onChange={(e) => setMercadoPagoToken(e.target.value)}
                      placeholder="APP_USR-XXXXXXXX..."
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowMpToken(!showMpToken)}
                    >
                      {showMpToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button onClick={handleSaveMpToken} disabled={updateSettingMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Você pode obter o Access Token no painel do Mercado Pago em: 
                  Seu negócio → Configurações → Gestão e Administração → Credenciais
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* InfinitePay Config */}
        {paymentGateway === 'infinitepay' && (
          <Card>
            <CardHeader>
              <CardTitle>Integração InfinitePay</CardTitle>
              <CardDescription>
                Configure as credenciais do InfinitePay para habilitar pagamentos via PIX e Cartão.
                Entre em contato com parcerias@cloudwalk.io para obter suas credenciais de API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="infinitepay-client-id">Client ID</Label>
                <Input
                  id="infinitepay-client-id"
                  type="text"
                  value={infinitepayClientId}
                  onChange={(e) => setInfinitepayClientId(e.target.value)}
                  placeholder="Seu Client ID..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="infinitepay-client-secret">Client Secret</Label>
                <div className="relative">
                  <Input
                    id="infinitepay-client-secret"
                    type={showInfinitepaySecret ? 'text' : 'password'}
                    value={infinitepayClientSecret}
                    onChange={(e) => setInfinitepayClientSecret(e.target.value)}
                    placeholder="Seu Client Secret..."
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowInfinitepaySecret(!showInfinitepaySecret)}
                  >
                    {showInfinitepaySecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button onClick={handleSaveInfinitepayCredentials} disabled={updateSettingMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Salvar Credenciais
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Taxa de Cartão de Crédito
            </CardTitle>
            <CardDescription>
              Configure a taxa que será repassada ao membro para pagamentos com cartão de crédito
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="credit-card-fee">Taxa (%)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="credit-card-fee"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={creditCardFee}
                    onChange={(e) => setCreditCardFee(e.target.value)}
                    placeholder="4.99"
                  />
                </div>
                <Button onClick={handleSaveFee} disabled={updateSettingMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Esta taxa será adicionada ao valor da mensalidade quando o membro optar por pagar com cartão de crédito.
                Exemplo: mensalidade de R$ 200,00 com taxa de {creditCardFee}% = R$ {(200 / (1 - parseFloat(creditCardFee || '0') / 100)).toFixed(2).replace('.', ',')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Backup do Sistema
            </CardTitle>
            <CardDescription>
              Exporte todos os dados do sistema em formato JSON para backup
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DatabaseBackupButton />
            <p className="text-sm text-muted-foreground mt-2">
              O backup inclui: membros, lojas, eventos, presenças, atas, pagamentos e todas as outras tabelas do sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
