import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter,
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  LogOut, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  ShieldAlert, 
  Sparkles, 
  MessageSquare, 
  Building2, 
  Edit3, 
  Search, 
  Check, 
  RefreshCw 
} from 'lucide-react';
import logoGoib from '@/assets/logo-goib.png';
import AguardandoIniciacaoScreen from '@/components/proposal/AguardandoIniciacaoScreen';
import { toast } from 'sonner';

interface Step {
  id: number;
  label: string;
  shortLabel: string;
  description: string;
}

const STEPS: Step[] = [
  { id: 1, label: 'Proposta Recebida', shortLabel: 'Proposta', description: 'Seus dados foram cadastrados e estão em pré-análise.' },
  { id: 2, label: 'Em Sindicância', shortLabel: 'Sindicância', description: 'A comissão de sindicantes fará o contato e a entrevista.' },
  { id: 3, label: 'Votação em Loja', shortLabel: 'Votação', description: 'Apreciação e aprovação do perfil pelos Irmãos da Loja.' },
  { id: 4, label: 'Iniciação Agendada', shortLabel: 'Iniciação', description: 'Admissão e orientação para a cerimônia solene.' },
];

function getActiveStep(status: string): number {
  switch (status) {
    case 'proposta': return 1;
    case 'sindicancia': return 2;
    case 'votacao': return 3;
    case 'aprovado':
    case 'aguardando_iniciacao': return 4;
    case 'membro': return 4;
    default: return 1;
  }
}

const STATUS_DETAILS: Record<string, { label: string; badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string; description: string; alertNotice?: string }> = {
  proposta: {
    label: 'Proposta Recebida em Análise',
    badgeVariant: 'secondary',
    color: 'text-amber-500',
    description: 'Sua proposta foi registrada com sucesso no sistema da Grande Secretaria do GOIB. Em breve a comissão entrará em contato para agendar a conversa inicial.',
    alertNotice: 'Mantenha seus números de telefone e e-mail atualizados para não perder o agendamento da sindicância.'
  },
  sindicancia: {
    label: 'Processo de Sindicância em Andamento',
    badgeVariant: 'default',
    color: 'text-blue-500',
    description: 'Sua proposta está sob avaliação da Comissão de Sindicância. Os mestres sindicantes entrarão em contato para realizar a entrevista formal.',
    alertNotice: 'Tenha em mãos documento oficial com foto (RG ou CNH) para apresentar à comissão quando solicitado.'
  },
  votacao: {
    label: 'Em Votação Plenária na Loja',
    badgeVariant: 'secondary',
    color: 'text-purple-500',
    description: 'O relatório de sindicância foi concluído e sua candidatura está em pauta para votação solene na Loja Maçônica.',
    alertNotice: 'Esta etapa é conduzida internamente na sessão da Loja. Aguarde o retorno oficial da secretaria.'
  },
  aprovado: {
    label: 'Candidatura Aprovada',
    badgeVariant: 'default',
    color: 'text-emerald-500',
    description: 'Parabéns! Sua candidatura foi aprovada com louvor. A secretaria definirá a data da cerimônia de iniciação.',
    alertNotice: 'Em breve você receberá as instruções sobre traje e preparação para a noite de Iniciação.'
  },
  reprovado: {
    label: 'Proposta Não Aprovada',
    badgeVariant: 'destructive',
    color: 'text-rose-500',
    description: 'Infelizmente sua candidatura não foi aprovada neste momento.',
    alertNotice: 'Para mais esclarecimentos ou informações, entre em contato direto com a secretaria do GOIB.'
  },
  rejected: {
    label: 'Proposta Não Aprovada',
    badgeVariant: 'destructive',
    color: 'text-rose-500',
    description: 'Infelizmente sua candidatura não foi aprovada neste momento.',
    alertNotice: 'Para mais esclarecimentos ou informações, entre em contato direto com a secretaria do GOIB.'
  }
};

