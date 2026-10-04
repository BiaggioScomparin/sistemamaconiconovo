import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { useApprovedProfiles } from '@/hooks/useAdmin';
import { useLodges } from '@/hooks/useLodges';
import { useProfileChildren } from '@/hooks/useProfile';
import { ProfileForm, LODGE_POSITIONS } from '@/components/forms/ProfileForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  Pencil, 
  Trash2, 
  Key, 
  CreditCard, 
  Loader2, 
  UserPlus, 
  FileSpreadsheet, 
  Download, 
  Filter, 
  X, 
  Eye, 
  Search, 
  LayoutGrid, 
  List, 
  Building2, 
  Award, 
  UserCheck, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle,
  Calendar,
  Sparkles
} from 'lucide-react';
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
import { Profile } from '@/lib/supabase-types';
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
import { MemberDetailDialog } from '@/components/admin/MemberDetailDialog';
import logoGoib from '@/assets/logo-goib.png';

interface MemberFilters {
  search: string;
  lodgeId: string;
  degree: string;
  position: string;
  status: string;
}

export default function AdminMembers() {
  const { user, loading, isAdmin } = useAuth();
  const { data: profiles, isLoading } = useApprovedProfiles();
  const { data: lodges } = useLodges();

  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [resetPasswordProfile, setResetPasswordProfile] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  
  // Filter state
  const [filters, setFilters] = useState<MemberFilters>({
    search: '',
    lodgeId: 'all',
    degree: 'all',
    position: 'all',
    status: 'all',
  });
  
  // Batch card generation state
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [generatingCards, setGeneratingCards] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  
  // Create member dialogs
  const [createMemberOpen, setCreateMemberOpen] = useState(false);
  const [importMembersOpen, setImportMembersOpen] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<Profile | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Helper to format position label
  const getPositionLabel = (posValue?: string) => {
    if (!posValue) return null;
    const found = LODGE_POSITIONS.find(p => p.value === posValue || p.label.toLowerCase() === posValue.toLowerCase());
    return found ? found.label : posValue;
  };

  // Filter profiles based on filters state
  const filteredProfiles = useMemo(() => {
    if (!profiles) return [];
    
    return profiles.filter(profile => {
      // General search filter (Name, CPF, CIM, Email)
      const searchLower = filters.search.toLowerCase().trim();
      const searchMatch = !searchLower || (
        profile.full_name.toLowerCase().includes(searchLower) ||
        ((profile as any).cpf || '').toLowerCase().includes(searchLower) ||
        (profile.cim_number || '').toLowerCase().includes(searchLower) ||
        (profile.email || '').toLowerCase().includes(searchLower)
      );

      // Lodge filter
      const lodgeMatch = filters.lodgeId === 'all' || profile.lodge_id === filters.lodgeId;

      // Degree filter
      const profileDegree = ((profile as any).degree || 'Aprendiz').toLowerCase();
      const degreeMatch = filters.degree === 'all' || profileDegree === filters.degree.toLowerCase();

      // Position filter
      const profilePos = (profile as any).lodge_position || (profile as any).cargo || '';
      const posLabel = getPositionLabel(profilePos) || '';
      const positionMatch = filters.position === 'all' || 
        profilePos === filters.position || 
        posLabel.toLowerCase() === filters.position.toLowerCase();

      // Status filter
      const profileStatus = (profile as any).member_status || 'active';
      const statusMatch = filters.status === 'all' || profileStatus === filters.status;

      return searchMatch && lodgeMatch && degreeMatch && positionMatch && statusMatch;
    });
  }, [profiles, filters]);

  // Metrics calculation
  const metrics = useMemo(() => {
    if (!profiles) return { total: 0, active: 0, inactive: 0, masters: 0, lodgesCount: 0, activePercentage: 0 };
    
    const total = profiles.length;
    const active = profiles.filter(p => ((p as any).member_status || 'active') === 'active').length;
    const inactive = total - active;
    const masters = profiles.filter(p => {
      const deg = ((p as any).degree || '').toLowerCase();
      return deg.includes('mestre');
    }).length;

    const uniqueLodgeIds = new Set(profiles.map(p => p.lodge_id).filter(Boolean));
    const activePercentage = total > 0 ? Math.round((active / total) * 100) : 0;

    return {
      total,
      active,
      inactive,
      masters,
      lodgesCount: uniqueLodgeIds.size,
      activePercentage
    };
  }, [profiles]);

  const clearFilters = () => {
    setFilters({
      search: '',
      lodgeId: 'all',
      degree: 'all',
      position: 'all',
      status: 'all',
    });
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.lodgeId !== 'all') count++;
    if (filters.degree !== 'all') count++;
    if (filters.position !== 'all') count++;
    if (filters.status !== 'all') count++;
    return count;
  }, [filters]);

  // Fetch children for the editing profile
  const { data: editingChildren } = useProfileChildren(editingProfile?.id);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-foreground flex items-center gap-2 font-medium">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Carregando membros...
        </div>
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

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          ...data,
          photo_url: photoUrl,
        })
        .eq('id', editingProfile.id);

      if (profileError) throw profileError;

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
      await supabase.from('children').delete().eq('profile_id', profileId);
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
    spouse_birth_date: (profile as any).spouse_birth_date || undefined,
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

  // Helper badge renderers
  const renderDegreeBadge = (degree?: string) => {
    const deg = degree || 'Aprendiz';
    let variantClasses = 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    
    if (deg === 'Companheiro') {
      variantClasses = 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800';
    } else if (deg === 'Mestre') {
      variantClasses = 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';
    } else if (deg === 'Mestre Instalado') {
      variantClasses = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 font-semibold';
    }

    return (
      <Badge variant="outline" className={`font-medium ${variantClasses}`}>
        {deg}
      </Badge>
    );
  };

  const renderPositionBadge = (posValue?: string) => {
    const label = getPositionLabel(posValue);
    if (!label) return null;
    return (
      <Badge variant="secondary" className="bg-secondary/20 text-secondary-foreground font-normal">
        {label}
      </Badge>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Gestão de Membros</h1>
            <p className="text-muted-foreground font-body mt-1">
              Visualize, filtre e gerencie os membros da jurisdição
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* View Switcher */}
            <div className="flex items-center border border-input rounded-md bg-background p-1 mr-2">
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-8 px-2.5"
                title="Visualização em Tabela"
              >
                <List className="h-4 w-4 mr-1.5" />
                Tabela
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 px-2.5"
                title="Visualização em Cards"
              >
                <LayoutGrid className="h-4 w-4 mr-1.5" />
                Cards
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" className="flex items-center gap-2 shadow-sm">
                  <UserPlus className="h-4 w-4" />
                  Adicionar Membro
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background border border-border z-50">
                <DropdownMenuItem onClick={() => setCreateMemberOpen(true)} className="cursor-pointer">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Criar Manualmente
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setImportMembersOpen(true)} className="cursor-pointer">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Importar do Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={downloadMembersTemplate} className="cursor-pointer">
                  <Download className="mr-2 h-4 w-4" />
                  Baixar Modelo Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={() => setCardDialogOpen(true)}
              variant="outline"
              className="flex items-center gap-2 shadow-sm"
            >
              <CreditCard className="h-4 w-4" />
              Carteirinhas
              {selectedMembers.size > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full text-xs font-semibold">
                  {selectedMembers.size}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Metrics KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-elegant border-l-4 border-l-primary">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total de Membros</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold font-display">{metrics.total}</span>
                  <Badge variant="outline" className="text-xs font-normal bg-primary/10 text-primary border-primary/20">
                    {metrics.activePercentage}% ativos
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <Users className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-elegant border-l-4 border-l-emerald-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status de Membros</p>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400">
                    {metrics.active} <span className="text-xs font-normal text-muted-foreground">ativos</span>
                  </span>
                  <span className="text-sm font-medium text-red-500">
                    {metrics.inactive} <span className="text-xs font-normal text-muted-foreground">inativos</span>
                  </span>
                </div>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-600 dark:text-emerald-400">
                <UserCheck className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-elegant border-l-4 border-l-amber-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mestres Cadastrados</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold font-display">{metrics.masters}</span>
                  <span className="text-xs text-muted-foreground">de {metrics.total} membros</span>
                </div>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-full text-amber-600 dark:text-amber-400">
                <Award className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-elegant border-l-4 border-l-blue-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lojas Representadas</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold font-display">{metrics.lodgesCount}</span>
                  <span className="text-xs text-muted-foreground">lojas com membros</span>
                </div>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full text-blue-600 dark:text-blue-400">
                <Building2 className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Filter Toolbar Panel */}
        <Card className="card-elegant">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                Filtros e Busca
              </CardTitle>
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs text-muted-foreground hover:text-foreground h-8"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Limpar Todos ({activeFiltersCount})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search Bar */}
              <div className="relative lg:col-span-1 sm:col-span-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome, CPF, CIM ou Email..."
                  value={filters.search}
                  onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                  className="pl-9 text-sm h-9"
                />
              </div>

              {/* Lodge Filter */}
              <div>
                <Select
                  value={filters.lodgeId}
                  onValueChange={(val) => setFilters(f => ({ ...f, lodgeId: val }))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todas as Lojas" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50 max-h-60">
                    <SelectItem value="all">Todas as Lojas</SelectItem>
                    {lodges?.map((lodge) => (
                      <SelectItem key={lodge.id} value={lodge.id}>
                        {lodge.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Degree Filter */}
              <div>
                <Select
                  value={filters.degree}
                  onValueChange={(val) => setFilters(f => ({ ...f, degree: val }))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todos os Graus" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50">
                    <SelectItem value="all">Todos os Graus</SelectItem>
                    <SelectItem value="Aprendiz">Aprendiz</SelectItem>
                    <SelectItem value="Companheiro">Companheiro</SelectItem>
                    <SelectItem value="Mestre">Mestre</SelectItem>
                    <SelectItem value="Mestre Instalado">Mestre Instalado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Position Filter */}
              <div>
                <Select
                  value={filters.position}
                  onValueChange={(val) => setFilters(f => ({ ...f, position: val }))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todos os Cargos" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50 max-h-60">
                    <SelectItem value="all">Todos os Cargos</SelectItem>
                    {LODGE_POSITIONS.map((pos) => (
                      <SelectItem key={pos.value} value={pos.value}>
                        {pos.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div>
                <Select
                  value={filters.status}
                  onValueChange={(val) => setFilters(f => ({ ...f, status: val }))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todos os Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50">
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="active">Apenas Ativos</SelectItem>
                    <SelectItem value="inactive">Apenas Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filter Chips */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                <span className="text-xs font-medium text-muted-foreground mr-1">Filtros ativos:</span>
                
                {filters.search && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-muted">
                    Busca: "{filters.search}"
                    <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setFilters(f => ({ ...f, search: '' }))} />
                  </Badge>
                )}

                {filters.lodgeId !== 'all' && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-muted">
                    Loja: {lodges?.find(l => l.id === filters.lodgeId)?.name || 'Selecionada'}
                    <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setFilters(f => ({ ...f, lodgeId: 'all' }))} />
                  </Badge>
                )}

                {filters.degree !== 'all' && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-muted">
                    Grau: {filters.degree}
                    <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setFilters(f => ({ ...f, degree: 'all' }))} />
                  </Badge>
                )}

                {filters.position !== 'all' && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-muted">
                    Cargo: {getPositionLabel(filters.position)}
                    <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setFilters(f => ({ ...f, position: 'all' }))} />
                  </Badge>
                )}

                {filters.status !== 'all' && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-muted">
                    Status: {filters.status === 'active' ? 'Ativos' : 'Inativos'}
                    <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setFilters(f => ({ ...f, status: 'all' }))} />
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Batch Action Bar when members selected */}
        {selectedMembers.size > 0 && (
          <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={filteredProfiles.length > 0 && selectedMembers.size === filteredProfiles.length}
                onCheckedChange={toggleAllMembers}
                aria-label="Selecionar todos os filtrados"
              />
              <span className="text-sm font-medium text-foreground">
                <strong>{selectedMembers.size}</strong> membro(s) selecionado(s) de {filteredProfiles.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedMembers(new Set())}
                className="text-xs h-8"
              >
                Limpar seleção
              </Button>
              <Button
                size="sm"
                onClick={() => setCardDialogOpen(true)}
                className="bg-secondary text-secondary-foreground hover:bg-gold-dark text-xs h-8 flex items-center gap-1.5"
              >
                <CreditCard className="h-3.5 w-3.5" />
                Gerar Carteirinhas ({selectedMembers.size})
              </Button>
            </div>
          </div>
        )}

        {/* Content Section: Table vs Grid view */}
        <Card className="card-elegant">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <Users className="h-5 w-5 text-secondary" />
                Listagem de Membros ({filteredProfiles.length} de {profiles?.length || 0})
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span>Carregando lista de membros...</span>
              </div>
            ) : profiles?.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                Nenhum membro cadastrado.
              </div>
            ) : filteredProfiles.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                <Filter className="h-8 w-8 text-muted-foreground/50" />
                <div>
                  <p className="font-medium text-foreground">Nenhum membro atende aos filtros selecionados.</p>
                  <p className="text-sm text-muted-foreground mt-1">Tente remover ou alterar os filtros de busca.</p>
                </div>
                <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2">
                  Limpar Filtros
                </Button>
              </div>
            ) : viewMode === 'table' ? (
              /* TABLE VIEW */
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-12">
                        <Checkbox
                          checked={filteredProfiles.length > 0 && selectedMembers.size === filteredProfiles.length}
                          onCheckedChange={toggleAllMembers}
                          aria-label="Selecionar todos"
                        />
                      </TableHead>
                      <TableHead>Membro</TableHead>
                      <TableHead>CPF / CIM</TableHead>
                      <TableHead>Grau</TableHead>
                      <TableHead>Cargo na Loja</TableHead>
                      <TableHead>Loja</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right w-36">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.map((profile) => {
                      const isSelected = selectedMembers.has(profile.id);
                      const memberStatus = (profile as any).member_status || 'active';
                      const position = (profile as any).lodge_position || (profile as any).cargo;
                      
                      return (
                        <TableRow 
                          key={profile.id}
                          className={isSelected ? 'bg-primary/5' : undefined}
                        >
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleMemberSelection(profile.id)}
                              aria-label={`Selecionar ${profile.full_name}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border border-border">
                                <AvatarImage src={profile.photo_url || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                  {profile.full_name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground text-sm leading-tight">
                                  {profile.full_name}
                                </span>
                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {profile.email}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs font-mono">
                              <span>CPF: {(profile as any).cpf || '-'}</span>
                              <span className="text-muted-foreground">CIM: {profile.cim_number || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {renderDegreeBadge((profile as any).degree)}
                          </TableCell>
                          <TableCell>
                            {renderPositionBadge(position) || <span className="text-muted-foreground text-xs">-</span>}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium">
                              {(profile as any).lodges?.name || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={memberStatus}
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
                              <SelectTrigger className="w-28 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-background border border-border z-50">
                                <SelectItem value="active">
                                  <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Ativo
                                  </span>
                                </SelectItem>
                                <SelectItem value="inactive">
                                  <span className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
                                    <XCircle className="h-3.5 w-3.5" />
                                    Inativo
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => setViewingProfile(profile)}
                                title="Ver Detalhes"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => handleEdit(profile)}
                                title="Editar Membro"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {profile.user_id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
                                    className="h-8 w-8 text-destructive/80 hover:text-destructive"
                                    disabled={deleting === profile.id}
                                    title="Excluir Membro"
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
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              /* GRID CARDS VIEW */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProfiles.map((profile) => {
                  const isSelected = selectedMembers.has(profile.id);
                  const memberStatus = (profile as any).member_status || 'active';
                  const position = (profile as any).lodge_position || (profile as any).cargo;

                  return (
                    <Card 
                      key={profile.id}
                      className={`card-elegant relative transition-all duration-200 hover:shadow-md ${
                        isSelected ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : ''
                      }`}
                    >
                      <CardContent className="p-4 space-y-4">
                        {/* Top Card Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleMemberSelection(profile.id)}
                              aria-label={`Selecionar ${profile.full_name}`}
                              className="mt-1"
                            />
                            <Avatar className="h-12 w-12 border-2 border-border shadow-sm">
                              <AvatarImage src={profile.photo_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                                {profile.full_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          </div>

                          <div className="flex items-center gap-1">
                            <Badge 
                              variant="outline" 
                              className={memberStatus === 'active' 
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 text-xs' 
                                : 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 text-xs'
                              }
                            >
                              {memberStatus === 'active' ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                        </div>

                        {/* Member Information */}
                        <div>
                          <h3 className="font-display font-semibold text-foreground text-base line-clamp-1">
                            {profile.full_name}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {profile.email || 'Sem e-mail cadastrado'}
                          </p>
                        </div>

                        {/* Badges section */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {renderDegreeBadge((profile as any).degree)}
                          {renderPositionBadge(position)}
                        </div>

                        {/* Details summary */}
                        <div className="space-y-1.5 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5 text-primary/70" />
                              Loja:
                            </span>
                            <span className="font-medium text-foreground truncate max-w-[150px]">
                              {(profile as any).lodges?.name || '-'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>CIM:</span>
                            <span className="font-mono font-medium text-foreground">{profile.cim_number || '-'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>CPF:</span>
                            <span className="font-mono text-foreground">{(profile as any).cpf || '-'}</span>
                          </div>
                          {profile.initiation_date && (
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                Iniciação:
                              </span>
                              <span>{formatDate(profile.initiation_date)}</span>
                            </div>
                          )}
                        </div>

                        {/* Card Actions Footer */}
                        <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/50">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingProfile(profile)}
                            className="h-8 text-xs"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Ver
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(profile)}
                            className="h-8 text-xs"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Editar
                          </Button>
                          {profile.user_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setResetPasswordProfile(profile);
                                setNewPassword('');
                              }}
                              className="h-8 text-xs"
                              title="Resetar Senha"
                            >
                              <Key className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-destructive/80 hover:text-destructive"
                                disabled={deleting === profile.id}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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
                      </CardContent>
                    </Card>
                  );
                })}
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
                  Nenhum membro selecionado. Selecione os membros na tabela ou nos cards usando as caixas de seleção.
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

      {/* Member Detail Dialog */}
      <MemberDetailDialog
        profile={viewingProfile}
        open={!!viewingProfile}
        onOpenChange={(open) => !open && setViewingProfile(null)}
      />
    </AppLayout>
  );
}