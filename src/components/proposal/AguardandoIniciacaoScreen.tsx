import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Building2, 
  MapPin, 
  ShieldCheck, 
  Shirt, 
  HeartPulse, 
  Droplets, 
  PhoneOff, 
  LogOut,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';

export default function AguardandoIniciacaoScreen({ profile }: { profile: any }) {
  const { signOut } = useAuth();

  // Fetch lodge details if profile.lodge_id exists
  const { data: lodge } = useQuery({
    queryKey: ['lodge-details', profile?.lodge_id],
    queryFn: async () => {
      if (!profile?.lodge_id) return null;
      const { data } = await supabase
        .from('lodges')
        .select('*')
        .eq('id', profile.lodge_id)
        .maybeSingle();
      return data;
    },
    enabled: !!profile?.lodge_id,
  });

  const formattedDate = profile?.initiation_scheduled_date
    ? new Date(profile.initiation_scheduled_date + 'T00:00:00').toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-3xl w-full space-y-6">

        {/* Top Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-4 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Calendar className="h-10 w-10 animate-pulse" />
          </div>
          <div>
            <Badge className="bg-purple-600 text-white font-bold text-xs py-1 px-4 mb-2">
              🏛️ AGUARDANDO INICIAÇÃO MAÇÔNICA
            </Badge>
            <h1 className="text-3xl font-display text-foreground">
              Sua Iniciação Está Agendada!
            </h1>
          </div>
          <p className="text-muted-foreground font-body max-w-lg mx-auto text-sm leading-relaxed">
            Prezado <strong>{profile?.full_name}</strong>, sua proposta de admissão foi aprovada. Acompanhe abaixo a data, o local da sua cerimônia e as orientações preparatórias.
          </p>
        </div>

        {/* Card 1: Data, Loja & Endereço */}
        <Card className="card-elegant border-purple-500/40 bg-gradient-to-br from-purple-500/10 via-background to-background">
          <CardHeader className="pb-3 border-b border-purple-500/20">
            <CardTitle className="text-lg font-display text-foreground flex items-center gap-2">
              <Building2 className="h-5 w-5 text-purple-400" />
              Dados da Cerimônia & Local
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Data Marcada */}
              <div className="p-4 rounded-xl bg-accent/50 border border-border space-y-1">
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={14} className="text-purple-400" /> Data Marcada para a Iniciação
                </span>
                <p className="text-base font-bold text-foreground capitalize">
                  {formattedDate || (profile?.initiation_scheduled_date ? profile.initiation_scheduled_date : 'A definir pela Secretaria')}
                </p>
              </div>

              {/* Nome da Loja */}
              <div className="p-4 rounded-xl bg-accent/50 border border-border space-y-1">
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 size={14} className="text-purple-400" /> Loja Maçônica
                </span>
                <p className="text-base font-bold text-foreground">
                  {lodge?.name || profile?.lodges?.name || 'Grande Oriente Independente do Brasil (GOIB)'}
                </p>
              </div>

              {/* Endereço do Templo */}
              <div className="sm:col-span-2 p-4 rounded-xl bg-accent/50 border border-border space-y-1">
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={14} className="text-purple-400" /> Endereço do Templo
                </span>
                <p className="text-sm font-medium text-foreground">
                  {lodge?.street 
                    ? [lodge?.street, lodge?.city, lodge?.state].filter(Boolean).join(' - ') 
                    : [lodge?.name || profile?.lodges?.name, lodge?.city || profile?.lodges?.city, lodge?.state || profile?.lodges?.state].filter(Boolean).join(' - ') || 
                      'Templo Principal da Loja Maçônica'}
                </p>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Card 2: Orientações de Preparação e Traje */}
        <Card className="card-elegant border-amber-500/30">
          <CardHeader className="pb-3 border-b border-amber-500/20">
            <CardTitle className="text-lg font-display text-foreground flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-500" />
              Orientações Importantes & Instruções para o Candidato
            </CardTitle>
            <CardDescription className="text-xs">
              Siga atentamente as recomendações abaixo para o dia da sua iniciação:
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3.5">
            
            {/* Traje Maçônico */}
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/30 flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-500 shrink-0">
                <Shirt size={20} />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-foreground text-sm">👔 Traje Maçônico Obrigatório:</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Comparecer obrigatoriamente trajando <strong>Terno Preto</strong>, <strong>Gravata Preta</strong>, <strong>Sapato Preto e Meias Pretas</strong>, com <strong>Camisa Social Branca</strong>.
                </p>
              </div>
            </div>

            {/* Problema de Saúde */}
            <div className="p-4 rounded-xl bg-accent/40 border border-border flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-rose-500/20 text-rose-500 shrink-0">
                <HeartPulse size={20} />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-foreground text-sm">🩺 Cuidados de Saúde:</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Se tiver qualquer condição ou problema de saúde, avise <strong>no momento da sua chegada</strong> ao Mestre Maçom que irá acompanhar a sua preparação no Templo.
                </p>
              </div>
            </div>

            {/* Alimentação & Hidratação */}
            <div className="p-4 rounded-xl bg-accent/40 border border-border flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/20 text-blue-500 shrink-0">
                <Droplets size={20} />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-foreground text-sm">💧 Alimentação & Hidratação:</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Compareça <strong>bem alimentado e bem hidratado</strong> antes de se apresentar no horário agendado.
                </p>
              </div>
            </div>

            {/* Família & Desconexão do Celular */}
            <div className="p-4 rounded-xl bg-accent/40 border border-border flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-500 shrink-0">
                <PhoneOff size={20} />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-foreground text-sm">📵 Aviso à Família & Desconexão:</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Avise a sua família previamente sobre onde você estará neste momento e informe que você <strong>ficará sem o uso do celular durante a realização da cerimônia de iniciação</strong>.
                </p>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center pt-2">
          <Button variant="outline" onClick={() => signOut()} className="gap-2 text-xs">
            <LogOut size={14} /> Sair do Sistema
          </Button>
        </div>

      </div>
    </div>
  );
}
