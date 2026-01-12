import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProfile, useProfileChildren, useUpdateProfile, useAddChild, useRemoveChild } from '@/hooks/useProfile';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { ProfileForm } from '@/components/forms/ProfileForm';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Lock } from 'lucide-react';

export default function MemberProfile() {
  const { user, loading } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const { data: permissions, isLoading: permissionsLoading } = useUserPermissions();
  const { data: children } = useProfileChildren(profile?.id);
  const updateProfile = useUpdateProfile();
  const addChild = useAddChild();
  const removeChild = useRemoveChild();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const canEditProfile = permissions?.can_edit_profile ?? false;

  if (loading || isLoading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (data: any, newChildren: any[], photoFile: File | null) => {
    setSaving(true);

    try {
      let photoUrl = profile?.photo_url;

      // Upload new photo if provided
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;

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
      await updateProfile.mutateAsync({
        ...data,
        photo_url: photoUrl,
      });

      // Handle children updates
      if (profile) {
        // Remove children that are no longer in the list
        const existingIds = children?.map(c => c.id) || [];
        const newIds = newChildren.filter(c => c.id).map(c => c.id);
        
        for (const id of existingIds) {
          if (!newIds.includes(id)) {
            await removeChild.mutateAsync({ childId: id!, profileId: profile.id });
          }
        }

        // Add new children
        for (const child of newChildren) {
          if (!child.id && child.name && child.birth_date) {
            await addChild.mutateAsync({
              profileId: profile.id,
              name: child.name,
              birthDate: child.birth_date,
            });
          }
        }
      }

      toast({ title: 'Perfil atualizado com sucesso!' });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const initialData = profile ? {
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
  } : undefined;

  const initialChildren = children?.map(c => ({
    id: c.id,
    name: c.name,
    birth_date: c.birth_date,
  })) || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display text-foreground">Meu Perfil</h1>
          <p className="text-muted-foreground font-body mt-1">Atualize seus dados cadastrais</p>
        </div>

        {profile?.status === 'pending' && (
          <Card className="card-elegant border-amber-500">
            <CardContent className="py-4">
              <p className="text-amber-600 font-body">
                Seu cadastro está aguardando aprovação de um administrador.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="card-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <User className="h-5 w-5 text-secondary" />
              Dados Cadastrais
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!canEditProfile ? (
              <div className="py-8 text-center">
                <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground font-medium">
                  Edição de perfil não liberada
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Entre em contato com a administração para liberar esta funcionalidade.
                </p>
              </div>
            ) : profile ? (
              <ProfileForm
                initialData={initialData}
                initialChildren={initialChildren}
                onSubmit={handleSubmit}
                loading={saving}
                photoUrl={profile.photo_url}
              />
            ) : (
              <p className="text-muted-foreground">Perfil não encontrado.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
