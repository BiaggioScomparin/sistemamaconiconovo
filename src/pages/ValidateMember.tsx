import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import logoGoib from '@/assets/logo-goib.png';

export default function ValidateMember() {
  const { profileId } = useParams<{ profileId: string }>();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['validate-member', profileId],
    queryFn: async () => {
      if (!profileId) throw new Error('ID não fornecido');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, status, degree, cim_number, lodges:lodge_id(name, city, state)')
        .eq('id', profileId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });

  const isActive = profile?.status === 'approved';
  const lodge = (profile as any)?.lodges;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logoGoib} alt="GOIB" className="h-20 w-20 object-contain" />
          </div>
          <CardTitle className="font-display text-xl">
            Validação de Membro
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Grande Oriente Independente do Brasil
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">Verificando...</p>
            </div>
          ) : error || !profile ? (
            <div className="flex flex-col items-center py-8">
              <XCircle className="h-16 w-16 text-destructive" />
              <p className="mt-4 text-lg font-semibold text-destructive">
                Membro não encontrado
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                O código QR escaneado não corresponde a nenhum membro registrado.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex justify-center">
                {isActive ? (
                  <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-full">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">Membro Ativo</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-4 py-2 rounded-full">
                    <XCircle className="h-5 w-5" />
                    <span className="font-semibold">Membro Inativo</span>
                  </div>
                )}
              </div>

              {/* Member Info */}
              <div className="space-y-4 border-t pt-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Nome</p>
                  <p className="font-semibold">{profile.full_name}</p>
                </div>

                {profile.cim_number && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">CIM</p>
                    <p className="font-semibold">{profile.cim_number}</p>
                  </div>
                )}

                {profile.degree && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Grau</p>
                    <p className="font-semibold">{profile.degree}</p>
                  </div>
                )}

                {lodge && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Loja Maçônica</p>
                    <p className="font-semibold">
                      {lodge.name}
                      {lodge.city && ` - ${lodge.city}`}
                      {lodge.state && `/${lodge.state}`}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t pt-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Verificação realizada em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
