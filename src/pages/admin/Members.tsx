import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { useApprovedProfiles } from '@/hooks/useAdmin';
import { useProfileChildren } from '@/hooks/useProfile';
import { ProfileForm } from '@/components/forms/ProfileForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Users, Pencil, Trash2, Key, CreditCard, Loader2, UserPlus, FileSpreadsheet, Download, Filter, X, Eye } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Profile, MasonicDegree } from '@/lib/supabase-types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { generateBatchCardsPDF } from '@/lib/generateBatchCards';
import { downloadMembersTemplate } from '@/lib/excelMembersTemplate';
import { CreateMemberDialog } from '@/components/admin/CreateMemberDialog';
import { ImportMembersDialog } from '@/components/admin/ImportMembersDialog';
import logoGoib from '@/assets/logo-goib.png';

interface ColumnFilters {
  name: string;
  cpf: string;
  cim: string;
  degree: string;
  lodge: string;
  status: string;
}

export default function AdminMembers() {
  const { user, loading, isAdmin } = useAuth();
  const { data: profiles, isLoading } = useApprovedProfiles();
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [resetPasswordProfile, setResetPasswordProfile] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Column filters state
  const [filters, setFilters] = useState<ColumnFilters>({
    name: '',
    cpf: '',
    cim: '',
    degree: '',
    lodge: '',
    status: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Batch card generation state
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [generatingCards, setGeneratingCards] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  
  // Create member dialogs
  const [createMemberOpen, setCreateMemberOpen] = useState(false);
  const [importMembersOpen, setImportMembersOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filter profiles based on column filters
  const filteredProfiles = profiles?.filter(profile => {
    const nameMatch = profile.full_name.toLowerCase().includes(filters.name.toLowerCase());
    const cpfMatch = !filters.cpf || ((profile as any).cpf || '').toLowerCase().includes(filters.cpf.toLowerCase());
    const cimMatch = !filters.cim || (profile.cim_number || '').toLowerCase().includes(filters.cim.toLowerCase());
    const degreeMatch = !filters.degree || ((profile as any).degree || 'Aprendiz').toLowerCase().includes(filters.degree.toLowerCase());
    const lodgeMatch = !filters.lodge || ((profile as any).lodges?.name || '').toLowerCase().includes(filters.lodge.toLowerCase());
    const statusMatch = !filters.status || ((profile as any).member_status || 'active') === filters.status;
    
    return nameMatch && cpfMatch && cimMatch && degreeMatch && lodgeMatch && statusMatch;
  });

  const clearFilters = () => {
    setFilters({
      name: '',
      cpf: '',
      cim: '',
      degree: '',
      lodge: '',
      status: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  // Fetch children for the editing profile
  const { data: editingChildren } = useProfileChildren(editingProfile?.id);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordProfile || !newPassword) return;

    if (!resetPasswordProfile.user_id) {
      toast({ 
        title: 'Erro', 
        description: 'Este membro não possui acesso ao sistema.', 
        variant: 'destructive' 
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({ 
        title: 'Erro', 
        description: 'A senha deve ter pelo menos 6 caracteres.', 
        variant: 'destructive' 
      });
      return;
    }

    setResettingPassword(true);
    try {
      const response = await supabase.functions.invoke('reset-password', {
        body: {
          userId: resetPasswordProfile.user_id,
          newPassword: newPassword,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast({ 
        title: 'Senha alterada!', 
        description: `A senha de ${resetPasswordProfile.full_name} foi atualizada com sucesso.` 
      });
      setResetPasswordProfile(null);
      setNewPassword('');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleSave = async (data: any, children: any[], photoFile: File | null) => {
    if (!editingProfile) return;

    setSaving(true);
    try {
      let photoUrl = editingProfile.photo_url;

      // Upload new photo if provided
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${editingProfile.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, photoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('photos')
          .getPublicUrl(fileName);

        photoUrl = urlData.publicUrl;
      }

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          ...data,
          photo_url: photoUrl,
        })
        .eq('id', editingProfile.id);

      if (profileError) throw profileError;

      // Handle children - delete existing and add new
      await supabase
        .from('children')
        .delete()
        .eq('profile_id', editingProfile.id);

      const validChildren = children.filter(c => c.name && c.birth_date);
      if (validChildren.length > 0) {
        const { error: childrenError } = await supabase
          .from('children')
          .insert(
            validChildren.map(c => ({
              profile_id: editingProfile.id,
              name: c.name,
              birth_date: c.birth_date,
            }))
          );

        if (childrenError) throw childrenError;
      }

      toast({ title: 'Membro atualizado com sucesso!' });
      setEditingProfile(null);
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] });
    } catch (error: any) {
      console.error('Error updating member:', error);
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (profileId: string, fullName: string) => {
    setDeleting(profileId);
    try {
      // Delete children first
      await supabase.from('children').delete().eq('profile_id', profileId);

      // Delete the profile
      const { error } = await supabase.from('profiles').delete().eq('id', profileId);

      if (error) throw error;

      toast({ title: 'Membro excluído', description: `${fullName} foi removido com sucesso.` });
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] });
    } catch (error: any) {
      console.error('Error deleting member:', error);
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setDeleting(null);
    }
  };

  const getInitialData = (profile: Profile) => ({
    full_name: profile.full_name,
    email: profile.email || '',
    cpf: profile.cpf || '',
    birth_date: profile.birth_date,
    initiation_date: profile.initiation_date || undefined,
    mother_name: profile.mother_name || undefined,
    spouse_name: profile.spouse_name || undefined,
    cell_phone: (profile as any).cell_phone || undefined,
    cim_number: profile.cim_number || undefined,
    degree: (profile as any).degree || 'Aprendiz',
    cargo: (profile as any).cargo || undefined,
    lodge_position: (profile as any).lodge_position || undefined,
    lodge_id: profile.lodge_id || undefined,
    cep: profile.cep || undefined,
    street: profile.street || undefined,
    number: profile.number || undefined,
    complement: profile.complement || undefined,
    neighborhood: profile.neighborhood || undefined,
    city: profile.city || undefined,
    state: profile.state || undefined,
  });

  // Card selection handlers
  const toggleMemberSelection = (profileId: string) => {
    const newSelection = new Set(selectedMembers);
    if (newSelection.has(profileId)) {
      newSelection.delete(profileId);
    } else {
      newSelection.add(profileId);
    }
    setSelectedMembers(newSelection);
  };

  const toggleAllMembers = () => {
    if (!filteredProfiles) return;
    if (selectedMembers.size === filteredProfiles.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(filteredProfiles.map(p => p.id)));
    }
  };

  const handleGenerateCards = async () => {
    if (selectedMembers.size === 0) {
      toast({ title: 'Selecione membros', description: 'Selecione ao menos um membro para gerar as carteirinhas.', variant: 'destructive' });
      return;
    }

    const selectedProfiles = profiles?.filter(p => selectedMembers.has(p.id)) || [];
    if (selectedProfiles.length === 0) return;

    setGeneratingCards(true);
    setGenerationProgress({ current: 0, total: selectedProfiles.length });

    try {
      const membersData = selectedProfiles.map(p => {
        // The hook returns 'lodges' from the join, not 'lodge'
        const lodgeData = (p as any).lodges || p.lodge;
        return {
          id: p.id,
          full_name: p.full_name,
          photo_url: p.photo_url,
          cim_number: p.cim_number,
          degree: (p as any).degree,
          cargo: (p as any).cargo,
          initiation_date: p.initiation_date,
          birth_date: p.birth_date,
          member_status: (p as any).member_status || 'active',
          lodges: lodgeData ? {
            name: lodgeData.name,
            city: lodgeData.city,
            state: lodgeData.state,
          } : null,
        };
      });

      await generateBatchCardsPDF(
        membersData,
        logoGoib,
        window.location.origin,
        (current, total) => setGenerationProgress({ current, total })
      );

      toast({ 
        title: 'Carteirinhas geradas!', 
        description: `PDF com ${selectedProfiles.length} carteirinha(s) foi baixado com sucesso.` 
      });
      setCardDialogOpen(false);
      setSelectedMembers(new Set());
    } catch (error: any) {
      console.error('Error generating cards:', error);
      toast({ title: 'Erro', description: 'Erro ao gerar as carteirinhas. Tente novamente.', variant: 'destructive' });
    } finally {
      setGeneratingCards(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display text-foreground">Membros</h1>
          <p className="text-muted-foreground font-body mt-1">Lista de membros aprovados</p>
        </div>

        <Card className="card-elegant">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2 font-display">
                <Users className="h-5 w-5 text-secondary" />
                Membros Ativos ({filteredProfiles?.length || 0} de {profiles?.length || 0})
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={showFilters ? "secondary" : "outline"}
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filtros
                  {hasActiveFilters && (
                    <span className="ml-1 px-2 py-0.5 bg-primary text-primary-foreground rounded-full text-xs">
                      !
                    </span>
                  )}
                </Button>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-muted-foreground"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Limpar
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="default" className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Adicionar Membro
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background border border-border z-50">
                    <DropdownMenuItem onClick={() => setCreateMemberOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Criar Manualmente
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setImportMembersOpen(true)}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Importar do Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={downloadMembersTemplate}>
                      <Download className="mr-2 h-4 w-4" />
                      Baixar Modelo Excel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  onClick={() => setCardDialogOpen(true)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  Gerar Carteirinhas
                  {selectedMembers.size > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full text-xs">
                      {selectedMembers.size}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : profiles?.length === 0 ? (
              <p className="text-muted-foreground">Nenhum membro aprovado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={filteredProfiles && filteredProfiles.length > 0 && selectedMembers.size === filteredProfiles.length}
                          onCheckedChange={toggleAllMembers}
                          aria-label="Selecionar todos"
                        />
                      </TableHead>
                      <TableHead>Membro</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>CIM</TableHead>
                      <TableHead>Grau</TableHead>
                      <TableHead>Loja</TableHead>
                      <TableHead>Iniciação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-32">Ações</TableHead>
                    </TableRow>
                    {showFilters && (
                      <TableRow className="bg-muted/50">
                        <TableHead></TableHead>
                        <TableHead>
                          <Input
                            placeholder="Filtrar nome..."
                            value={filters.name}
                            onChange={(e) => setFilters(f => ({ ...f, name: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </TableHead>
                        <TableHead>
                          <Input
                            placeholder="Filtrar CPF..."
                            value={filters.cpf}
                            onChange={(e) => setFilters(f => ({ ...f, cpf: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </TableHead>
                        <TableHead>
                          <Input
                            placeholder="Filtrar CIM..."
                            value={filters.cim}
                            onChange={(e) => setFilters(f => ({ ...f, cim: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </TableHead>
                        <TableHead>
                          <Select
                            value={filters.degree}
                            onValueChange={(value) => setFilters(f => ({ ...f, degree: value === 'all' ? '' : value }))}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="Aprendiz">Aprendiz</SelectItem>
                              <SelectItem value="Companheiro">Companheiro</SelectItem>
                              <SelectItem value="Mestre">Mestre</SelectItem>
                              <SelectItem value="Mestre Instalado">Mestre Instalado</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableHead>
                        <TableHead>
                          <Input
                            placeholder="Filtrar loja..."
                            value={filters.lodge}
                            onChange={(e) => setFilters(f => ({ ...f, lodge: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </TableHead>
                        <TableHead></TableHead>
                        <TableHead>
                          <Select
                            value={filters.status}
                            onValueChange={(value) => setFilters(f => ({ ...f, status: value === 'all' ? '' : value }))}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="active">Ativo</SelectItem>
                              <SelectItem value="inactive">Inativo</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    )}
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          Nenhum membro encontrado com os filtros aplicados.
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredProfiles?.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedMembers.has(profile.id)}
                            onCheckedChange={() => toggleMemberSelection(profile.id)}
                            aria-label={`Selecionar ${profile.full_name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={profile.photo_url || undefined} />
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {profile.full_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-medium">{profile.full_name}</span>
                              {profile.user_id && (
                                <p className="text-xs text-muted-foreground">Com acesso</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{(profile as any).cpf || '-'}</TableCell>
                        <TableCell>{profile.cim_number || '-'}</TableCell>
                        <TableCell>{(profile as any).degree || 'Aprendiz'}</TableCell>
                        <TableCell>{(profile as any).lodges?.name || '-'}</TableCell>
                        <TableCell>{formatDate(profile.initiation_date)}</TableCell>
                        <TableCell>
                          <Select
                            value={(profile as any).member_status || 'active'}
                            onValueChange={async (value) => {
                              try {
                                const { error } = await supabase
                                  .from('profiles')
                                  .update({ member_status: value })
                                  .eq('id', profile.id);
                                if (error) throw error;
                                queryClient.invalidateQueries({ queryKey: ['all-profiles'] });
                                toast({ 
                                  title: 'Status atualizado', 
                                  description: `${profile.full_name} agora está ${value === 'active' ? 'ativo' : 'inativo'}.` 
                                });
                              } catch (error: any) {
                                toast({ title: 'Erro', description: error.message, variant: 'destructive' });
                              }
                            }}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-green-500" />
                                  Ativo
                                </span>
                              </SelectItem>
                              <SelectItem value="inactive">
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-red-500" />
                                  Inativo
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(profile)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {profile.user_id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setResetPasswordProfile(profile);
                                  setNewPassword('');
                                }}
                                title="Resetar Senha"
                              >
                                <Key className="h-4 w-4" />
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  disabled={deleting === profile.id}
                                  title="Excluir"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir Membro</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir <strong>{profile.full_name}</strong>? 
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(profile.id, profile.full_name)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingProfile} onOpenChange={(open) => !open && setEditingProfile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Editar Membro</DialogTitle>
          </DialogHeader>
          {editingProfile && (
            <ProfileForm
              initialData={getInitialData(editingProfile)}
              initialChildren={editingChildren?.map(c => ({
                id: c.id,
                name: c.name,
                birth_date: c.birth_date,
              })) || []}
              onSubmit={handleSave}
              loading={saving}
              photoUrl={editingProfile.photo_url}
              showAdminFields={true}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordProfile} onOpenChange={(open) => !open && setResetPasswordProfile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Resetar Senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para {resetPasswordProfile?.full_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordProfile(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={resettingPassword || newPassword.length < 6}
            >
              {resettingPassword ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Cards Dialog */}
      <Dialog open={cardDialogOpen} onOpenChange={(open) => !generatingCards && setCardDialogOpen(open)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Gerar Carteirinhas em PDF
            </DialogTitle>
            <DialogDescription>
              Selecione os membros para gerar as carteirinhas em um único arquivo PDF.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {selectedMembers.size === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Nenhum membro selecionado. Selecione os membros na tabela usando as caixas de seleção.
                </p>
                <Button variant="outline" onClick={() => setCardDialogOpen(false)}>
                  Voltar e selecionar
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-medium mb-2">
                    {selectedMembers.size} membro(s) selecionado(s):
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {profiles?.filter(p => selectedMembers.has(p.id)).map(profile => (
                      <div key={profile.id} className="flex items-center gap-3 bg-background p-2 rounded">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile.photo_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                            {profile.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{profile.full_name}</p>
                          <p className="text-xs text-muted-foreground">CIM: {profile.cim_number || '-'}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleMemberSelection(profile.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {generatingCards && (
                  <div className="bg-secondary/10 p-4 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <Loader2 className="h-5 w-5 animate-spin text-secondary" />
                      <p className="font-medium">Gerando carteirinhas...</p>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-secondary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${generationProgress.total > 0 ? (generationProgress.current / generationProgress.total) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {generationProgress.current} de {generationProgress.total} carteirinha(s)
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCardDialogOpen(false)}
              disabled={generatingCards}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGenerateCards}
              disabled={generatingCards || selectedMembers.size === 0}
              className="bg-secondary hover:bg-gold-dark text-secondary-foreground"
            >
              {generatingCards ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Gerar PDF ({selectedMembers.size})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Member Dialog */}
      <CreateMemberDialog 
        open={createMemberOpen} 
        onOpenChange={setCreateMemberOpen} 
      />

      {/* Import Members Dialog */}
      <ImportMembersDialog 
        open={importMembersOpen} 
        onOpenChange={setImportMembersOpen} 
      />
    </AppLayout>
  );
}