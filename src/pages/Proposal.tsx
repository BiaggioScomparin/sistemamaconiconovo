import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAddressByCEP, formatCEP } from '@/lib/viacep';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Search, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { validateImageFile, getValidatedFileName, ALLOWED_IMAGE_TYPES } from '@/lib/fileValidation';
import ProposalAuthGate from '@/components/proposal/ProposalAuthGate';

// Utility functions
const formatCPF = (value: string): string => {
  const clean = value.replace(/\D/g, '').slice(0, 11);
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
};

// Schema
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
      <ProposalForm />
    </ProposalAuthGate>
  );
}

function ProposalForm() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fetchingCEP, setFetchingCEP] = useState(false);
  const [fetchingWorkCEP, setFetchingWorkCEP] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
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
      nationality: 'Brasileiro',
      believes_supreme_being: true,
      email: user?.email || '',
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

  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'cep' | 'work_cep') => {
    const formatted = formatCEP(e.target.value);
    setValue(field, formatted);
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setValue('cpf', formatted);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast({ 
          title: 'Erro', 
          description: validation.error || 'Arquivo inválido', 
          variant: 'destructive' 
        });
        e.target.value = '';
        return;
      }
      
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addChild = () => {
    setChildren([...children, { name: '', birth_date: '' }]);
  };

  const removeChild = (index: number) => {
    setChildren(children.filter((_, i) => i !== index));
  };

  const updateChild = (index: number, field: keyof Child, value: string) => {
    const updated = [...children];
    updated[index] = { ...updated[index], [field]: value };
    setChildren(updated);
  };

  const onSubmit = async (data: ProposalFormData) => {
    setLoading(true);

    try {
      let photoUrl: string | null = null;

      // Upload photo if provided
      if (photoFile) {
        const validation = validateImageFile(photoFile);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        const fileName = getValidatedFileName(photoFile, 'proposals');

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, photoFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error('Erro ao fazer upload da foto');
        }

        const { data: urlData } = supabase.storage
          .from('photos')
          .getPublicUrl(fileName);

        photoUrl = urlData.publicUrl;
      }

      // Create profile with status 'proposta'
      const profileData = {
        full_name: data.full_name,
        email: data.email,
        cpf: data.cpf,
        birth_date: data.birth_date,
        naturality: data.naturality || null,
        nationality: data.nationality || 'Brasileiro',
        cep: data.cep || null,
        street: data.street || null,
        number: data.number || null,
        complement: data.complement || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
        residence_time: data.residence_time || null,
        phone: data.phone || null,
        cell_phone: data.cell_phone || null,
        identity_number: data.identity_number || null,
        identity_issuer: data.identity_issuer || null,
        voter_title: data.voter_title || null,
        voter_zone: data.voter_zone || null,
        voter_city: data.voter_city || null,
        father_name: data.father_name || null,
        mother_name: data.mother_name || null,
        education_level: data.education_level || null,
        civil_status: data.civil_status || null,
        marriage_date: data.marriage_date || null,
        spouse_name: data.spouse_name || null,
        spouse_profession: data.spouse_profession || null,
        spouse_retired: data.spouse_retired || false,
        profession: data.profession || null,
        is_retired: data.is_retired || false,
        employer: data.employer || null,
        employer_phone: data.employer_phone || null,
        work_street: data.work_street || null,
        work_neighborhood: data.work_neighborhood || null,
        work_city: data.work_city || null,
        work_state: data.work_state || null,
        work_cep: data.work_cep || null,
        work_time: data.work_time || null,
        monthly_income: data.monthly_income || null,
        opinion_masonry: data.opinion_masonry || null,
        expectation_masonry: data.expectation_masonry || null,
        informed_financial_values: data.informed_financial_values || false,
        can_afford_financial: data.can_afford_financial || false,
        agrees_investigation_fee: data.agrees_investigation_fee || false,
        aware_no_refund: data.aware_no_refund || false,
        opinion_family: data.opinion_family || null,
        believes_supreme_being: data.believes_supreme_being ?? true,
        opinion_freedom: data.opinion_freedom || null,
        opinion_equality: data.opinion_equality || null,
        opinion_fraternity: data.opinion_fraternity || null,
        sponsor_name: data.sponsor_name || null,
        photo_url: photoUrl,
        status: 'proposta',
        member_status: 'active',
        proposal_date: new Date().toISOString().split('T')[0],
        user_id: user?.id || null,
      };

      console.log('Submitting profile data:', profileData);
      
      // Debug: Check current auth session
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('Current session:', sessionData?.session ? 'Authenticated' : 'Anonymous');
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (profileError) {
        console.error('Profile insert error:', profileError);
        console.error('Profile insert error details:', JSON.stringify(profileError, null, 2));
        throw new Error(profileError.message);
      }

      console.log('Profile created:', profile);

      // Add children if any
      if (children.length > 0 && profile) {
        const validChildren = children.filter((c) => c.name && c.birth_date);
        
        if (validChildren.length > 0) {
          const childrenToInsert = validChildren.map((c) => ({
            profile_id: profile.id,
            name: c.name,
            birth_date: c.birth_date,
          }));

          const { error: childrenError } = await supabase
            .from('children')
            .insert(childrenToInsert);

          if (childrenError) {
            console.error('Children insert error:', childrenError);
            // Don't throw - profile was already created
          }
        }
      }

      setSubmitted(true);
      toast({
        title: 'Proposta enviada com sucesso!',
        description: 'Sua proposta será analisada pela administração.',
      });
    } catch (error: any) {
      console.error('Error submitting proposal:', error);
      toast({
        title: 'Erro ao enviar proposta',
        description: error.message || 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Proposta Enviada!
            </h1>
            <p className="text-muted-foreground mb-6">
              Sua proposta de filiação foi recebida e será analisada pela administração. 
              Você será contatado para as próximas etapas do processo.
            </p>
            <Link to="/" className="text-primary hover:underline font-medium">
              Voltar para a página inicial
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-4">
            <span className="text-3xl text-primary-foreground">∴</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Proposta de Filiação</h1>
          <p className="text-muted-foreground mt-2">
            Grande Oriente Independente do Brasil (G.´.O.´.I.´.B.´.)
          </p>
        </div>

        {/* Introduction */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Passamos às mãos de V.Sa. os Princípios Gerais da Maçonaria para que deles tome conhecimento. 
              Recomendamos refletir profundamente antes de tomar a iniciativa de preencher a presente proposta. 
              Não se deixe dominar pelo entusiasmo, nem pelo espírito de curiosidade, pois o passo que V. Sa. 
              pretende dar será da mais alta relevância em sua vida.
            </p>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Photo Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Foto 3x4</CardTitle>
              <CardDescription>
                Foto digital com terno preto, gravata preta e camisa social branca (fundo branco)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="w-32 h-40 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-muted-foreground text-sm text-center p-2">Sem foto</span>
                  )}
                </div>
                <div>
                  <Input
                    type="file"
                    accept={ALLOWED_IMAGE_TYPES.join(',')}
                    onChange={handlePhotoChange}
                    className="max-w-xs"
                  />
                  <p className="text-sm text-muted-foreground mt-2">JPG ou PNG. Máximo 5MB.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Data */}
          <Card>
            <CardHeader>
              <CardTitle>Dados do Candidato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="full_name">Nome Completo *</Label>
                  <Input {...register('full_name')} id="full_name" />
                  {errors.full_name && (
                    <p className="text-sm text-destructive">{errors.full_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birth_date">Data de Nascimento *</Label>
                  <Input {...register('birth_date')} id="birth_date" type="date" />
                  {errors.birth_date && (
                    <p className="text-sm text-destructive">{errors.birth_date.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="naturality">Naturalidade</Label>
                  <Input {...register('naturality')} id="naturality" placeholder="Cidade de nascimento" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nationality">Nacionalidade</Label>
                  <Input {...register('nationality')} id="nationality" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input {...register('email')} id="email" type="email" placeholder="seu@email.com" />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone Fixo</Label>
                  <Input {...register('phone')} id="phone" placeholder="(00) 0000-0000" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cell_phone">Celular</Label>
                  <Input {...register('cell_phone')} id="cell_phone" placeholder="(00) 00000-0000" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    {...register('cpf')}
                    id="cpf"
                    onChange={handleCPFChange}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                  {errors.cpf && (
                    <p className="text-sm text-destructive">{errors.cpf.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="identity_number">RG</Label>
                  <Input {...register('identity_number')} id="identity_number" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="identity_issuer">Órgão Expedidor</Label>
                  <Input {...register('identity_issuer')} id="identity_issuer" placeholder="SSP/SP" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="voter_title">Título de Eleitor</Label>
                  <Input {...register('voter_title')} id="voter_title" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="voter_zone">Zona</Label>
                  <Input {...register('voter_zone')} id="voter_zone" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="voter_city">Município Eleitoral</Label>
                  <Input {...register('voter_city')} id="voter_city" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>Endereço Residencial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <div className="flex gap-2">
                    <Input
                      {...register('cep')}
                      id="cep"
                      onChange={(e) => handleCEPChange(e, 'cep')}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleCEPSearch('home')}
                      disabled={fetchingCEP}
                    >
                      {fetchingCEP ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="street">Rua</Label>
                  <Input {...register('street')} id="street" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="number">Número</Label>
                  <Input {...register('number')} id="number" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complement">Complemento</Label>
                  <Input {...register('complement')} id="complement" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input {...register('neighborhood')} id="neighborhood" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input {...register('city')} id="city" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">UF</Label>
                  <Input {...register('state')} id="state" maxLength={2} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="residence_time">Tempo de Residência</Label>
                  <Input {...register('residence_time')} id="residence_time" placeholder="Ex: 5 anos" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filiation */}
          <Card>
            <CardHeader>
              <CardTitle>Filiação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="father_name">Nome do Pai</Label>
                  <Input {...register('father_name')} id="father_name" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mother_name">Nome da Mãe</Label>
                  <Input {...register('mother_name')} id="mother_name" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="education_level">Grau de Instrução</Label>
                  <select
                    {...register('education_level')}
                    id="education_level"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Selecione</option>
                    <option value="fundamental">Ensino Fundamental</option>
                    <option value="medio">Ensino Médio</option>
                    <option value="superior">Ensino Superior</option>
                    <option value="pos">Pós-Graduação</option>
                    <option value="mestrado">Mestrado</option>
                    <option value="doutorado">Doutorado</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="civil_status">Estado Civil</Label>
                  <select
                    {...register('civil_status')}
                    id="civil_status"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Selecione</option>
                    <option value="solteiro">Solteiro(a)</option>
                    <option value="casado">Casado(a)</option>
                    <option value="divorciado">Divorciado(a)</option>
                    <option value="viuvo">Viúvo(a)</option>
                    <option value="uniao">União Estável</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marriage_date">Data do Casamento</Label>
                  <Input {...register('marriage_date')} id="marriage_date" type="date" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Family Data */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Familiares</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="spouse_name">Nome do Cônjuge</Label>
                  <Input {...register('spouse_name')} id="spouse_name" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="spouse_profession">Profissão do Cônjuge</Label>
                  <Input {...register('spouse_profession')} id="spouse_profession" />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="spouse_retired"
                    onCheckedChange={(checked) => setValue('spouse_retired', checked as boolean)}
                  />
                  <Label htmlFor="spouse_retired">Cônjuge é aposentado(a)?</Label>
                </div>
              </div>

              {/* Children */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-base font-semibold">Filhos</Label>
                  <Button type="button" variant="outline" onClick={addChild} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Filho
                  </Button>
                </div>
                
                {children.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhum filho cadastrado.</p>
                ) : (
                  <div className="space-y-4">
                    {children.map((child, index) => (
                      <div key={index} className="flex items-end gap-4 p-4 bg-muted rounded-lg">
                        <div className="flex-1 space-y-2">
                          <Label>Nome do Filho</Label>
                          <Input
                            value={child.name}
                            onChange={(e) => updateChild(index, 'name', e.target.value)}
                            placeholder="Nome completo"
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label>Data de Nascimento</Label>
                          <Input
                            type="date"
                            value={child.birth_date}
                            onChange={(e) => updateChild(index, 'birth_date', e.target.value)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => removeChild(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Professional Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Profissionais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profession">Profissão</Label>
                  <Input {...register('profession')} id="profession" />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_retired"
                    onCheckedChange={(checked) => setValue('is_retired', checked as boolean)}
                  />
                  <Label htmlFor="is_retired">Aposentado?</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employer">Empregador</Label>
                  <Input {...register('employer')} id="employer" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employer_phone">Telefone do Trabalho</Label>
                  <Input {...register('employer_phone')} id="employer_phone" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthly_income">Renda Mensal</Label>
                  <Input {...register('monthly_income')} id="monthly_income" placeholder="Ex: R$ 5.000,00" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="work_time">Tempo de Trabalho</Label>
                  <Input {...register('work_time')} id="work_time" placeholder="Ex: 3 anos" />
                </div>
              </div>

              {/* Work Address */}
              <div className="mt-4">
                <Label className="text-base font-semibold">Endereço do Trabalho</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="work_cep">CEP</Label>
                    <div className="flex gap-2">
                      <Input
                        {...register('work_cep')}
                        id="work_cep"
                        onChange={(e) => handleCEPChange(e, 'work_cep')}
                        placeholder="00000-000"
                        maxLength={9}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleCEPSearch('work')}
                        disabled={fetchingWorkCEP}
                      >
                        {fetchingWorkCEP ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="work_street">Rua</Label>
                    <Input {...register('work_street')} id="work_street" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="work_neighborhood">Bairro</Label>
                    <Input {...register('work_neighborhood')} id="work_neighborhood" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="work_city">Cidade</Label>
                    <Input {...register('work_city')} id="work_city" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="work_state">UF</Label>
                    <Input {...register('work_state')} id="work_state" maxLength={2} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questionnaire */}
          <Card>
            <CardHeader>
              <CardTitle>Questionário</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="opinion_masonry">Qual sua opinião sobre a Maçonaria?</Label>
                <Textarea {...register('opinion_masonry')} id="opinion_masonry" rows={3} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expectation_masonry">O que você espera obter na Maçonaria?</Label>
                <Textarea {...register('expectation_masonry')} id="expectation_masonry" rows={3} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="informed_financial_values"
                    onCheckedChange={(checked) => setValue('informed_financial_values', checked as boolean)}
                  />
                  <Label htmlFor="informed_financial_values" className="text-sm">
                    Fui informado dos valores financeiros
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="can_afford_financial"
                    onCheckedChange={(checked) => setValue('can_afford_financial', checked as boolean)}
                  />
                  <Label htmlFor="can_afford_financial" className="text-sm">
                    Posso assumir os compromissos financeiros
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="agrees_investigation_fee"
                    onCheckedChange={(checked) => setValue('agrees_investigation_fee', checked as boolean)}
                  />
                  <Label htmlFor="agrees_investigation_fee" className="text-sm">
                    Concordo com a taxa de sindicância
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="aware_no_refund"
                    onCheckedChange={(checked) => setValue('aware_no_refund', checked as boolean)}
                  />
                  <Label htmlFor="aware_no_refund" className="text-sm">
                    Ciente que não há reembolso
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="opinion_family">Qual sua opinião sobre a família?</Label>
                <Textarea {...register('opinion_family')} id="opinion_family" rows={3} />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="believes_supreme_being"
                  defaultChecked={true}
                  onCheckedChange={(checked) => setValue('believes_supreme_being', checked as boolean)}
                />
                <Label htmlFor="believes_supreme_being">Acredito em um Ser Supremo</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="opinion_freedom">Qual sua opinião sobre Liberdade?</Label>
                <Textarea {...register('opinion_freedom')} id="opinion_freedom" rows={2} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="opinion_equality">Qual sua opinião sobre Igualdade?</Label>
                <Textarea {...register('opinion_equality')} id="opinion_equality" rows={2} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="opinion_fraternity">Qual sua opinião sobre Fraternidade?</Label>
                <Textarea {...register('opinion_fraternity')} id="opinion_fraternity" rows={2} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sponsor_name">Nome do Padrinho/Indicante</Label>
                <Input {...register('sponsor_name')} id="sponsor_name" />
              </div>
            </CardContent>
          </Card>

          {/* Declaration */}
          <Card>
            <CardHeader>
              <CardTitle>Declaração</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm mb-4">
                Declaro que todas as informações prestadas são verdadeiras e me responsabilizo 
                pela veracidade dos dados informados. Estou ciente de que qualquer informação 
                falsa poderá resultar no indeferimento da minha proposta ou exclusão futura.
              </p>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex flex-col items-center gap-4">
            <Button type="submit" size="lg" disabled={loading} className="w-full md:w-auto">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Proposta'
              )}
            </Button>
            
            <Link to="/" className="text-muted-foreground hover:text-foreground text-sm">
              Voltar para a página inicial
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
