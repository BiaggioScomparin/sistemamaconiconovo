import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import logoGoib from '@/assets/logo-goib.png';

interface MemberData {
  full_name: string;
  cim_number: string | null;
  member_status: string;
  lodge_name: string | null;
  lodge_city: string | null;
  lodge_state: string | null;
}

export default function ValidateMember() {
  const { profileId } = useParams<{ profileId: string }>();

  const { data: member, isLoading, error } = useQuery({
    queryKey: ['validate-member', profileId],
    queryFn: async (): Promise<MemberData> => {
      if (!profileId) throw new Error('ID não fornecido');
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-member?id=${profileId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao validar membro');
      }

      return response.json();
    },
    enabled: !!profileId,
  });

  const isActive = member?.member_status === 'active';

  const lodgeInfo = member?.lodge_name 
    ? `${member.lodge_name}${member.lodge_city ? ` - ${member.lodge_city}` : ''}${member.lodge_state ? `/${member.lodge_state}` : ''}`
    : null;

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
          ) : error || !member ? (
            <div className="flex flex-col items-center py-8">
              <XCircle className="h-16 w-16 text-destructive" />
              <p className="mt-4 text-lg font-semibold text-destructive">
                Membro não encontrado
              </p>
              <p className="text-sm text-muted-foreground mt-2 text-center">
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
                  <p className="font-semibold">{member.full_name}</p>
                </div>

                {member.cim_number && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">CIM</p>
                    <p className="font-semibold">{member.cim_number}</p>
                  </div>
                )}

                {lodgeInfo && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Loja Maçônica</p>
                    <p className="font-semibold">{lodgeInfo}</p>
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