export default function ProposalStatus() {
  const { user, loading, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading, refetch } = useProfile();
  const updateProfileMutation = useUpdateProfile();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    email: '',
    profession: '',
    city: '',
    state: ''
  });

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
          <p className="text-muted-foreground text-sm font-medium">Carregando portal do candidato...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

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

  if ((profile.status as string) === 'membro') {
    return <Navigate to="/member/inicial" replace />;
  }

  if ((profile.status as string) === 'aguardando_iniciacao') {
    return <AguardandoIniciacaoScreen profile={profile} />;
  }

  const statusKey = profile.status || 'proposta';
  const statusConfig = STATUS_DETAILS[statusKey] || STATUS_DETAILS.proposta;
  const currentStep = getActiveStep(statusKey);
  const isRejected = statusKey === 'reprovado' || statusKey === 'rejected';

  const handleOpenEdit = () => {
    setFormData({
      phone: profile?.phone || profile?.mobile_phone || '',
      email: profile?.email || '',
      profession: profile?.profession || '',
      city: profile?.city || '',
      state: profile?.state || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfileMutation.mutateAsync({
        phone: formData.phone,
        profession: formData.profession,
        city: formData.city,
        state: formData.state
      });
      toast.success('Seus dados de contato foram atualizados com sucesso!');
      setIsEditDialogOpen(false);
      refetch();
    } catch (err: any) {
      toast.error('Erro ao atualizar dados: ' + (err.message || 'Tente novamente.'));
    }
  };

  const candidateName = profile?.full_name || 'Candidato';
  const whatsappMsg = encodeURIComponent(`Olá, secretaria do GOIB! Sou o candidato ${candidateName} e gostaria de consultar informações sobre a minha sindicância.`);
  const whatsappUrl = `https://wa.me/555499999999?text=${whatsappMsg}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/15 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Top Header Card */}
        <Card className="card-elegant border-purple-500/20 bg-gradient-to-r from-purple-900/10 via-background to-background">
          <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl shrink-0">
                <img src={logoGoib} alt="GOIB Logo" className="h-14 w-14 object-contain" />
              </div>
              <div>
                <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                  <Badge variant={statusConfig.badgeVariant} className="px-3 py-0.5 text-xs font-semibold">
                    {statusConfig.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">| GOIB Portal</span>
                </div>
                <h1 className="text-2xl font-display font-bold text-foreground">
                  Portal do Candidato
                </h1>
                <p className="text-sm text-muted-foreground">
                  Acompanhamento em tempo real da sua proposta de admissão
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()} 
                className="gap-2 text-xs"
              >
                <RefreshCw size={14} /> Atualizar
              </Button>

              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => signOut()} 
                className="gap-2 text-xs"
              >
                <LogOut size={14} /> Sair
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Visual Progress Stepper */}
        {!isRejected && (
          <Card className="card-elegant border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-400" />
                Linha do Tempo da Candidatura
              </CardTitle>
              <CardDescription className="text-xs">
                Progresso das etapas administrativas e de sindicância
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 pb-6">
              <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-2">
                {/* Desktop Connecting Line */}
                <div className="hidden md:block absolute top-5 left-10 right-10 h-1 bg-muted -z-0">
                  <div 
                    className="h-full bg-purple-600 transition-all duration-500"
                    style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
                  />
                </div>

                {STEPS.map((step) => {
                  const isCompleted = currentStep > step.id;
                  const isCurrent = currentStep === step.id;

                  return (
                    <div 
                      key={step.id} 
                      className="flex md:flex-col items-center gap-3 md:gap-2 z-10 w-full md:w-1/4 text-left md:text-center"
                    >
                      <div 
                        className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                            : isCurrent
                            ? 'bg-purple-600 text-white ring-4 ring-purple-500/20 shadow-lg shadow-purple-900/40 animate-pulse'
                            : 'bg-muted text-muted-foreground border border-border'
                        }`}
                      >
                        {isCompleted ? <Check size={18} /> : step.id}
                      </div>

                      <div>
                        <p className={`text-sm font-semibold ${isCurrent ? 'text-purple-400 font-bold' : isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {step.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground hidden md:block leading-tight mt-1">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Grid: Status Details & Candidate Profile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Status & Next Steps (2 cols) */}
          <div className="md:col-span-2 space-y-6">

            {/* Current Status Explanation */}
            <Card className="card-elegant border-border">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Search className="h-5 w-5 text-purple-400" />
                  Situação Atual do Processo
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-accent/40 border border-border">
                  <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
                    <Building2 size={24} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-foreground">
                      {statusConfig.label}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {statusConfig.description}
                    </p>
                  </div>
                </div>

                {statusConfig.alertNotice && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                    <ShieldAlert size={18} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-200/90 leading-relaxed font-medium">
                      {statusConfig.alertNotice}
                    </p>
                  </div>
                )}

                {/* Assigned Lodge if available */}
                {profile?.lodges && (
                  <div className="p-4 rounded-xl bg-secondary/20 border border-border space-y-1">
                    <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                      Loja Maçônica Designada
                    </span>
                    <p className="text-sm font-bold text-foreground">
                      {profile.lodges.name} ({profile.lodges.city} - {profile.lodges.state})
                    </p>
                  </div>
                )}

                {/* Quick Action: WhatsApp */}
                <div className="pt-2">
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block w-full">
                    <Button variant="outline" className="w-full gap-2 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10">
                      <MessageSquare size={16} /> Falar com a Secretaria via WhatsApp
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations & Directives */}
            <Card className="card-elegant border-border">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-400" />
                  Orientações para o Candidato
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="text-xs text-muted-foreground space-y-2">
                  <div className="p-3 rounded-lg bg-accent/30 flex items-start gap-2">
                    <span className="font-bold text-purple-400">1.</span>
                    <span><strong>Sigilo e Confidencialidade:</strong> O processo de sindicância maçônica é reservado e conduzido com discrição pela comissão.</span>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/30 flex items-start gap-2">
                    <span className="font-bold text-purple-400">2.</span>
                    <span><strong>Entrevista Presencial ou Online:</strong> Você será contatado por 3 mestres sindicantes para conversar sobre suas motivações e histórico.</span>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/30 flex items-start gap-2">
                    <span className="font-bold text-purple-400">3.</span>
                    <span><strong>Atualização de Contatos:</strong> Caso mude de telefone ou e-mail, utilize o botão de edição ao lado para manter seus dados em dia.</span>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Candidate Profile Summary (1 col) */}
          <div className="space-y-6">
            <Card className="card-elegant border-border">
              <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <User className="h-4 w-4 text-purple-400" />
                  Dados do Candidato
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={handleOpenEdit} title="Editar Dados">
                  <Edit3 size={15} className="text-muted-foreground hover:text-foreground" />
                </Button>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Nome Completo</span>
                  <p className="text-sm font-bold text-foreground">{profile?.full_name}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1">
                    <Mail size={12} /> E-mail
                  </span>
                  <p className="text-xs font-medium text-foreground break-all">{profile?.email}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1">
                    <Phone size={12} /> Telefone / WhatsApp
                  </span>
                  <p className="text-xs font-medium text-foreground">{profile?.phone || profile?.mobile_phone || 'Não informado'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1">
                    <Briefcase size={12} /> Profissão
                  </span>
                  <p className="text-xs font-medium text-foreground">{profile?.profession || 'Não informada'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1">
                    <MapPin size={12} /> Cidade / UF
                  </span>
                  <p className="text-xs font-medium text-foreground">
                    {[profile?.city, profile?.state].filter(Boolean).join(' - ') || 'Não informada'}
                  </p>
                </div>

                <Button variant="outline" size="sm" onClick={handleOpenEdit} className="w-full text-xs gap-1.5 mt-2">
                  <Edit3 size={13} /> Editar Contato & Profissão
                </Button>
              </CardContent>
            </Card>

            {/* Security Note */}
            <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 text-center space-y-1">
              <Sparkles size={16} className="mx-auto text-purple-400" />
              <p className="text-xs text-muted-foreground">
                Seus dados estão seguros e protegidos pela LGPD sob o protocolo da Grande Secretaria do GOIB.
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* Edit Profile Modal */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Dados de Contato</DialogTitle>
            <DialogDescription className="text-xs">
              Mantenha seus telefones e cidade atualizados para ser notificado sobre a sindicância.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveContact} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs">Telefone / WhatsApp</Label>
              <Input 
                id="phone" 
                value={formData.phone} 
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 90000-0000"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profession" className="text-xs">Profissão</Label>
              <Input 
                id="profession" 
                value={formData.profession} 
                onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                placeholder="Sua ocupação profissional"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="city" className="text-xs">Cidade</Label>
                <Input 
                  id="city" 
                  value={formData.city} 
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Sua cidade"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state" className="text-xs">Estado</Label>
                <Input 
                  id="state" 
                  value={formData.state} 
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="UF"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateProfileMutation.isPending} className="bg-purple-600 hover:bg-purple-700">
                {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
