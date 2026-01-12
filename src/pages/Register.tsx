import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { validateImageFile, ALLOWED_IMAGE_TYPES, getValidatedFileName } from '@/lib/fileValidation';
import { fetchAddressByCEP, formatCEP } from '@/lib/viacep';
import { CheckCircle, Loader2, Search, Plus, Trash2 } from 'lucide-react';

const formatCPF = (value: string): string => {
  const clean = value.replace(/\D/g, '').slice(0, 11);
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
};

const registerSchema = z.object({
  full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  email: z.string().email('E-mail inválido'),
  cpf: z.string().min(14, 'CPF inválido').max(14),
  birth_date: z.string().min(1, 'Data de nascimento é obrigatória'),
  mother_name: z.string().max(100).optional(),
  spouse_name: z.string().max(100).optional(),
  initiation_date: z.string().optional(),
  cim_number: z.string().max(20).optional(),
  lodge_id: z.string().optional(),
  cep: z.string().max(9).optional(),
  street: z.string().max(200).optional(),
  number: z.string().max(20).optional(),
  complement: z.string().max(100).optional(),
  neighborhood: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(2).optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface Child {
  name: string;
  birth_date: string;
}

interface Lodge {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
}

export default function Register() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fetchingCEP, setFetchingCEP] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [lodges, setLodges] = useState<Lodge[]>([]);
  const [selectedLodgeId, setSelectedLodgeId] = useState<string>('');
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const cepValue = watch('cep');

  // Fetch lodges on component mount
  useEffect(() => {
    const fetchLodges = async () => {
      const { data, error } = await supabase
        .from('lodges')
        .select('id, name, city, state')
        .order('name', { ascending: true });

      if (!error && data) {
        setLodges(data);
      }
    };
    fetchLodges();
  }, []);

  const handleCEPSearch = async () => {
    if (!cepValue) return;
    setFetchingCEP(true);
    const address = await fetchAddressByCEP(cepValue);
    if (address) {
      setValue('street', address.logradouro);
      setValue('neighborhood', address.bairro);
      setValue('city', address.localidade);
      setValue('state', address.uf);
    }
    setFetchingCEP(false);
  };

  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCEP(e.target.value);
    setValue('cep', formatted);
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
          variant: 'destructive',
        });
        e.target.value = '';
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
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

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);

    try {
      let photoUrl = null;

      // Upload photo if provided
      if (photoFile) {
        const validation = validateImageFile(photoFile);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        const fileName = getValidatedFileName(photoFile, 'registrations');

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, photoFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error('Erro ao fazer upload da foto: ' + uploadError.message);
        }

        const { data: urlData } = supabase.storage
          .from('photos')
          .getPublicUrl(fileName);

        photoUrl = urlData.publicUrl;
      }

      // Prepare profile data
      const profileData = {
        full_name: data.full_name,
        email: data.email,
        cpf: data.cpf,
        birth_date: data.birth_date,
        mother_name: data.mother_name || null,
        spouse_name: data.spouse_name || null,
        initiation_date: data.initiation_date || null,
        cim_number: data.cim_number || null,
        lodge_id: selectedLodgeId || null,
        cep: data.cep || null,
        street: data.street || null,
        number: data.number || null,
        complement: data.complement || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
        photo_url: photoUrl,
        status: 'pending',
      };

      // Create profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw new Error('Erro ao criar perfil: ' + profileError.message);
      }

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

          if (childrenError) {
            console.error('Children error:', childrenError);
            // Don't throw, profile was created successfully
          }
        }
      }

      setSubmitted(true);
      toast({
        title: 'Cadastro enviado!',
        description: 'Seu cadastro foi enviado e está aguardando aprovação.',
      });
    } catch (error: any) {
      console.error('Error submitting registration:', error);
      toast({
        title: 'Erro ao enviar cadastro',
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
        <div className="w-full max-w-md text-center">
          <div className="card-elegant p-8">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h1 className="text-2xl font-display text-foreground mb-2">
              Cadastro Enviado!
            </h1>
            <p className="text-muted-foreground font-body mb-6">
              Seu cadastro foi recebido e está aguardando aprovação de um administrador.
              Você será notificado quando seu acesso for liberado.
            </p>
            <Link
              to="/login"
              className="text-secondary hover:underline font-medium"
            >
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-4">
            <span className="font-display text-3xl text-secondary">∴</span>
          </div>
          <h1 className="text-2xl font-display text-foreground">Pré-Cadastro de Membro</h1>
          <p className="text-muted-foreground font-body mt-2">
            Preencha seus dados para solicitar acesso ao sistema
          </p>
        </div>

        {/* Form */}
        <div className="card-elegant p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Photo upload */}
            <div className="space-y-4">
              <Label className="text-lg font-display">Foto</Label>
              <div className="flex items-center gap-6">
                <div className="w-32 h-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted">
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
                    JPG, PNG ou WEBP. Máximo 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Personal info */}
            <div className="space-y-4">
              <h3 className="text-lg font-display text-foreground border-b border-border pb-2">
                Dados Pessoais
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Completo *</Label>
                  <Input {...register('full_name')} id="full_name" />
                  {errors.full_name && (
                    <p className="text-sm text-destructive">{errors.full_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input {...register('email')} id="email" type="email" placeholder="seu@email.com" />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
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
                  <Label htmlFor="birth_date">Data de Nascimento *</Label>
                  <Input {...register('birth_date')} id="birth_date" type="date" />
                  {errors.birth_date && (
                    <p className="text-sm text-destructive">{errors.birth_date.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mother_name">Nome da Mãe</Label>
                  <Input {...register('mother_name')} id="mother_name" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="spouse_name">Nome da Esposa</Label>
                  <Input {...register('spouse_name')} id="spouse_name" />
                </div>
              </div>
            </div>

            {/* Masonry info */}
            <div className="space-y-4">
              <h3 className="text-lg font-display text-foreground border-b border-border pb-2">
                Informações Maçônicas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lodge_id">Loja Maçônica</Label>
                  <Select
                    value={selectedLodgeId}
                    onValueChange={(value) => setSelectedLodgeId(value)}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione uma loja" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border z-50">
                      {lodges.map((lodge) => (
                        <SelectItem key={lodge.id} value={lodge.id}>
                          {lodge.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="initiation_date">Data de Iniciação</Label>
                  <Input {...register('initiation_date')} id="initiation_date" type="date" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cim_number">Número do CIM</Label>
                  <Input {...register('cim_number')} id="cim_number" disabled />
                  <p className="text-xs text-muted-foreground">Gerado automaticamente</p>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-display text-foreground border-b border-border pb-2">
                Endereço
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <div className="flex gap-2">
                    <Input
                      {...register('cep')}
                      id="cep"
                      onChange={handleCEPChange}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCEPSearch}
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
                  <Label htmlFor="state">Estado</Label>
                  <Input {...register('state')} id="state" maxLength={2} />
                </div>
              </div>
            </div>

            {/* Children */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-lg font-display text-foreground">Filhos</h3>
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

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-display"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Cadastro'
              )}
            </Button>
          </form>
        </div>

        {/* Links */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-secondary hover:underline font-medium">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
