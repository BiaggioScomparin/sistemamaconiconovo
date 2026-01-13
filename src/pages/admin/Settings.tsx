import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Save, Settings as SettingsIcon } from 'lucide-react';

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
              Configure o token de acesso do Mercado Pago para habilitar pagamentos via PIX
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
      </div>
    </AppLayout>
  );
}
