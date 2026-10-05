import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Search, 
  User, 
  Crown, 
  Sparkles, 
  CheckCircle2, 
  SlidersHorizontal,
  CreditCard,
  CalendarCheck,
  UserCheck,
  BookOpen,
  ChevronDown,
  Filter,
  Check,
  X
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MemberWithPermissions {
  id: string;
  full_name: string;
  cim_number: string | null;
  email: string | null;
  member_status: string;
  lodge_position: string | null;
  user_id: string | null;
  user_permissions: {
    id: string;
    can_view_card: boolean;
    can_view_attendance: boolean;
    can_register_attendance: boolean;
    can_edit_profile: boolean;
    can_view_daily_attendances: boolean;
  } | null;
  is_admin?: boolean;
}

export interface RolePreset {
  id: string;
  name: string;
  description: string;
  badgeStyle: string;
  icon: any;
  permissions: {
    can_view_card: boolean;
    can_view_attendance: boolean;
    can_register_attendance: boolean;
    can_edit_profile: boolean;
    can_view_daily_attendances: boolean;
  };
}

export const ROLE_PRESETS: Record<string, RolePreset> = {
  veneravel: {
    id: 'veneravel',
    name: 'Venerável Mestre',
    description: 'Acesso completo a todas as funções de consulta e registros da Oficina.',
    badgeStyle: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    icon: Crown,
    permissions: {
      can_view_card: true,
      can_view_attendance: true,
      can_register_attendance: true,
      can_edit_profile: true,
      can_view_daily_attendances: true,
    },
  },
  secretario: {
    id: 'secretario',
    name: 'Secretário / Adjunto',
    description: 'Acesso completo a Frequências, Chamada Diária, Carteirinha e Perfil.',
    badgeStyle: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    icon: BookOpen,
    permissions: {
      can_view_card: true,
      can_view_attendance: true,
      can_register_attendance: true,
      can_edit_profile: true,
      can_view_daily_attendances: true,
    },
  },
  chanceler: {
    id: 'chanceler',
    name: 'Chanceler',
    description: 'Foco na gestão da lista de presença, verificação e chamadas diárias.',
    badgeStyle: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    icon: CalendarCheck,
    permissions: {
      can_view_card: true,
      can_view_attendance: true,
      can_register_attendance: true,
      can_edit_profile: false,
      can_view_daily_attendances: true,
    },
  },
  tesoureiro: {
    id: 'tesoureiro',
    name: 'Tesoureiro',
    description: 'Acesso à carteirinha digital e atualização de perfil.',
    badgeStyle: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
    icon: UserCheck,
    permissions: {
      can_view_card: true,
      can_view_attendance: true,
      can_register_attendance: false,
      can_edit_profile: true,
      can_view_daily_attendances: false,
    },
  },
  membro_padrao: {
    id: 'membro_padrao',
    name: 'Membro Padrão',
    description: 'Acesso básico à sua própria carteirinha digital, presença e perfil.',
    badgeStyle: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
    icon: User,
    permissions: {
      can_view_card: true,
      can_view_attendance: true,
      can_register_attendance: false,
      can_edit_profile: true,
      can_view_daily_attendances: false,
    },
  },
};

const getSuggestedPresetKey = (cargo: string | null): string => {
  if (!cargo) return 'membro_padrao';
  const normCargo = cargo.toLowerCase();
  if (normCargo.includes('venerá') || normCargo.includes('veneravel')) return 'veneravel';
  if (normCargo.includes('secretá') || normCargo.includes('secretario')) return 'secretario';
  if (normCargo.includes('chanceler')) return 'chanceler';
  if (normCargo.includes('tesour') || normCargo.includes('tesoureiro')) return 'tesoureiro';
  return 'membro_padrao';
};

const getCurrentPresetKey = (permissions: MemberWithPermissions['user_permissions']): string => {
  if (!permissions) return 'custom';

  for (const [key, preset] of Object.entries(ROLE_PRESETS)) {
    const p = preset.permissions;
    if (
      permissions.can_view_card === p.can_view_card &&
      permissions.can_view_attendance === p.can_view_attendance &&
      permissions.can_register_attendance === p.can_register_attendance &&
      permissions.can_edit_profile === p.can_edit_profile &&
      permissions.can_view_daily_attendances === p.can_view_daily_attendances
    ) {
      return key;
    }
  }
  return 'custom';
};

