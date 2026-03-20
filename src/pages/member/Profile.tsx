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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Lock, Eye, EyeOff, KeyRound } from 'lucide-react';

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
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({ 
        title: 'Erro', 
        description: 'A nova senha e a confirmação não coincidem.', 
        variant: 'destructive' 
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({ 
        title: 'Erro', 
        description: 'A nova senha deve ter pelo menos 6 caracteres.', 
        variant: 'destructive' 
      });
      return;
    }

    setChangingPassword(true);

    try {
      // First, verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error('Senha atual incorreta.');
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      toast({ title: 'Senha alterada com sucesso!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({ 
        title: 'Erro', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setChangingPassword(false);
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
    spouse_birth_date: (profile as any).spouse_birth_date || undefined,
    cell_phone: (profile as any).cell_phone || undefined,
    cim_number: profile.cim_number || undefined,
    degree: profile.degree || undefined,
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

        {/* Password Change Section */}
        <Card className="card-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <KeyRound className="h-5 w-5 text-secondary" />
              Alterar Senha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha Atual</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Digite sua senha atual"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite a nova senha"
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme a nova senha"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              >
                {changingPassword ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
