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

  // 3. If proposal is already complete or candidate approved -> Render COMPLETION SCREEN
  if (profile && ['proposta_completa', 'aguardando_iniciacao', 'membro', 'approved'].includes(profile.status)) {
    return <ProposalCompletedScreen profile={profile} />;
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
      city: profile?.city || '',
      state: profile?.state || 'SP',
      profession: profile?.profession || '',
      nationality: profile?.nationality || 'Brasileiro',
      believes_supreme_being: true,
    },
  });

  const cepValue = watch('cep');
  const workCepValue = watch('work_cep');

  const handleCEPSearch = async (type: 'home' | 'work') => {
    const cep = type === 'home' ? cepValue : workCepValue;
    if (!cep) return;

    if (type === 'home') setFetchingCEP(true);
    else setFetchingWorkCEP(true);

    try {
      const address = await fetchAddressByCEP(cep);
      if (address) {
        if (type === 'home') {
          setValue('street', address.logradouro);
          setValue('neighborhood', address.bairro);
          setValue('city', address.localidade);
          setValue('state', address.uf);
        } else {
          setValue('work_street', address.logradouro);
          setValue('work_neighborhood', address.bairro);
          setValue('work_city', address.localidade);
          setValue('work_state', address.uf);
        }
      }
    } catch (error) {
      console.error('CEP search error:', error);
    } finally {
      if (type === 'home') setFetchingCEP(false);
      else setFetchingWorkCEP(false);
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

      toast({
        title: 'Ficha de Proposta Finalizada!',
        description: 'Sua proposta completa foi enviada à secretaria da Loja Maçônica.',
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
              🎉 Sindicância Aprovada! Preencha sua Ficha de Proposta
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-body">
            Sua verificação de antecedentes foi aprovada com louvor pela Comissão. Complete abaixo suas informações familiares, profissionais e filosóficas.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmitFullProposal)} className="space-y-6">
          {/* Dados Pessoais */}
          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="text-lg font-display">1. Dados Pessoais & Foto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-24 h-24 rounded-full object-cover border-2 border-primary" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-accent flex items-center justify-center text-xs text-muted-foreground">Sem Foto</div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="photo" className="text-xs font-semibold">Foto 3x4 do Candidato</Label>
                  <Input id="photo" type="file" accept="image/*" onChange={handlePhotoChange} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Nome Completo</Label>
                  <Input {...register('full_name')} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">CPF</Label>
                  <Input {...register('cpf')} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Naturalidade</Label>
                  <Input {...register('naturality')} placeholder="Cidade onde nasceu" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Nacionalidade</Label>
                  <Input {...register('nationality')} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Endereço Residencial */}
          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="text-lg font-display">2. Endereço Residencial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">CEP</Label>
                  <div className="flex gap-2">
                    <Input {...register('cep')} placeholder="00000-000" />
                    <Button type="button" variant="outline" onClick={() => handleCEPSearch('home')}>
                      <Search size={14} />
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
                  <Label className="text-xs font-semibold">Bairro</Label>
                  <Input {...register('neighborhood')} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Cidade / UF</Label>
                  <Input {...register('city')} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questionário Filosófico */}
          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="text-lg font-display">3. Questões Filosóficas & Expectativas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">O que você busca na Maçonaria?</Label>
                <Textarea rows={3} {...register('expectation_masonry')} placeholder="Descreva suas motivações pessoais..." />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Qual a opinião da sua família sobre sua iniciação?</Label>
                <Textarea rows={2} {...register('opinion_family')} placeholder="Sua esposa e filhos apoiam a decisão?" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Nome do Irmão Padrinho / Apresentador</Label>
                <Input {...register('sponsor_name')} placeholder="Nome do Mestre Maçom que o indicou" />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" disabled={loading} size="lg" className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            Finalizar & Enviar Proposta Completa
          </Button>
        </form>
      </div>
    </div>
  );
}

/* ====================================================================
   TELA DE CONCLUSÃO DE PROPOSTA
   ==================================================================== */
function ProposalCompletedScreen({ profile }: { profile: any }) {
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
      </Card>
    </div>
  );
}
