import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { useApprovedProfiles } from '@/hooks/useAdmin';
import { useProfileChildren } from '@/hooks/useProfile';
import { ProfileForm } from '@/components/forms/ProfileForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Users, Pencil } from 'lucide-react';
import { Profile } from '@/lib/supabase-types';

export default function AdminMembers() {
  const { user, loading, isAdmin } = useAuth();
  const { data: profiles, isLoading } = useApprovedProfiles();
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const getInitialData = (profile: Profile) => ({
    full_name: profile.full_name,
    email: profile.email || '',
    cpf: profile.cpf || '',
    birth_date: profile.birth_date,
    initiation_date: profile.initiation_date || undefined,
    mother_name: profile.mother_name || undefined,
    spouse_name: profile.spouse_name || undefined,
    cim_number: profile.cim_number || undefined,
    lodge_id: profile.lodge_id || undefined,
    cep: profile.cep || undefined,
    street: profile.street || undefined,
    number: profile.number || undefined,
    complement: profile.complement || undefined,
    neighborhood: profile.neighborhood || undefined,
    city: profile.city || undefined,
    state: profile.state || undefined,
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display text-foreground">Membros</h1>
          <p className="text-muted-foreground font-body mt-1">Lista de membros aprovados</p>
        </div>

        <Card className="card-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Users className="h-5 w-5 text-secondary" />
              Membros Ativos ({profiles?.length || 0})
            </CardTitle>
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
                      <TableHead>Membro</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>CIM</TableHead>
                      <TableHead>Loja</TableHead>
                      <TableHead>Iniciação</TableHead>
                      <TableHead className="w-20">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles?.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={profile.photo_url || undefined} />
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {profile.full_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{profile.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{(profile as any).cpf || '-'}</TableCell>
                        <TableCell>{profile.cim_number || '-'}</TableCell>
                        <TableCell>{profile.lodge?.name || '-'}</TableCell>
                        <TableCell>{formatDate(profile.initiation_date)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(profile)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
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
            />
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
