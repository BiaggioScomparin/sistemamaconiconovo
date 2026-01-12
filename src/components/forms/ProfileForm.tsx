import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLodges } from '@/hooks/useLodges';
import { fetchAddressByCEP, formatCEP } from '@/lib/viacep';
import { Loader2, Search, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const profileSchema = z.object({
  full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  birth_date: z.string().min(1, 'Data de nascimento é obrigatória'),
  initiation_date: z.string().optional(),
  mother_name: z.string().max(100).optional(),
  spouse_name: z.string().max(100).optional(),
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

type ProfileFormData = z.infer<typeof profileSchema>;

interface Child {
  id?: string;
  name: string;
  birth_date: string;
}

interface ProfileFormProps {
  initialData?: Partial<ProfileFormData>;
  initialChildren?: Child[];
  onSubmit: (data: ProfileFormData, children: Child[], photoFile: File | null) => Promise<void>;
  loading?: boolean;
  photoUrl?: string | null;
}

export function ProfileForm({ initialData, initialChildren = [], onSubmit, loading, photoUrl }: ProfileFormProps) {
  const { data: lodges } = useLodges();
  const [fetchingCEP, setFetchingCEP] = useState(false);
  const [children, setChildren] = useState<Child[]>(initialChildren);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(photoUrl || null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialData,
  });

  const cepValue = watch('cep');

  useEffect(() => {
    if (photoUrl) {
      setPhotoPreview(photoUrl);
    }
  }, [photoUrl]);

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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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

  const handleFormSubmit = async (data: ProfileFormData) => {
    await onSubmit(data, children, photoFile);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
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
              accept="image/*"
              onChange={handlePhotoChange}
              className="max-w-xs"
            />
            <p className="text-sm text-muted-foreground mt-2">
              JPG, PNG ou GIF. Máximo 5MB.
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
            <Label htmlFor="birth_date">Data de Nascimento *</Label>
            <Input {...register('birth_date')} id="birth_date" type="date" />
            {errors.birth_date && (
              <p className="text-sm text-destructive">{errors.birth_date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="initiation_date">Data de Iniciação</Label>
            <Input {...register('initiation_date')} id="initiation_date" type="date" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cim_number">Número do CIM</Label>
            <Input {...register('cim_number')} id="cim_number" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mother_name">Nome da Mãe</Label>
            <Input {...register('mother_name')} id="mother_name" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="spouse_name">Nome da Esposa</Label>
            <Input {...register('spouse_name')} id="spouse_name" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lodge_id">Loja Maçônica</Label>
            <Select
              onValueChange={(value) => setValue('lodge_id', value)}
              defaultValue={initialData?.lodge_id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma loja" />
              </SelectTrigger>
              <SelectContent>
                {lodges?.map((lodge) => (
                  <SelectItem key={lodge.id} value={lodge.id}>
                    {lodge.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        className="w-full bg-primary hover:bg-navy-light text-primary-foreground font-display"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Salvando...
          </>
        ) : (
          'Salvar Dados'
        )}
      </Button>
    </form>
  );
}
