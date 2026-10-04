import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

const formatCPF = (value: string): string => {
  const clean = value.replace(/\D/g, '').slice(0, 11);
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
};

// Lista de cargos de Loja maçônica
const LODGE_POSITIONS = [
  { value: 'veneravel_mestre', label: 'Venerável Mestre' },
  { value: 'primeiro_vigilante', label: 'Primeiro Vigilante' },
  { value: 'segundo_vigilante', label: 'Segundo Vigilante' },
  { value: 'orador', label: 'Orador' },
  { value: 'secretario', label: 'Secretário' },
  { value: 'tesoureiro', label: 'Tesoureiro' },
  { value: 'chanceler', label: 'Chanceler' },
  { value: 'mestre_cerimonias', label: 'Mestre de Cerimônias' },
  { value: 'primeiro_diacono', label: '1º Diácono' },
  { value: 'segundo_diacono', label: '2º Diácono' },
  { value: 'primeiro_experto', label: '1º Experto' },
  { value: 'segundo_experto', label: '2º Experto' },
  { value: 'cobridor_interno', label: 'Cobridor Interno' },
  { value: 'cobridor_externo', label: 'Cobridor Externo' },
  { value: 'porta_bandeira', label: 'Porta Bandeira' },
  { value: 'porta_estandarte', label: 'Porta Estandarte' },
  { value: 'porta_espada', label: 'Porta Espada' },
  { value: 'mestre_banquetes', label: 'Mestre de Banquetes' },
  { value: 'mestre_harmonia', label: 'Mestre de Harmonia' },
];

const memberSchema = z.object({
  full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  email: z.string().email('E-mail inválido'),
  cpf: z.string().min(14, 'CPF inválido').max(14),
  birth_date: z.string().min(1, 'Data de nascimento é obrigatória'),
  initiation_date: z.string().optional(),
  degree: z.string().optional(),
  lodge_id: z.string().optional(),
  lodge_position: z.string().optional(),
  phone: z.string().optional(),
  cell_phone: z.string().optional(),
});

type MemberFormData = z.infer<typeof memberSchema>;

interface Lodge {
  id: string;
  name: string;
}

interface CreateMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateMemberDialog({ open, onOpenChange }: CreateMemberDialogProps) {
  const [loading, setLoading] = useState(false);
  const [lodges, setLodges] = useState<Lodge[]>([]);
  const [selectedLodgeId, setSelectedLodgeId] = useState<string>('');
  const [selectedDegree, setSelectedDegree] = useState<string>('Aprendiz');
  const [selectedLodgePosition, setSelectedLodgePosition] = useState<string>('');
  const [createAccess, setCreateAccess] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
  });

  useEffect(() => {
    const fetchLodges = async () => {
      const { data } = await supabase
        .from('lodges')
        .select('id, name')
        .order('name');
      if (data) setLodges(data);
    };
    if (open) {
      fetchLodges();
    }
  }, [open]);

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setValue('cpf', formatted);
  };

  const onSubmit = async (data: MemberFormData) => {
    setLoading(true);

    try {
      // First create the profile with status approved (triggers CIM generation)
      const profileData = {
        full_name: data.full_name,
        email: data.email,
        cpf: data.cpf,
        birth_date: data.birth_date,
        initiation_date: data.initiation_date || null,
        degree: selectedDegree || 'Aprendiz',
        lodge_id: selectedLodgeId || null,
        lodge_position: selectedLodgePosition || null,
        phone: data.phone || null,
        cell_phone: data.cell_phone || null,
        status: 'approved',
        member_status: 'active',
      };

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (profileError) throw profileError;

      // If createAccess is enabled, create auth user
      if (createAccess && profile) {
        const { data: accessResult, error: accessError } = await supabase.functions.invoke('create-member-access', {
          body: {
            profileId: profile.id,
            email: data.email,
            cpf: data.cpf,
          },
        });

        if (accessError) {
          console.error('Error creating access:', accessError);
          toast({
            title: 'Membro criado',
            description: `${data.full_name} foi adicionado, mas houve erro ao criar acesso: ${accessError.message}`,
            variant: 'default',
          });
        } else if (accessResult?.error) {
          toast({
            title: 'Membro criado',
            description: `${data.full_name} foi adicionado, mas houve erro ao criar acesso: ${accessResult.error}`,
            variant: 'default',
          });
        } else {
          toast({
            title: 'Membro criado com acesso!',
            description: `${data.full_name} foi adicionado. Senha: CPF sem pontos (${data.cpf.replace(/\D/g, '')})`,
          });
        }
      } else {
        toast({
          title: 'Membro criado!',
          description: `${data.full_name} foi adicionado com sucesso.`,
        });
      }

      reset();
      setSelectedLodgeId('');
      setSelectedDegree('Aprendiz');
      setSelectedLodgePosition('');
      setCreateAccess(true);
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] });
    } catch (error: any) {
      console.error('Error creating member:', error);
      toast({
        title: 'Erro ao criar membro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Criar Novo Membro</DialogTitle>
          <DialogDescription>
            Preencha os dados para adicionar um novo membro ao sistema.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="full_name">Nome Completo *</Label>
              <Input {...register('full_name')} id="full_name" />
              {errors.full_name && (
                <p className="text-sm text-destructive">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input {...register('email')} id="email" type="email" />
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
              <Label htmlFor="initiation_date">Data de Iniciação</Label>
              <Input {...register('initiation_date')} id="initiation_date" type="date" />
            </div>

            <div className="space-y-2">
              <Label>Grau</Label>
              <Select value={selectedDegree} onValueChange={setSelectedDegree}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  <SelectItem value="Aprendiz">Aprendiz</SelectItem>
                  <SelectItem value="Companheiro">Companheiro</SelectItem>
                  <SelectItem value="Mestre">Mestre</SelectItem>
                  <SelectItem value="Mestre Instalado">Mestre Instalado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Loja Maçônica</Label>
              <Select value={selectedLodgeId || undefined} onValueChange={setSelectedLodgeId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione uma loja" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  {lodges.filter(lodge => lodge.id).map((lodge) => (
                    <SelectItem key={lodge.id} value={lodge.id}>
                      {lodge.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Cargo de Loja</Label>
              <Select value={selectedLodgePosition || '__none__'} onValueChange={(val) => setSelectedLodgePosition(val === '__none__' ? '' : val)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione o cargo de loja" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {LODGE_POSITIONS.map((position) => (
                    <SelectItem key={position.value} value={position.value}>
                      {position.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input {...register('phone')} id="phone" placeholder="(00) 0000-0000" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cell_phone">Celular</Label>
              <Input {...register('cell_phone')} id="cell_phone" placeholder="(00) 00000-0000" />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2 border-t">
            <Checkbox 
              id="create-access" 
              checked={createAccess}
              onCheckedChange={(checked) => setCreateAccess(checked === true)}
            />
            <Label htmlFor="create-access" className="text-sm font-normal cursor-pointer">
              Criar acesso ao sistema (senha = CPF sem pontos)
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Membro'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
