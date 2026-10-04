import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, XCircle, FileText, LogOut } from 'lucide-react';
import logoGoib from '@/assets/logo-goib.png';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; description: string }> = {
  proposta: {
    label: 'Proposta em Análise',
    color: 'text-amber-500',
    icon: <Clock className="h-16 w-16 text-amber-500" />,
    description: 'Sua proposta foi recebida e está sendo analisada. Você receberá uma notificação quando houver uma atualização.',
  },
  sindicancia: {
    label: 'Em Sindicância',
    color: 'text-blue-500',
    icon: <FileText className="h-16 w-16 text-blue-500" />,
    description: 'Sua proposta está passando pelo processo de sindicância. Este é um passo importante para a sua admissão.',
  },
  aprovado: {
    label: 'Aprovado',
    color: 'text-green-500',
    icon: <CheckCircle2 className="h-16 w-16 text-green-500" />,
    description: 'Parabéns! Sua proposta foi aprovada. Em breve você terá acesso completo ao sistema.',
  },
  reprovado: {
    label: 'Proposta Não Aprovada',
    color: 'text-red-500',
    icon: <XCircle className="h-16 w-16 text-red-500" />,
    description: 'Infelizmente sua proposta não foi aprovada neste momento. Para mais informações, entre em contato com a secretaria da loja.',
  },
  rejected: {
    label: 'Proposta Não Aprovada',
    color: 'text-red-500',
    icon: <XCircle className="h-16 w-16 text-red-500" />,
    description: 'Infelizmente sua proposta não foi aprovada neste momento. Para mais informações, entre em contato com a secretaria da loja.',
  },
  membro: {
    label: 'Membro Ativo',
    color: 'text-green-500',
    icon: <CheckCircle2 className="h-16 w-16 text-green-500" />,
    description: 'Você é um membro ativo!',
  },
};

export default function ProposalStatus() {
  const { user, loading, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se não tem perfil ou não preencheu os dados essenciais para sindicância, redireciona para preencher a proposta
  const hasStage1Details = Boolean(
    profile &&
    profile.cpf &&
    profile.cpf.trim() !== '' &&
    profile.full_name &&
    profile.full_name.trim() !== '' &&
    profile.full_name !== profile.email
  );

  if (!profile || !hasStage1Details) {
    return <Navigate to="/proposta" replace />;
  }

  // Se for membro, redireciona para área de membro
  if ((profile.status as string) === 'membro') {
    return <Navigate to="/member/inicial" replace />;
  }

  const status = profile.status || 'proposta';
  const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG.proposta;

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/10 p-4">
      <Card className="w-full max-w-lg card-elegant">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-6">
            <img src={logoGoib} alt="GOIB" className="h-20 object-contain" />
          </div>
          <CardTitle className="text-2xl font-display text-foreground">
            Status da sua Proposta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center py-8 space-y-4">
            {statusInfo.icon}
            <h2 className={`text-2xl font-display ${statusInfo.color}`}>
              {statusInfo.label}
            </h2>
            <p className="text-muted-foreground text-center max-w-sm">
              {statusInfo.description}
            </p>
          </div>

          {profile?.full_name && (
            <div className="bg-secondary/10 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Candidato</p>
              <p className="text-foreground font-medium">{profile.full_name}</p>
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground text-center">
              Caso tenha dúvidas sobre o processo, entre em contato com a secretaria da loja.
            </p>
          </div>

          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
