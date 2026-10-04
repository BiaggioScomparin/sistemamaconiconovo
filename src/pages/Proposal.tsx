import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { fetchAddressByCEP, formatCEP } from '@/lib/viacep';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, CheckCircle, Plus, Trash2, ShieldCheck, FileText, Lock, Sparkles, CheckCircle2, Clock, User } from 'lucide-react';
import { validateImageFile, getValidatedFileName } from '@/lib/fileValidation';
import ProposalAuthGate from '@/components/proposal/ProposalAuthGate';
import AguardandoIniciacaoScreen from '@/components/proposal/AguardandoIniciacaoScreen';

// Formatting utilities
const formatCPF = (value: string): string => {
  const clean = value.replace(/\D/g, '').slice(0, 11);
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
};

// Full Proposal Schema
const proposalSchema = z.object({
  full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  cpf: z.string().min(14, 'CPF inválido'),
  birth_date: z.string().min(1, 'Data de nascimento é obrigatória'),
  naturality: z.string().optional(),
  nationality: z.string().optional(),
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  residence_time: z.string().optional(),
  phone: z.string().optional(),
  cell_phone: z.string().optional(),
  identity_number: z.string().optional(),
  identity_issuer: z.string().optional(),
  voter_title: z.string().optional(),
  voter_zone: z.string().optional(),
  voter_city: z.string().optional(),
  father_name: z.string().optional(),
  mother_name: z.string().optional(),
  education_level: z.string().optional(),
  civil_status: z.string().optional(),
  marriage_date: z.string().optional(),
  spouse_name: z.string().optional(),
  spouse_profession: z.string().optional(),
  spouse_retired: z.boolean().optional(),
  profession: z.string().optional(),
  is_retired: z.boolean().optional(),
  employer: z.string().optional(),
  employer_phone: z.string().optional(),
  work_street: z.string().optional(),
  work_neighborhood: z.string().optional(),
  work_city: z.string().optional(),
  work_state: z.string().optional(),
  work_cep: z.string().optional(),
  work_time: z.string().optional(),
  monthly_income: z.string().optional(),
  opinion_masonry: z.string().optional(),
  expectation_masonry: z.string().optional(),
  informed_financial_values: z.boolean().optional(),
  can_afford_financial: z.boolean().optional(),
  agrees_investigation_fee: z.boolean().optional(),
  aware_no_refund: z.boolean().optional(),
  opinion_family: z.string().optional(),
  believes_supreme_being: z.boolean().optional(),
  opinion_freedom: z.string().optional(),
  opinion_equality: z.string().optional(),
  opinion_fraternity: z.string().optional(),
  sponsor_name: z.string().optional(),
});

type ProposalFormData = z.infer<typeof proposalSchema>;

interface Child {
  name: string;
  birth_date: string;
}

export default function Proposal() {
  return (
    <ProposalAuthGate>
      <ProposalFlowManager />
    </ProposalAuthGate>
  );
}

function ProposalFlowManager() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  // Fetch candidate profile status
  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['my-candidate-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user requested to edit their proposal
  if (isEditing && profile) {
    return <Stage2FullProposalForm profile={profile} onComplete={() => { setIsEditing(false); refetch(); }} />;
  }

  // STATUS FLOW ROUTING:
  // 1. If profile status === 'sindicancia_aprovada' -> Render STAGE 2 (Full Proposal Form)
  if (profile && (profile.status === 'sindicancia_aprovada' as any)) {
    return <Stage2FullProposalForm profile={profile} onComplete={refetch} />;
  }

  // Check if candidate has actually completed Stage 1 essential data (CPF & valid full_name)
  const hasSubmittedStage1 = Boolean(
    profile && 
    profile.cpf && 
    profile.cpf.trim() !== '' && 
    profile.full_name && 
    profile.full_name.trim() !== '' && 
    profile.full_name !== profile.email
  );

  // 2. If profile exists with status === 'sindicancia' or 'pending' AND has submitted Stage 1 -> Render WAITING SCREEN
  if (profile && (profile.status === 'sindicancia' || profile.status === 'pending') && hasSubmittedStage1) {
    return <SindicanciaWaitingScreen profile={profile} />;
  }

  // 3. If candidate is awaiting initiation -> Render dedicated AguardandoIniciacaoScreen
  if (profile && profile.status === 'aguardando_iniciacao') {
    return <AguardandoIniciacaoScreen profile={profile} />;
  }

  // 4. If proposal is already complete -> Render COMPLETION SCREEN
  if (profile && ['proposta_completa', 'membro', 'approved'].includes(profile.status)) {
    return <ProposalCompletedScreen profile={profile} onEdit={() => setIsEditing(true)} />;
  }

  // 4. Default for NEW Candidate or incomplete Stage 1 -> Render STAGE 1 (Sindicância Initial Data Form)
  return <Stage1SindicanciaForm profile={profile} onComplete={refetch} />;
}

