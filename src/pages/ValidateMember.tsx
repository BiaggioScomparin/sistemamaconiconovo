import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import logoGoib from '@/assets/logo-goib.png';
import { supabase } from '@/integrations/supabase/client';

interface MemberData {
  full_name: string;
  cim_number: string | null;
  member_status: string;
  lodge_name: string | null;
  lodge_city: string | null;
  lodge_state: string | null;
}

export default function ValidateMember() {
  const params = useParams<{ profileId?: string; '*': string }>();

  // Extract raw ID parameter or pathname segment
  const rawParam = (
    params['*'] || 
    params.profileId || 
    window.location.pathname.replace(/^\/validar\/?/, '')
  ).trim();

  const { data: member, isLoading, error } = useQuery({
    queryKey: ['validate-member', rawParam],
    queryFn: async (): Promise<MemberData> => {
      if (!rawParam) throw new Error('ID não fornecido');

      // Generate candidates to handle hardware barcode scanner keyboard layout issues
      // (e.g., Brazilian keyboard layout scanners translating '7' to '/')
      const candidates: string[] = [];
      
      // Candidate 1: As-is
      candidates.push(rawParam);

      // Candidate 2: Replace '/' with '7'
      const replaced7 = rawParam.replace(/\//g, '7');
      if (replaced7 !== rawParam) {
        candidates.push(replaced7);
      }

      // Candidate 3: Remove slashes
      const removedSlashes = rawParam.replace(/\//g, '');
      if (removedSlashes !== rawParam && removedSlashes !== replaced7) {
        candidates.push(removedSlashes);
      }

      // Try RPC function for each candidate (bypasses RLS safely via SECURITY DEFINER)
      for (const candidate of candidates) {
        try {
          const { data, error: rpcError } = await supabase.rpc('get_public_member_profile', {
            p_id: candidate,
          });

          if (!rpcError && data && (data as any).full_name) {
            return data as MemberData;
          }
        } catch (err) {
          console.warn('RPC check error for candidate:', candidate, err);
        }
      }

      // Fallback: Edge function call
      for (const candidate of candidates) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-member?id=${encodeURIComponent(candidate)}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          if (response.ok) {
            return await response.json();
          }
        } catch (err) {
          console.warn('Edge function check error for candidate:', candidate, err);
        }
      }

      throw new Error('Membro não encontrado');
    },
    enabled: !!rawParam,
  });

  const isActive = member?.member_status === 'active';

  const lodgeInfo = member?.lodge_name 
    ? `${member.lodge_name}${member.lodge_city ? ` - ${member.lodge_city}` : ''}${member.lodge_state ? `/${member.lodge_state}` : ''}`
    : null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-primary/20">
        <CardHeader className="text-center pb-2">
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
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Verificando dados do membro...</p>
            </div>
          ) : error || !member ? (
            <div className="flex flex-col items-center py-8">
              <XCircle className="h-16 w-16 text-destructive" />
              <p className="mt-4 text-lg font-semibold text-destructive">
                Membro não encontrado
              </p>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                O código QR escaneado não corresponde a nenhum membro registrado na jurisdição.
              </p>
            </div>
          ) : (
            <div className="space-y-6 pt-2">
              {/* Status Badge */}
              <div className="flex justify-center">
                {isActive ? (
                  <div className="flex items-center gap-2 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 px-5 py-2.5 rounded-full shadow-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span className="font-bold text-base">Membro Ativo</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-red-500/15 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800 px-5 py-2.5 rounded-full shadow-sm">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="font-bold text-base">Membro Inativo</span>
                  </div>
                )}
              </div>

              {/* Member Info */}
              <div className="space-y-4 border-t border-border pt-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome Completo</p>
                  <p className="font-semibold text-lg text-foreground mt-0.5">{member.full_name}</p>
                </div>

                {member.cim_number && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CIM</p>
                    <p className="font-mono font-bold text-primary text-base mt-0.5">{member.cim_number}</p>
                  </div>
                )}

                {lodgeInfo && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Loja Maçônica</p>
                    <p className="font-medium text-foreground mt-0.5">{lodgeInfo}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-border pt-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Verificação oficial realizada em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
