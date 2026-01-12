import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Shield, Search, User } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface MemberWithPermissions {
  id: string;
  full_name: string;
  cim_number: string | null;
  email: string | null;
  member_status: string;
  user_permissions: {
    id: string;
    can_view_card: boolean;
    can_view_attendance: boolean;
    can_register_attendance: boolean;
    can_edit_profile: boolean;
  } | null;
}

const permissionLabels = {
  can_view_card: 'Ver Carteirinha',
  can_view_attendance: 'Ver Frequência',
  can_register_attendance: 'Registrar Frequência',
  can_edit_profile: 'Editar Perfil',
};

const Permissions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: members, isLoading } = useQuery({
    queryKey: ['members-with-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, cim_number, email, member_status, user_permissions(*)')
        .not('user_id', 'is', null)
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data as MemberWithPermissions[];
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
        // Update existing permission
        const { error } = await supabase
          .from('user_permissions')
          .update({ [field]: value })
          .eq('id', permissionId);

        if (error) throw error;
      } else {
        // Create new permission record
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
        description: 'Todas as permissões foram atualizadas.',
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

  const handleToggleAll = (profileId: string, permissionId: string | null, enableAll: boolean) => {
    toggleAllPermissionsMutation.mutate({ profileId, permissionId, enableAll });
  };

  const filteredMembers = members?.filter(
    (member) =>
      member.full_name.toLowerCase().includes(search.toLowerCase()) ||
      member.cim_number?.includes(search) ||
      member.email?.toLowerCase().includes(search.toLowerCase())
  );

  const hasAllPermissions = (permissions: MemberWithPermissions['user_permissions']) => {
    if (!permissions) return false;
    return (
      permissions.can_view_card &&
      permissions.can_view_attendance &&
      permissions.can_register_attendance &&
      permissions.can_edit_profile
    );
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Gerenciar Permissões</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Permissões de Funcionalidades</CardTitle>
            <CardDescription>
              Controle quais funcionalidades cada membro pode acessar no sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CIM ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : filteredMembers && filteredMembers.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Membro</TableHead>
                      <TableHead className="text-center">Ver Carteirinha</TableHead>
                      <TableHead className="text-center">Ver Frequência</TableHead>
                      <TableHead className="text-center">Registrar Frequência</TableHead>
                      <TableHead className="text-center">Editar Perfil</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => {
                      const permissions = member.user_permissions;
                      const allEnabled = hasAllPermissions(permissions);

                      return (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{member.full_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  CIM: {member.cim_number || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
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
                          <TableCell className="text-center">
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
                          <TableCell className="text-center">
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
                          <TableCell className="text-center">
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
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant={allEnabled ? 'outline' : 'default'}
                              onClick={() =>
                                handleToggleAll(member.id, permissions?.id ?? null, !allEnabled)
                              }
                            >
                              {allEnabled ? 'Desativar Todos' : 'Ativar Todos'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum membro encontrado.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Permissions;
