import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Save, Settings as SettingsIcon, Percent, Database } from 'lucide-react';
import { DatabaseBackupButton } from '@/components/admin/DatabaseBackupButton';

interface AppSetting {
  id: string;
  key: string;
  value: string | null;
  description: string | null;
}

export default function Settings() {
  const queryClient = useQueryClient();
  const [mercadoPagoToken, setMercadoPagoToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [creditCardFee, setCreditCardFee] = useState('4.99');

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

  const handleSaveToken = () => {
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
                    type={showToken ? 'text' : 'password'}
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
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button onClick={handleSaveToken} disabled={updateSettingMutation.isPending}>
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
