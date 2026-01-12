import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { fetchAddressByCEP, formatCEP } from '@/lib/viacep';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Search, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { validateImageFile, getValidatedFileName, ALLOWED_IMAGE_TYPES } from '@/lib/fileValidation';

const formatCPF = (value: string): string => {
  const clean = value.replace(/\D/g, '').slice(0, 11);
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
};

const proposalSchema = z.object({
  // Personal data
  full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  email: z.string().email('E-mail inválido'),
  cpf: z.string().min(14, 'CPF inválido').max(14),
  birth_date: z.string().min(1, 'Data de nascimento é obrigatória'),
  naturality: z.string().max(100).optional(),
  nationality: z.string().max(100).optional(),
  
  // Address
  cep: z.string().max(9).optional(),
  street: z.string().max(200).optional(),
  number: z.string().max(20).optional(),
  complement: z.string().max(100).optional(),
  neighborhood: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(2).optional(),
  residence_time: z.string().max(50).optional(),
  
  // Contact
  phone: z.string().max(20).optional(),
  cell_phone: z.string().max(20).optional(),
  
  // Documents
  identity_number: z.string().max(20).optional(),
  identity_issuer: z.string().max(20).optional(),
  voter_title: z.string().max(20).optional(),
  voter_zone: z.string().max(10).optional(),
  voter_city: z.string().max(100).optional(),
  
  // Family
  father_name: z.string().max(100).optional(),
  mother_name: z.string().max(100).optional(),
  education_level: z.string().max(100).optional(),
  civil_status: z.string().max(50).optional(),
  marriage_date: z.string().optional(),
  spouse_name: z.string().max(100).optional(),
  spouse_profession: z.string().max(100).optional(),
  spouse_retired: z.boolean().optional(),
  
  // Professional
  profession: z.string().max(100).optional(),
  is_retired: z.boolean().optional(),
  employer: z.string().max(200).optional(),
  employer_phone: z.string().max(20).optional(),
  work_street: z.string().max(200).optional(),
  work_neighborhood: z.string().max(100).optional(),
  work_city: z.string().max(100).optional(),
  work_state: z.string().max(2).optional(),
  work_cep: z.string().max(9).optional(),
  work_time: z.string().max(50).optional(),
  monthly_income: z.string().max(50).optional(),
  
  // Questionnaire
  opinion_masonry: z.string().max(1000).optional(),
  expectation_masonry: z.string().max(1000).optional(),
  informed_financial_values: z.boolean().optional(),
  can_afford_financial: z.boolean().optional(),
  agrees_investigation_fee: z.boolean().optional(),
  aware_no_refund: z.boolean().optional(),
  opinion_family: z.string().max(1000).optional(),
  believes_supreme_being: z.boolean().optional(),
  opinion_freedom: z.string().max(1000).optional(),
  opinion_equality: z.string().max(1000).optional(),
  opinion_fraternity: z.string().max(1000).optional(),
  
  sponsor_name: z.string().max(100).optional(),
});

type ProposalFormData = z.infer<typeof proposalSchema>;

interface Child {
  name: string;
  birth_date: string;
}