/* ====================================================================
   STAGE 1: FORMULÁRIO INICIAL DE DADOS PARA SINDICÂNCIA (PRÉ-CADASTRO)
   ==================================================================== */
function Stage1SindicanciaForm({ profile, onComplete }: { profile: any; onComplete: () => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [lgpdConsent, setLgpdConsent] = useState(false);

  const [formData, setFormData] = useState({
    full_name: profile?.full_name && profile.full_name !== profile.email ? profile.full_name : '',
    email: profile?.email || user?.email || '',
    cpf: profile?.cpf || '',
    identity_number: profile?.identity_number || '',
    identity_issuer: profile?.identity_issuer || 'SSP',
    birth_date: profile?.birth_date && profile.birth_date !== '1990-01-01' ? profile.birth_date : '',
    state: profile?.state || 'SP',
    city: profile?.city || '',
    profession: profile?.profession || '',
    cell_phone: profile?.cell_phone || '',
  });

  const handleSubmitSindicancia = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name || !formData.cpf || !formData.birth_date) {
      toast({
        title: 'Dados Incompletos',
        description: 'Preencha o Nome Completo, CPF e Data de Nascimento.',
        variant: 'destructive',
      });
      return;
    }

    if (!lgpdConsent) {
      toast({
        title: 'Consentimento LGPD Obrigatório',
        description: 'Você precisa autorizar a consulta de antecedentes públicos para prosseguir.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        full_name: formData.full_name,
        email: formData.email,
        cpf: formData.cpf,
        birth_date: formData.birth_date,
        identity_number: formData.identity_number,
        identity_issuer: formData.identity_issuer,
        state: formData.state,
        city: formData.city,
        profession: formData.profession,
        cell_phone: formData.cell_phone,
        status: 'sindicancia',
        agrees_investigation_fee: true,
        user_id: user?.id || null,
        proposal_date: new Date().toISOString().split('T')[0],
      };

      if (profile?.id) {
        await supabase.from('profiles').update(payload as any).eq('id', profile.id);
      } else {
        await supabase.from('profiles').insert(payload as any);
      }

      toast({
        title: 'Pré-Cadastro Recebido com Sucesso!',
        description: 'Seus dados foram enviados para a Comissão de Sindicância.',
      });

      onComplete();
    } catch (error: any) {
      toast({
        title: 'Erro ao Enviar',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/20 text-amber-500 mb-2 border border-amber-500/40">
            <ShieldCheck size={36} />
          </div>
          <h1 className="text-3xl font-display text-foreground">
            Admissão Maçônica - Etapa 1: Sindicância
          </h1>
          <p className="text-muted-foreground font-body max-w-xl mx-auto">
            Preencha seus dados essenciais para que a Comissão de Sindicância execute a verificação preliminar de vida pregressa e certidões públicas.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-accent/40 border border-border text-xs font-semibold">
          <div className="flex items-center gap-2 text-amber-500">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-black flex items-center justify-center font-bold">1</span>
            <span>Pré-Cadastro & Sindicância (Etapa Atual)</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground opacity-50">
            <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold">2</span>
            <span>Ficha de Proposta Completa (Após Aprovação)</span>
          </div>
        </div>

        {/* Main Card Form */}
        <Card className="card-elegant border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-xl font-display text-foreground flex items-center gap-2">
              <User className="h-5 w-5 text-amber-500" />
              Dados do Candidato para Varredura de Antecedentes
            </CardTitle>
            <CardDescription>
              Todas as informações são estritamente confidenciais e protegidas pela LGPD
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitSindicancia} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="full_name" className="text-xs font-semibold">Nome Completo *</Label>
                  <Input
                    id="full_name"
                    required
                    placeholder="Seu nome completo"
                    value={formData.full_name}
                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="seu.email@exemplo.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cell_phone" className="text-xs font-semibold">Telefone / WhatsApp *</Label>
                  <Input
                    id="cell_phone"
                    required
                    placeholder="(11) 99999-9999"
                    value={formData.cell_phone}
                    onChange={e => setFormData({ ...formData, cell_phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf" className="text-xs font-semibold">CPF *</Label>
                  <Input
                    id="cpf"
                    required
                    placeholder="000.000.000-00"
                    value={formData.cpf}
                    onChange={e => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birth_date" className="text-xs font-semibold">Data de Nascimento *</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    required
                    value={formData.birth_date}
                    onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rg" className="text-xs font-semibold">RG e Órgão Emissor</Label>
                  <div className="flex gap-2">
                    <Input
                      id="rg"
                      placeholder="00.000.000-0"
                      value={formData.identity_number}
                      onChange={e => setFormData({ ...formData, identity_number: e.target.value })}
                    />
                    <Input
                      placeholder="SSP"
                      className="w-24"
                      value={formData.identity_issuer}
                      onChange={e => setFormData({ ...formData, identity_issuer: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state" className="text-xs font-semibold">Estado (UF)</Label>
                  <Select value={formData.state} onValueChange={state => setFormData({ ...formData, state })}>
                    <SelectTrigger id="state">
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {['SP', 'RJ', 'MG', 'PR', 'SC', 'RS', 'BA', 'DF', 'GO', 'PE', 'CE', 'PA', 'ES', 'MT', 'MS'].map(uf => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city" className="text-xs font-semibold">Cidade Residencial</Label>
                  <Input
                    id="city"
                    placeholder="Sua cidade"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="profession" className="text-xs font-semibold">Profissão / Ocupação Principal</Label>
                  <Input
                    id="profession"
                    placeholder="Ex: Engenheiro Civil / Administrador"
                    value={formData.profession}
                    onChange={e => setFormData({ ...formData, profession: e.target.value })}
                  />
                </div>
              </div>

              {/* LGPD Box */}
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="lgpd"
                    checked={lgpdConsent}
                    onCheckedChange={checked => setLgpdConsent(!!checked)}
                    className="mt-1"
                  />
                  <label htmlFor="lgpd" className="text-xs text-foreground cursor-pointer leading-relaxed">
                    <span className="font-bold text-amber-500">Autorização para Sindicância & LGPD:</span> Declaro que autorizo expressamente a Comissão de Sindicância da Loja Maçônica a realizar verificação preliminar de vida pregressa, certidões públicas criminais, cíveis e eleitorais.
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                size="lg"
                className="w-full gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold shadow-md h-12"
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                Enviar Cadastro para Sindicância
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ====================================================================
   TELA DE ACOMPANHAMENTO: SINDICÂNCIA EM ANÁLISE PELA COMISSÃO
   ==================================================================== */
function SindicanciaWaitingScreen({ profile }: { profile: any }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-xl w-full card-elegant border-amber-500/40 text-center p-6 space-y-6">
        <div className="p-4 rounded-full bg-amber-500/20 text-amber-500 w-20 h-20 mx-auto flex items-center justify-center border border-amber-500/30">
          <Clock className="h-10 w-10 animate-pulse" />
        </div>

        <div className="space-y-2">
          <Badge className="bg-amber-500/20 text-amber-500 font-semibold text-xs py-1 px-3">
            ⏳ Sindicância em Análise pela Comissão
          </Badge>
          <h2 className="text-2xl font-display text-foreground">
            Olá, {profile.full_name}
          </h2>
          <p className="text-sm text-muted-foreground font-body leading-relaxed max-w-md mx-auto">
            Seus dados essenciais foram recebidos pela Comissão de Sindicância da Loja Maçônica. O sistema está verificando as certidões públicas oficiais.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-accent/40 border border-border text-left text-xs space-y-2">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-500" /> Próxima Etapa:
          </p>
          <p className="text-muted-foreground">
            Assim que a Comissão concluir e **aprovar sua Sindicância**, o botão de liberação para o preenchimento da **Ficha de Proposta Maçônica Completa** aparecerá nesta página.
          </p>
        </div>
      </Card>
    </div>
  );
}

/* ====================================================================
   STAGE 2: FICHA DE PROPOSTA MAÇÔNICA COMPLETA (APÓS SINDICÂNCIA APROVADA)
   ==================================================================== */
function Stage2FullProposalForm({ profile, onComplete }: { profile: any; onComplete: () => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingCEP, setFetchingCEP] = useState(false);
  const [fetchingWorkCEP, setFetchingWorkCEP] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(profile?.photo_url || null);
  const [children, setChildren] = useState<Child[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProposalFormData>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      email: profile?.email || user?.email || '',
      cpf: profile?.cpf || '',
      birth_date: profile?.birth_date || '',
      identity_number: profile?.identity_number || '',
      identity_issuer: profile?.identity_issuer || 'SSP',
      cell_phone: profile?.cell_phone || '',
      phone: profile?.phone || '',
      naturality: profile?.naturality || '',
      nationality: profile?.nationality || 'Brasileiro',
      father_name: profile?.father_name || '',
      mother_name: profile?.mother_name || '',
      education_level: profile?.education_level || 'Superior Completo',
      civil_status: profile?.civil_status || 'Casado',
      marriage_date: profile?.marriage_date || '',
      spouse_name: profile?.spouse_name || '',
      spouse_profession: profile?.spouse_profession || '',
      cep: profile?.cep || '',
      street: profile?.street || '',
      number: profile?.number || '',
      complement: profile?.complement || '',
      neighborhood: profile?.neighborhood || '',
      city: profile?.city || '',
      state: profile?.state || 'SP',
      residence_time: profile?.residence_time || '',
      profession: profile?.profession || '',
      employer: profile?.employer || '',
      employer_phone: profile?.employer_phone || '',
      monthly_income: profile?.monthly_income || '',
      voter_title: profile?.voter_title || '',
      voter_zone: profile?.voter_zone || '',
      voter_city: profile?.voter_city || '',
      expectation_masonry: profile?.expectation_masonry || '',
      opinion_masonry: profile?.opinion_masonry || '',
      opinion_family: profile?.opinion_family || '',
      opinion_freedom: profile?.opinion_freedom || '',
      opinion_equality: profile?.opinion_equality || '',
      opinion_fraternity: profile?.opinion_fraternity || '',
      sponsor_name: profile?.sponsor_name || '',
      believes_supreme_being: profile?.believes_supreme_being ?? true,
      informed_financial_values: profile?.informed_financial_values ?? true,
      can_afford_financial: profile?.can_afford_financial ?? true,
      agrees_investigation_fee: profile?.agrees_investigation_fee ?? true,
      aware_no_refund: profile?.aware_no_refund ?? true,
    },
  });

  const cepValue = watch('cep');

  const handleCEPSearch = async () => {
    if (!cepValue) return;
    setFetchingCEP(true);
    try {
      const address = await fetchAddressByCEP(cepValue);
      if (address) {
        setValue('street', address.logradouro);
        setValue('neighborhood', address.bairro);
        setValue('city', address.localidade);
        setValue('state', address.uf);
      }
    } catch (error) {
      console.error('CEP search error:', error);
    } finally {
      setFetchingCEP(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast({ title: 'Erro', description: validation.error || 'Arquivo inválido', variant: 'destructive' });
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAddChild = () => {
    setChildren(prev => [...prev, { name: '', birth_date: '' }]);
  };

  const handleRemoveChild = (index: number) => {
    setChildren(prev => prev.filter((_, i) => i !== index));
  };

  const handleChildChange = (index: number, field: 'name' | 'birth_date', value: string) => {
    setChildren(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const onSubmitFullProposal = async (data: ProposalFormData) => {
    setLoading(true);
    try {
      let photoUrl = profile?.photo_url || null;

      if (photoFile) {
        const fileName = getValidatedFileName(photoFile, 'proposals');
        const { error: uploadError } = await supabase.storage.from('photos').upload(fileName, photoFile, { upsert: true });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);
          photoUrl = urlData.publicUrl;
        }
      }

      const updateData = {
        ...data,
        photo_url: photoUrl,
        status: 'proposta_completa',
        proposal_date: new Date().toISOString().split('T')[0],
      };

      await supabase.from('profiles').update(updateData as any).eq('id', profile.id);

      // Insert children if any
      const validChildren = children.filter(c => c.name.trim() !== '');
      if (validChildren.length > 0) {
        const childrenPayload = validChildren.map(c => ({
          profile_id: profile.id,
          name: c.name,
          birth_date: c.birth_date,
        }));
        await supabase.from('children').insert(childrenPayload);
      }

      toast({
        title: 'Ficha de Proposta Finalizada com Sucesso!',
        description: 'Sua proposta completa foi registrada e enviada para a Secretaria da Loja.',
      });

      onComplete();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao enviar proposta', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Success Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-background border border-emerald-500/40 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            <h1 className="text-2xl font-display text-foreground">
              🎉 Sindicância Aprovada! Preencha sua Ficha de Proposta Complete
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-body">
            Sua verificação preliminar foi aprovada com louvor. Preencha abaixo os dados da sua Ficha de Proposta Maçônica.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmitFullProposal)} className="space-y-6">
          {/* 1. Dados Pessoais & Filiação */}
          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="text-lg font-display text-foreground flex items-center gap-2">
                <User className="h-5 w-5 text-amber-500" /> 1. Dados Pessoais & Filiação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-24 h-24 rounded-full object-cover border-2 border-amber-500" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-accent flex items-center justify-center text-xs text-muted-foreground border border-border">Sem Foto</div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="photo" className="text-xs font-semibold">Foto 3x4 do Candidato</Label>
                  <Input id="photo" type="file" accept="image/*" onChange={handlePhotoChange} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs font-semibold">Nome Completo *</Label>
                  <Input {...register('full_name')} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">CPF *</Label>
                  <Input {...register('cpf')} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Data de Nascimento *</Label>
                  <Input type="date" {...register('birth_date')} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">RG e Órgão Emissor</Label>
                  <div className="flex gap-2">
                    <Input {...register('identity_number')} placeholder="00.000.000-0" />
                    <Input {...register('identity_issuer')} placeholder="SSP" className="w-20" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Naturalidade (Cidade onde nasceu)</Label>
                  <Input {...register('naturality')} placeholder="Ex: São Paulo - SP" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Nacionalidade</Label>
                  <Input {...register('nationality')} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Telefone Celular / WhatsApp *</Label>
                  <Input {...register('cell_phone')} required placeholder="(11) 99999-9999" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Grau de Escolaridade</Label>
                  <Select value={watch('education_level')} onValueChange={val => setValue('education_level', val)}>
                    <SelectTrigger><SelectValue placeholder="Escolaridade" /></SelectTrigger>
                    <SelectContent>
                      {['Ensino Médio', 'Ensino Superior Incompleto', 'Superior Completo', 'Pós-Graduação / Especialização', 'Mestrado / Doutorado'].map(ed => (
                        <SelectItem key={ed} value={ed}>{ed}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs font-semibold">Nome do Pai</Label>
                  <Input {...register('father_name')} placeholder="Nome completo do pai" />
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label className="text-xs font-semibold">Nome da Mãe</Label>
                  <Input {...register('mother_name')} placeholder="Nome completo da mãe" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Estado Civil, Esposa & Família */}
          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="text-lg font-display text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" /> 2. Estado Civil, Esposa & Filhos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Estado Civil</Label>
                  <Select value={watch('civil_status')} onValueChange={val => setValue('civil_status', val)}>
                    <SelectTrigger><SelectValue placeholder="Estado Civil" /></SelectTrigger>
                    <SelectContent>
                      {['Solteiro', 'Casado', 'União Estável', 'Divorciado', 'Viúvo'].map(cs => (
                        <SelectItem key={cs} value={cs}>{cs}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Data de Casamento (se aplicável)</Label>
                  <Input type="date" {...register('marriage_date')} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Profissão da Esposa/Companheira</Label>
                  <Input {...register('spouse_profession')} placeholder="Ex: Professora / Médica" />
                </div>
                <div className="space-y-2 sm:col-span-3">
                  <Label className="text-xs font-semibold">Nome Completo da Esposa/Companheira</Label>
                  <Input {...register('spouse_name')} placeholder="Nome da esposa ou companheira" />
                </div>
              </div>

              {/* Dependente / Filhos */}
              <div className="pt-2 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">Filhos / Dependentes</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddChild} className="h-8 text-xs gap-1">
                    <Plus size={14} /> Adicionar Filho(a)
                  </Button>
                </div>
                {children.map((child, idx) => (
                  <div key={idx} className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-[11px]">Nome do Filho(a)</Label>
                      <Input value={child.name} onChange={e => handleChildChange(idx, 'name', e.target.value)} placeholder="Nome completo" />
                    </div>
                    <div className="w-36 space-y-1">
                      <Label className="text-[11px]">Data Nasc.</Label>
                      <Input type="date" value={child.birth_date} onChange={e => handleChildChange(idx, 'birth_date', e.target.value)} />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveChild(idx)} className="text-destructive h-9 w-9">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 3. Endereço Residencial */}
          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="text-lg font-display text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-500" /> 3. Endereço Residencial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">CEP</Label>
                  <div className="flex gap-2">
                    <Input {...register('cep')} placeholder="00000-000" />
                    <Button type="button" variant="outline" onClick={handleCEPSearch} disabled={fetchingCEP}>
                      {fetchingCEP ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search size={14} />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs font-semibold">Logradouro / Rua</Label>
                  <Input {...register('street')} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Número</Label>
                  <Input {...register('number')} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Complemento</Label>
                  <Input {...register('complement')} placeholder="Apto / Bloco" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Bairro</Label>
                  <Input {...register('neighborhood')} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Cidade</Label>
                  <Input {...register('city')} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Estado (UF)</Label>
                  <Input {...register('state')} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Tempo de Residência no Endereço</Label>
                  <Input {...register('residence_time')} placeholder="Ex: 5 anos" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Profissão & Renda */}
          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="text-lg font-display text-foreground flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-500" /> 4. Profissão, Ocupação & Renda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs font-semibold">Profissão / Ocupação Principal *</Label>
                  <Input {...register('profession')} required placeholder="Ex: Administrador de Empresas / Engenheiro" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Empresa / Empregador</Label>
                  <Input {...register('employer')} placeholder="Nome da empresa ou autônomo" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Telefone Comercial / Trabalho</Label>
                  <Input {...register('employer_phone')} placeholder="(11) 3333-3333" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Renda Mensal Aproximada</Label>
                  <Input {...register('monthly_income')} placeholder="Ex: R$ 8.000,00" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 5. Dados Eleitorais */}
          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="text-lg font-display text-foreground flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-500" /> 5. Documentação Eleitoral
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Título de Eleitor</Label>
                  <Input {...register('voter_title')} placeholder="0000 0000 0000" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Zona / Seção</Label>
                  <Input {...register('voter_zone')} placeholder="Zona 000 / Seção 000" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Município Eleitoral</Label>
                  <Input {...register('voter_city')} placeholder="Cidade onde vota" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 6. Questões Filosóficas & Expectativas */}
          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="text-lg font-display text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" /> 6. Princípios, Família & Expectativas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">O que você busca ao solicitar ingresso na Maçonaria? *</Label>
                <Textarea rows={3} {...register('expectation_masonry')} required placeholder="Descreva suas motivações pessoais e filosóficas..." />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Qual a sua visão geral sobre a Instituição Maçônica?</Label>
                <Textarea rows={2} {...register('opinion_masonry')} placeholder="Seu conhecimento prévio sobre a Ordem..." />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Qual a opinião da sua família (esposa/filhos) sobre sua iniciação?</Label>
                <Textarea rows={2} {...register('opinion_family')} placeholder="Sua família apoia expressamente a sua decisão?" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Conceito de Liberdade</Label>
                  <Textarea rows={2} {...register('opinion_freedom')} placeholder="O que é Liberdade para você?" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Conceito de Igualdade</Label>
                  <Textarea rows={2} {...register('opinion_equality')} placeholder="O que é Igualdade para você?" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Conceito de Fraternidade</Label>
                  <Textarea rows={2} {...register('opinion_fraternity')} placeholder="O que é Fraternidade para você?" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Nome do Irmão Padrinho / Apresentador</Label>
                <Input {...register('sponsor_name')} placeholder="Nome do Mestre Maçom que o apresentou" />
              </div>

              {/* Compromisso Financeiro & Supremo Criador */}
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="supreme_being"
                    checked={watch('believes_supreme_being')}
                    onCheckedChange={checked => setValue('believes_supreme_being', !!checked)}
                    className="mt-1"
                  />
                  <label htmlFor="supreme_being" className="text-xs text-foreground cursor-pointer leading-relaxed">
                    <span className="font-bold text-amber-500">Crença num Supremo Criador:</span> Declaro formalmente que creio num Princípio Criador / Deus (Grande Arquiteto do Universo).
                  </label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="fin_values"
                    checked={watch('informed_financial_values')}
                    onCheckedChange={checked => setValue('informed_financial_values', !!checked)}
                    className="mt-1"
                  />
                  <label htmlFor="fin_values" className="text-xs text-foreground cursor-pointer leading-relaxed">
                    <span className="font-bold text-amber-500">Compromisso Financeiro:</span> Fui devidamente informado sobre os valores das mensalidades e taxas de iniciação e declaro que disponho de subsistência honrosa sem prejuízo ao sustento de minha família.
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" disabled={loading} size="lg" className="w-full gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold h-12 shadow-lg">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            Finalizar & Enviar Proposta Completa para a Loja
          </Button>
        </form>
      </div>
    </div>
  );
}

/* ====================================================================
   TELA DE CONCLUSÃO DE PROPOSTA
   ==================================================================== */
function ProposalCompletedScreen({ profile, onEdit }: { profile: any; onEdit?: () => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-xl w-full card-elegant border-emerald-500/40 text-center p-8 space-y-6">
        <div className="p-4 rounded-full bg-emerald-500/20 text-emerald-500 w-20 h-20 mx-auto flex items-center justify-center border border-emerald-500/30">
          <CheckCircle2 className="h-10 w-10" />
        </div>

        <div className="space-y-2">
          <Badge className="bg-emerald-600 text-white font-bold text-xs py-1 px-3">
            ✓ PROPOSTA FINALIZADA
          </Badge>
          <h2 className="text-2xl font-display text-foreground">
            Parabéns, {profile.full_name}!
          </h2>
          <p className="text-sm text-muted-foreground font-body leading-relaxed">
            Sua Ficha de Proposta Maçônica completa foi recebida pela Secretaria da Loja. Você será notificado sobre a data marcada para a sua Iniciação!
          </p>
        </div>

        {onEdit && (
          <Button variant="outline" onClick={onEdit} className="gap-2 text-xs w-full">
            <FileText size={14} /> Revisualizar / Editar Minha Ficha de Proposta
          </Button>
        )}
      </Card>
    </div>
  );
}