const Permissions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const { data: members, isLoading } = useQuery({
    queryKey: ['members-with-permissions'],
    queryFn: async () => {
      // Get profiles with permissions
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, cim_number, email, member_status, lodge_position, user_id, user_permissions(*)')
        .not('user_id', 'is', null)
        .eq('status', 'membro')
        .order('full_name', { ascending: true });

      if (profilesError) throw profilesError;

      // Get admin roles
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);

      return profiles?.map(p => ({
        ...p,
        is_admin: p.user_id ? adminUserIds.has(p.user_id) : false
      })) as MemberWithPermissions[];
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({
      profileId,
      permissionId,
      field,
      value,
    }: {
      profileId: string;
      permissionId: string | null;
      field: string;
      value: boolean;
    }) => {
      if (permissionId) {
        const { error } = await supabase
          .from('user_permissions')
          .update({ [field]: value })
          .eq('id', permissionId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_permissions')
          .insert({ profile_id: profileId, [field]: value });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members-with-permissions'] });
      toast({
        title: 'Permissão atualizada',
        description: 'A permissão foi atualizada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const applyPresetMutation = useMutation({
    mutationFn: async ({
      profileId,
      permissionId,
      presetPermissions,
      presetName,
    }: {
      profileId: string;
      permissionId: string | null;
      presetPermissions: typeof ROLE_PRESETS['veneravel']['permissions'];
      presetName: string;
    }) => {
      if (permissionId) {
        const { error } = await supabase
          .from('user_permissions')
          .update(presetPermissions)
          .eq('id', permissionId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_permissions')
          .insert({ profile_id: profileId, ...presetPermissions });

        if (error) throw error;
      }
    },
    onSuccess: (_, { presetName }) => {
      queryClient.invalidateQueries({ queryKey: ['members-with-permissions'] });
      toast({
        title: 'Preset aplicado!',
        description: `Permissões ajustadas de acordo com o padrão "${presetName}".`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao aplicar preset',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleAllPermissionsMutation = useMutation({
    mutationFn: async ({
      profileId,
      permissionId,
      enableAll,
    }: {
      profileId: string;
      permissionId: string | null;
      enableAll: boolean;
    }) => {
      const allPermissions = {
        can_view_card: enableAll,
        can_view_attendance: enableAll,
        can_register_attendance: enableAll,
        can_edit_profile: enableAll,
        can_view_daily_attendances: enableAll,
      };

      if (permissionId) {
        const { error } = await supabase
          .from('user_permissions')
          .update(allPermissions)
          .eq('id', permissionId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_permissions')
          .insert({ profile_id: profileId, ...allPermissions });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members-with-permissions'] });
      toast({
        title: 'Permissões atualizadas',
        description: 'Todas as permissões do membro foram modificadas.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      profileId, 
      permissionId, 
      makeAdmin 
    }: { 
      userId: string; 
      profileId: string;
      permissionId: string | null;
      makeAdmin: boolean;
    }) => {
      if (makeAdmin) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });

        if (roleError) throw roleError;

        const allPermissions = {
          can_view_card: true,
          can_view_attendance: true,
          can_register_attendance: true,
          can_edit_profile: true,
          can_view_daily_attendances: true,
        };

        if (permissionId) {
          const { error: permError } = await supabase
            .from('user_permissions')
            .update(allPermissions)
            .eq('id', permissionId);

          if (permError) throw permError;
        } else {
          const { error: permError } = await supabase
            .from('user_permissions')
            .insert({ profile_id: profileId, ...allPermissions });

          if (permError) throw permError;
        }
      } else {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (error) throw error;
      }
    },
    onSuccess: (_, { makeAdmin }) => {
      queryClient.invalidateQueries({ queryKey: ['members-with-permissions'] });
      toast({
        title: makeAdmin ? 'Perfil Admin concedido' : 'Admin removido',
        description: makeAdmin 
          ? 'O usuário agora possui acesso irrestrito ao painel administrativo.' 
          : 'O acesso administrativo do usuário foi revogado.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleTogglePermission = (
    profileId: string,
    permissionId: string | null,
    field: string,
    currentValue: boolean
  ) => {
    updatePermissionMutation.mutate({
      profileId,
      permissionId,
      field,
      value: !currentValue,
    });
  };

  const handleApplyPreset = (
    profileId: string,
    permissionId: string | null,
    presetKey: string
  ) => {
    const preset = ROLE_PRESETS[presetKey];
    if (!preset) return;
    applyPresetMutation.mutate({
      profileId,
      permissionId,
      presetPermissions: preset.permissions,
      presetName: preset.name,
    });
  };

  const handleToggleAdmin = (
    userId: string | null, 
    profileId: string, 
    permissionId: string | null, 
    isCurrentlyAdmin: boolean
  ) => {
    if (!userId) {
      toast({
        title: 'Erro',
        description: 'Este membro não possui conta de usuário cadastrada no sistema.',
        variant: 'destructive',
      });
      return;
    }
    toggleAdminMutation.mutate({ 
      userId, 
      profileId, 
      permissionId, 
      makeAdmin: !isCurrentlyAdmin 
    });
  };

  const handleToggleAll = (profileId: string, permissionId: string | null, enableAll: boolean) => {
    toggleAllPermissionsMutation.mutate({ profileId, permissionId, enableAll });
  };

  const filteredMembers = members?.filter((member) => {
    const matchesSearch =
      member.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (member.cim_number && member.cim_number.includes(search)) ||
      (member.email && member.email.toLowerCase().includes(search.toLowerCase())) ||
      (member.lodge_position && member.lodge_position.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (roleFilter === 'admin') return member.is_admin;
    if (roleFilter === 'custom') return getCurrentPresetKey(member.user_permissions) === 'custom' && !member.is_admin;
    if (roleFilter !== 'all') return getCurrentPresetKey(member.user_permissions) === roleFilter;

    return true;
  });

  const hasAllPermissions = (permissions: MemberWithPermissions['user_permissions']) => {
    if (!permissions) return false;
    return (
      permissions.can_view_card &&
      permissions.can_view_attendance &&
      permissions.can_register_attendance &&
      permissions.can_edit_profile &&
      permissions.can_view_daily_attendances
    );
  };

  // Stats calculation
  const totalMembersCount = members?.length || 0;
  const adminCount = members?.filter(m => m.is_admin).length || 0;
  const fullAccessCount = members?.filter(m => hasAllPermissions(m.user_permissions)).length || 0;

  return (
    <AppLayout>
      <TooltipProvider>
        <div className="container mx-auto py-6 space-y-6 max-w-7xl px-3 sm:px-6">
          {/* Header section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Gerenciador de Permissões</h1>
                  <p className="text-sm text-muted-foreground">
                    Controle os níveis de acesso por Cargo Maçônico e Matriz de Módulos (RBAC)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats summary row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Card className="bg-card border-border/60">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total de Membros</p>
                  <p className="text-2xl font-bold mt-0.5">{totalMembersCount}</p>
                </div>
                <div className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <User className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/60">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Administradores</p>
                  <p className="text-2xl font-bold mt-0.5 text-yellow-600 dark:text-yellow-400">{adminCount}</p>
                </div>
                <div className="p-2.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                  <Crown className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/60">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Acesso Completo</p>
                  <p className="text-2xl font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">{fullAccessCount}</p>
                </div>
                <div className="p-2.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/60">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Presets Disponíveis</p>
                  <p className="text-2xl font-bold mt-0.5 text-primary">{Object.keys(ROLE_PRESETS).length}</p>
                </div>
                <div className="p-2.5 rounded-full bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Presets summary guide */}
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-background">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Presets de Permissão por Cargo Maçônico</CardTitle>
              </div>
              <CardDescription>
                Selecione um preset pronto para aplicar permissões padrão com base na função do irmão na Loja:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                {Object.entries(ROLE_PRESETS).map(([key, preset]) => {
                  const Icon = preset.icon;
                  return (
                    <div 
                      key={key} 
                      className="p-3 rounded-lg border bg-card/60 flex flex-col justify-between hover:border-primary/40 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Icon className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-semibold text-xs text-foreground">{preset.name}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                          {preset.description}
                        </p>
                      </div>
                      <div className="mt-2.5 pt-2 border-t flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Acessos:</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-mono">
                          {Object.values(preset.permissions).filter(Boolean).length}/5
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Main Matrix Table Card */}
          <Card className="border-border">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <SlidersHorizontal className="h-5 w-5 text-primary" />
                    Matriz Visual de Permissões dos Membros
                  </CardTitle>
                  <CardDescription>
                    Gerencie acessos por módulo individual ou aplique presets instantâneos por cargo.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, CIM, cargo ou email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Filter dropdown */}
                <div className="flex items-center gap-2 shrink-0">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground hidden sm:inline">Filtrar por:</span>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="h-10 px-3 py-1 bg-background border border-input rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="all">Todos os Membros</option>
                    <option value="admin">Administradores</option>
                    <option value="veneravel">Preset: Venerável Mestre</option>
                    <option value="secretario">Preset: Secretário</option>
                    <option value="chanceler">Preset: Chanceler</option>
                    <option value="tesoureiro">Preset: Tesoureiro</option>
                    <option value="membro_padrao">Preset: Membro Padrão</option>
                    <option value="custom">Personalizados (Fora do Preset)</option>
                  </select>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground text-sm flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                    Carregando matriz de permissões...
                  </p>
                </div>
              ) : filteredMembers && filteredMembers.length > 0 ? (
                <>
                  {/* Desktop Matrix View */}
                  <div className="hidden lg:block overflow-x-auto rounded-md border border-border">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        {/* Group Header Row */}
                        <TableRow className="border-b hover:bg-transparent">
                          <TableHead colSpan={2} className="py-2.5 font-semibold text-xs text-foreground bg-muted/60 border-r">
                            IDENTIFICAÇÃO DO MEMBRO
                          </TableHead>
                          <TableHead colSpan={1} className="py-2.5 font-semibold text-xs text-center text-blue-700 dark:text-blue-400 bg-blue-500/10 border-r">
                            <span className="flex items-center justify-center gap-1">
                              <CreditCard className="h-3.5 w-3.5" /> CARTEIRINHA
                            </span>
                          </TableHead>
                          <TableHead colSpan={3} className="py-2.5 font-semibold text-xs text-center text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-r">
                            <span className="flex items-center justify-center gap-1">
                              <CalendarCheck className="h-3.5 w-3.5" /> FREQUÊNCIAS E SESSÕES
                            </span>
                          </TableHead>
                          <TableHead colSpan={1} className="py-2.5 font-semibold text-xs text-center text-purple-700 dark:text-purple-400 bg-purple-500/10 border-r">
                            <span className="flex items-center justify-center gap-1">
                              <UserCheck className="h-3.5 w-3.5" /> PERFIL
                            </span>
                          </TableHead>
                          <TableHead colSpan={2} className="py-2.5 font-semibold text-xs text-center text-foreground bg-muted/60">
                            AÇÕES & PRESETS
                          </TableHead>
                        </TableRow>

                        {/* Detail Column Row */}
                        <TableRow className="text-[11px] border-b">
                          <TableHead className="min-w-[220px]">Membro / Cargo</TableHead>
                          <TableHead className="text-center w-[90px]">Admin</TableHead>
                          <TableHead className="text-center min-w-[110px] bg-blue-500/5">
                            <Tooltip>
                              <TooltipTrigger className="cursor-help">Ver Digital</TooltipTrigger>
                              <TooltipContent>Permite visualizar e baixar a carteirinha digital SOGLIA/GOIB</TooltipContent>
                            </Tooltip>
                          </TableHead>
                          <TableHead className="text-center min-w-[110px] bg-emerald-500/5">
                            <Tooltip>
                              <TooltipTrigger className="cursor-help">Ver Presença</TooltipTrigger>
                              <TooltipContent>Permite consultar seu histórico de presença em sessões</TooltipContent>
                            </Tooltip>
                          </TableHead>
                          <TableHead className="text-center min-w-[120px] bg-emerald-500/5">
                            <Tooltip>
                              <TooltipTrigger className="cursor-help">Registrar Presença</TooltipTrigger>
                              <TooltipContent>Permite registrar presença de irmãos nas sessões da Loja</TooltipContent>
                            </Tooltip>
                          </TableHead>
                          <TableHead className="text-center min-w-[120px] bg-emerald-500/5">
                            <Tooltip>
                              <TooltipTrigger className="cursor-help">Chamada Diária</TooltipTrigger>
                              <TooltipContent>Permite visualizar a lista de porta / presenças do dia</TooltipContent>
                            </Tooltip>
                          </TableHead>
                          <TableHead className="text-center min-w-[110px] bg-purple-500/5">
                            <Tooltip>
                              <TooltipTrigger className="cursor-help">Editar Perfil</TooltipTrigger>
                              <TooltipContent>Permite editar seus dados cadastrais e foto de perfil</TooltipContent>
                            </Tooltip>
                          </TableHead>
                          <TableHead className="text-center min-w-[140px]">Preset Ativo</TableHead>
                          <TableHead className="text-center min-w-[110px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMembers.map((member) => {
                          const permissions = member.user_permissions;
                          const allEnabled = hasAllPermissions(permissions);
                          const currentPresetKey = getCurrentPresetKey(permissions);
                          const suggestedPresetKey = getSuggestedPresetKey(member.lodge_position);
                          const activePreset = ROLE_PRESETS[currentPresetKey];

                          return (
                            <TableRow key={member.id} className="hover:bg-muted/30 transition-colors">
                              {/* Membro & Cargo */}
                              <TableCell className="py-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    {member.is_admin ? (
                                      <Crown className="h-4 w-4 text-yellow-500" />
                                    ) : (
                                      <User className="h-4 w-4 text-primary" />
                                    )}
                                  </div>
                                  <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold text-sm truncate">{member.full_name}</p>
                                      {member.is_admin && (
                                        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 text-[10px] px-1.5 py-0 font-medium">
                                          Admin
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span>CIM: {member.cim_number || 'N/A'}</span>
                                      {member.lodge_position && (
                                        <>
                                          <span>•</span>
                                          <span className="text-primary font-medium">{member.lodge_position}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>

                              {/* Switch Admin */}
                              <TableCell className="text-center">
                                <Switch
                                  checked={member.is_admin ?? false}
                                  onCheckedChange={() => handleToggleAdmin(
                                    member.user_id, 
                                    member.id, 
                                    permissions?.id ?? null, 
                                    member.is_admin ?? false
                                  )}
                                  className="data-[state=checked]:bg-yellow-500"
                                />
                              </TableCell>

                              {/* Carteirinha */}
                              <TableCell className="text-center bg-blue-500/5">
                                <Switch
                                  checked={permissions?.can_view_card ?? false}
                                  onCheckedChange={() =>
                                    handleTogglePermission(
                                      member.id,
                                      permissions?.id ?? null,
                                      'can_view_card',
                                      permissions?.can_view_card ?? false
                                    )
                                  }
                                />
                              </TableCell>

                              {/* Ver Frequencia */}
                              <TableCell className="text-center bg-emerald-500/5">
                                <Switch
                                  checked={permissions?.can_view_attendance ?? false}
                                  onCheckedChange={() =>
                                    handleTogglePermission(
                                      member.id,
                                      permissions?.id ?? null,
                                      'can_view_attendance',
                                      permissions?.can_view_attendance ?? false
                                    )
                                  }
                                />
                              </TableCell>

                              {/* Registrar Frequencia */}
                              <TableCell className="text-center bg-emerald-500/5">
                                <Switch
                                  checked={permissions?.can_register_attendance ?? false}
                                  onCheckedChange={() =>
                                    handleTogglePermission(
                                      member.id,
                                      permissions?.id ?? null,
                                      'can_register_attendance',
                                      permissions?.can_register_attendance ?? false
                                    )
                                  }
                                />
                              </TableCell>

                              {/* Chamada Diaria */}
                              <TableCell className="text-center bg-emerald-500/5">
                                <Switch
                                  checked={permissions?.can_view_daily_attendances ?? false}
                                  onCheckedChange={() =>
                                    handleTogglePermission(
                                      member.id,
                                      permissions?.id ?? null,
                                      'can_view_daily_attendances',
                                      permissions?.can_view_daily_attendances ?? false
                                    )
                                  }
                                />
                              </TableCell>

                              {/* Editar Perfil */}
                              <TableCell className="text-center bg-purple-500/5">
                                <Switch
                                  checked={permissions?.can_edit_profile ?? false}
                                  onCheckedChange={() =>
                                    handleTogglePermission(
                                      member.id,
                                      permissions?.id ?? null,
                                      'can_edit_profile',
                                      permissions?.can_edit_profile ?? false
                                    )
                                  }
                                />
                              </TableCell>

                              {/* Dropdown de Presets por Cargo */}
                              <TableCell className="text-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1 max-w-[150px] justify-between">
                                      {activePreset ? (
                                        <span className="truncate">{activePreset.name}</span>
                                      ) : (
                                        <span className="text-muted-foreground truncate">Personalizado</span>
                                      )}
                                      <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel className="text-xs">Aplicar Preset por Cargo</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {Object.entries(ROLE_PRESETS).map(([key, preset]) => {
                                      const Icon = preset.icon;
                                      const isSelected = currentPresetKey === key;
                                      const isSuggested = suggestedPresetKey === key && member.lodge_position;

                                      return (
                                        <DropdownMenuItem
                                          key={key}
                                          onClick={() => handleApplyPreset(member.id, permissions?.id ?? null, key)}
                                          className="flex items-center justify-between text-xs cursor-pointer"
                                        >
                                          <div className="flex items-center gap-2">
                                            <Icon className="h-3.5 w-3.5 text-primary" />
                                            <span>{preset.name}</span>
                                          </div>
                                          {isSelected ? (
                                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                                          ) : isSuggested ? (
                                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary text-primary">
                                              Sugerido
                                            </Badge>
                                          ) : null}
                                        </DropdownMenuItem>
                                      );
                                    })}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>

                              {/* Ações Rápidas */}
                              <TableCell className="text-center">
                                <Button
                                  size="sm"
                                  variant={allEnabled ? 'outline' : 'secondary'}
                                  className="h-8 text-xs"
                                  onClick={() =>
                                    handleToggleAll(member.id, permissions?.id ?? null, !allEnabled)
                                  }
                                >
                                  {allEnabled ? 'Limpar Todos' : 'Ativar Todos'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile & Tablet Card View */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
                    {filteredMembers.map((member) => {
                      const permissions = member.user_permissions;
                      const allEnabled = hasAllPermissions(permissions);
                      const currentPresetKey = getCurrentPresetKey(permissions);
                      const activePreset = ROLE_PRESETS[currentPresetKey];

                      return (
                        <Card key={member.id} className="border border-border/80">
                          <CardHeader className="p-4 pb-3 flex flex-row items-start justify-between gap-3 bg-muted/20">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                {member.is_admin ? (
                                  <Crown className="h-5 w-5 text-yellow-500" />
                                ) : (
                                  <User className="h-5 w-5 text-primary" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-sm">{member.full_name}</p>
                                  {member.is_admin && (
                                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 text-[10px] px-1.5 py-0 font-medium">
                                      Admin
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  CIM: {member.cim_number || 'N/A'} {member.lodge_position ? `• ${member.lodge_position}` : ''}
                                </p>
                              </div>
                            </div>

                            {/* Preset Dropdown on Mobile */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 shrink-0">
                                  {activePreset ? activePreset.name : 'Personalizado'}
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuLabel className="text-xs">Aplicar Preset</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {Object.entries(ROLE_PRESETS).map(([key, preset]) => (
                                  <DropdownMenuItem
                                    key={key}
                                    onClick={() => handleApplyPreset(member.id, permissions?.id ?? null, key)}
                                    className="text-xs cursor-pointer"
                                  >
                                    {preset.name}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </CardHeader>

                          <CardContent className="p-4 space-y-3">
                            {/* Switches Grid */}
                            <div className="space-y-2 text-xs">
                              {/* Admin */}
                              <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                                <span className="font-medium flex items-center gap-1.5">
                                  <Crown className="h-3.5 w-3.5 text-yellow-500" /> Admin Geral
                                </span>
                                <Switch
                                  checked={member.is_admin ?? false}
                                  onCheckedChange={() => handleToggleAdmin(
                                    member.user_id, 
                                    member.id, 
                                    permissions?.id ?? null, 
                                    member.is_admin ?? false
                                  )}
                                  className="data-[state=checked]:bg-yellow-500"
                                />
                              </div>

                              {/* Carteirinha */}
                              <div className="flex items-center justify-between p-2 rounded bg-blue-500/5 border border-blue-500/10">
                                <span className="font-medium flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                                  <CreditCard className="h-3.5 w-3.5" /> Ver Carteirinha Digital
                                </span>
                                <Switch
                                  checked={permissions?.can_view_card ?? false}
                                  onCheckedChange={() =>
                                    handleTogglePermission(
                                      member.id,
                                      permissions?.id ?? null,
                                      'can_view_card',
                                      permissions?.can_view_card ?? false
                                    )
                                  }
                                />
                              </div>

                              {/* Ver Frequência */}
                              <div className="flex items-center justify-between p-2 rounded bg-emerald-500/5 border border-emerald-500/10">
                                <span className="font-medium flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                                  <CalendarCheck className="h-3.5 w-3.5" /> Ver Frequência
                                </span>
                                <Switch
                                  checked={permissions?.can_view_attendance ?? false}
                                  onCheckedChange={() =>
                                    handleTogglePermission(
                                      member.id,
                                      permissions?.id ?? null,
                                      'can_view_attendance',
                                      permissions?.can_view_attendance ?? false
                                    )
                                  }
                                />
                              </div>

                              {/* Registrar Presença */}
                              <div className="flex items-center justify-between p-2 rounded bg-emerald-500/5 border border-emerald-500/10">
                                <span className="font-medium flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                                  <CalendarCheck className="h-3.5 w-3.5" /> Registrar Frequências
                                </span>
                                <Switch
                                  checked={permissions?.can_register_attendance ?? false}
                                  onCheckedChange={() =>
                                    handleTogglePermission(
                                      member.id,
                                      permissions?.id ?? null,
                                      'can_register_attendance',
                                      permissions?.can_register_attendance ?? false
                                    )
                                  }
                                />
                              </div>

                              {/* Chamada Diária */}
                              <div className="flex items-center justify-between p-2 rounded bg-emerald-500/5 border border-emerald-500/10">
                                <span className="font-medium flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                                  <CalendarCheck className="h-3.5 w-3.5" /> Presenças do Dia / Lista Porta
                                </span>
                                <Switch
                                  checked={permissions?.can_view_daily_attendances ?? false}
                                  onCheckedChange={() =>
                                    handleTogglePermission(
                                      member.id,
                                      permissions?.id ?? null,
                                      'can_view_daily_attendances',
                                      permissions?.can_view_daily_attendances ?? false
                                    )
                                  }
                                />
                              </div>

                              {/* Editar Perfil */}
                              <div className="flex items-center justify-between p-2 rounded bg-purple-500/5 border border-purple-500/10">
                                <span className="font-medium flex items-center gap-1.5 text-purple-700 dark:text-purple-400">
                                  <UserCheck className="h-3.5 w-3.5" /> Editar Perfil Próprio
                                </span>
                                <Switch
                                  checked={permissions?.can_edit_profile ?? false}
                                  onCheckedChange={() =>
                                    handleTogglePermission(
                                      member.id,
                                      permissions?.id ?? null,
                                      'can_edit_profile',
                                      permissions?.can_edit_profile ?? false
                                    )
                                  }
                                />
                              </div>
                            </div>

                            <div className="pt-2 flex items-center justify-end">
                              <Button
                                size="sm"
                                variant={allEnabled ? 'outline' : 'secondary'}
                                className="w-full text-xs"
                                onClick={() =>
                                  handleToggleAll(member.id, permissions?.id ?? null, !allEnabled)
                                }
                              >
                                {allEnabled ? 'Desativar Todos' : 'Ativar Todos'}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 border rounded-lg border-dashed">
                  <User className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="font-medium text-muted-foreground text-sm">Nenhum membro encontrado com os filtros aplicados.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    </AppLayout>
  );
};

export default Permissions;