export default function Proposal() {
  const { toast } = useToast();
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
    },
  });

  const cepValue = watch('cep');
  const workCepValue = watch('work_cep');

  const handleCEPSearch = async (type: 'home' | 'work') => {
    const cep = type === 'home' ? cepValue : workCepValue;
    if (!cep) return;

    if (type === 'home') setFetchingCEP(true);
    else setFetchingWorkCEP(true);

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

    if (type === 'home') setFetchingCEP(false);
    else setFetchingWorkCEP(false);
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
      // Validate the file before accepting
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast({ 
          title: 'Erro', 
          description: validation.error || 'Arquivo inválido', 
          variant: 'destructive' 
        });
        // Reset the input
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
      let photoUrl = null;

      // Upload photo if provided (with validation)
      if (photoFile) {
        // Re-validate the file before upload (double-check)
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

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('photos')
          .getPublicUrl(fileName);

        photoUrl = urlData.publicUrl;
      }

      // Create profile with status 'proposta'
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          full_name: data.full_name,
          email: data.email,
          cpf: data.cpf,
          birth_date: data.birth_date,
          naturality: data.naturality,
          nationality: data.nationality,
          cep: data.cep,
          street: data.street,
          number: data.number,
          complement: data.complement,
          neighborhood: data.neighborhood,
          city: data.city,
          state: data.state,
          residence_time: data.residence_time,
          phone: data.phone,
          cell_phone: data.cell_phone,
          identity_number: data.identity_number,
          identity_issuer: data.identity_issuer,
          voter_title: data.voter_title,
          voter_zone: data.voter_zone,
          voter_city: data.voter_city,
          father_name: data.father_name,
          mother_name: data.mother_name,
          education_level: data.education_level,
          civil_status: data.civil_status,
          marriage_date: data.marriage_date || null,
          spouse_name: data.spouse_name,
          spouse_profession: data.spouse_profession,
          spouse_retired: data.spouse_retired,
          profession: data.profession,
          is_retired: data.is_retired,
          employer: data.employer,
          employer_phone: data.employer_phone,
          work_street: data.work_street,
          work_neighborhood: data.work_neighborhood,
          work_city: data.work_city,
          work_state: data.work_state,
          work_cep: data.work_cep,
          work_time: data.work_time,
          monthly_income: data.monthly_income,
          opinion_masonry: data.opinion_masonry,
          expectation_masonry: data.expectation_masonry,
          informed_financial_values: data.informed_financial_values,
          can_afford_financial: data.can_afford_financial,
          agrees_investigation_fee: data.agrees_investigation_fee,
          aware_no_refund: data.aware_no_refund,
          opinion_family: data.opinion_family,
          believes_supreme_being: data.believes_supreme_being,
          opinion_freedom: data.opinion_freedom,
          opinion_equality: data.opinion_equality,
          opinion_fraternity: data.opinion_fraternity,
          sponsor_name: data.sponsor_name,
          photo_url: photoUrl,
          status: 'proposta',
          proposal_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // Add children
      if (children.length > 0 && profile) {
        const childrenToInsert = children
          .filter((c) => c.name && c.birth_date)
          .map((c) => ({
            profile_id: profile.id,
            name: c.name,
            birth_date: c.birth_date,
          }));

        if (childrenToInsert.length > 0) {
          const { error: childrenError } = await supabase
            .from('children')
            .insert(childrenToInsert);

          if (childrenError) throw childrenError;
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
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center">
          <Card className="card-elegant">
            <CardContent className="p-8">
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h1 className="text-2xl font-display text-foreground mb-2">
                Proposta Enviada!
              </h1>
              <p className="text-muted-foreground font-body mb-6">
                Sua proposta de filiação foi recebida e será analisada pela administração. 
                Você será contatado para as próximas etapas do processo.
              </p>
              <Link
                to="/"
                className="text-secondary hover:underline font-medium"
              >
                Voltar para a página inicial
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-4">
            <span className="font-display text-3xl text-secondary">∴</span>
          </div>
          <h1 className="text-2xl font-display text-foreground">Proposta de Filiação</h1>
          <p className="text-muted-foreground font-body mt-2">
            Grande Oriente Independente do Brasil (G.´.O.´.I.´.B.´.)
          </p>
        </div>

        {/* Introduction */}
        <Card className="card-elegant mb-8">
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Passamos às mãos de V.Sa. os Princípios Gerais da Maçonaria para que deles tome conhecimento. 
              Recomendamos refletir profundamente antes de tomar a iniciativa de preencher a presente proposta. 
              Não se deixe dominar pelo entusiasmo, nem pelo espírito de curiosidade, pois o passo que V. Sa. 
              pretende dar será da mais alta relevância em sua vida. O questionário a ser respondido pelo Senhor 
              deverá ser preenchido, com clareza, objetividade e absoluto senso de verdade e sinceridade.
            </p>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Photo Upload */}
          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="font-display">Foto 3x4</CardTitle>
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
                  <p className="text-sm text-muted-foreground mt-2">
                    JPG ou PNG. Máximo 5MB.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Data */}
          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="font-display">Dados do Candidato</CardTitle>
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
                  <Label htmlFor="identity_number">Carteira de Identidade (RG)</Label>
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
          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="font-display">Endereço Residencial</CardTitle>
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
          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="font-display">Filiação</CardTitle>
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
                  <Select onValueChange={(value) => setValue('education_level', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fundamental">Ensino Fundamental</SelectItem>
                      <SelectItem value="medio">Ensino Médio</SelectItem>
                      <SelectItem value="superior">Ensino Superior</SelectItem>
                      <SelectItem value="pos">Pós-Graduação</SelectItem>
                      <SelectItem value="mestrado">Mestrado</SelectItem>
                      <SelectItem value="doutorado">Doutorado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="civil_status">Estado Civil</Label>
                  <Select onValueChange={(value) => setValue('civil_status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                      <SelectItem value="casado">Casado(a)</SelectItem>
                      <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                      <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                      <SelectItem value="uniao">União Estável</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marriage_date">Data do Casamento</Label>
                  <Input {...register('marriage_date')} id="marriage_date" type="date" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Family Data */}
          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="font-display">Dados Familiares</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="spouse_name">Nome da Esposa</Label>
                  <Input {...register('spouse_name')} id="spouse_name" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="spouse_profession">Profissão da Esposa</Label>
                  <Input {...register('spouse_profession')} id="spouse_profession" />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="spouse_retired"
                    onCheckedChange={(checked) => setValue('spouse_retired', checked as boolean)}
                  />
                  <Label htmlFor="spouse_retired">Esposa é aposentada?</Label>
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
          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="font-display">Informações Profissionais</CardTitle>
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
          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="font-display">Questionário</CardTitle>
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
                    Fui informado quanto aos valores dos compromissos financeiros e mensais
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="can_afford_financial"
                    onCheckedChange={(checked) => setValue('can_afford_financial', checked as boolean)}
                  />
                  <Label htmlFor="can_afford_financial" className="text-sm">
                    Estou em condições de assumir tais compromissos sem afetar minha família
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="agrees_investigation_fee"
                    onCheckedChange={(checked) => setValue('agrees_investigation_fee', checked as boolean)}
                  />
                  <Label htmlFor="agrees_investigation_fee" className="text-sm">
                    Concordo com a taxa de sindicância (R$ 100,00)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="aware_no_refund"
                    onCheckedChange={(checked) => setValue('aware_no_refund', checked as boolean)}
                  />
                  <Label htmlFor="aware_no_refund" className="text-sm">
                    Estou ciente de que em caso de desistência o valor não será reembolsado
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="opinion_family">Qual a sua opinião sobre a família no âmbito social?</Label>
                <Textarea {...register('opinion_family')} id="opinion_family" rows={3} />
              </div>

              <div className="space-y-2">
                <Label>Acredita em um Ser Supremo?</Label>
                <RadioGroup 
                  defaultValue="true" 
                  onValueChange={(value) => setValue('believes_supreme_being', value === 'true')}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="believes_yes" />
                    <Label htmlFor="believes_yes">Sim</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="believes_no" />
                    <Label htmlFor="believes_no">Não</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">O que pensa sobre os 3 tópicos citados abaixo?</Label>
                
                <div className="space-y-2">
                  <Label htmlFor="opinion_freedom">Liberdade</Label>
                  <Textarea {...register('opinion_freedom')} id="opinion_freedom" rows={3} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="opinion_equality">Igualdade</Label>
                  <Textarea {...register('opinion_equality')} id="opinion_equality" rows={3} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="opinion_fraternity">Fraternidade</Label>
                  <Textarea {...register('opinion_fraternity')} id="opinion_fraternity" rows={3} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Declaration */}
          <Card className="card-elegant">
            <CardHeader>
              <CardTitle className="font-display">Declaração</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                Desejo de minha livre e espontânea vontade fazer parte deste Grupo de estudos Maçônicos e palestras 
                e para tanto, coloco-me à disposição para prestar outras informações que se fizerem necessárias, 
                tendo consciência de que para minha efetiva aprovação, serei submetido ao processo de investigação 
                social que ateste a idoneidade necessária a todos os membros desta Loja.
              </p>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                Declaro também que O Grande Oriente Independente do Brasil (G.´.O.´.I.´.B.´.) me certificou das 
                despesas inerentes ao ingresso, tais como os materiais, vestimenta, livros, confraternização e 
                que estes encargos não comprometerão meu bem-estar e de minha família.
              </p>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Declaro estar em pleno gozo das minhas capacidades físicas e mentais e estar ciente de minhas 
                responsabilidades com este grupo de estudos Maçônicos. Declaro também estar ciente de que minha 
                filiação deverá ocorrer dentro de um prazo máximo de 60 (sessenta dias) a contar da assinatura desta.
              </p>

              <div className="space-y-2">
                <Label htmlFor="sponsor_name">Nome do Mestre Maçom responsável pela sindicância (Padrinho)</Label>
                <Input {...register('sponsor_name')} id="sponsor_name" />
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-display py-6 text-lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Enviando Proposta...
              </>
            ) : (
              'Enviar Proposta de Filiação'
            )}
          </Button>
        </form>

        {/* Back link */}
        <div className="mt-6 text-center">
          <Link to="/" className="text-secondary hover:underline font-medium">
            Voltar para a página inicial
          </Link>
        </div>
      </div>
    </div>
  );
}
