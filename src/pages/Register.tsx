import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ProfileForm } from '@/components/forms/ProfileForm';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle } from 'lucide-react';
import { validateImageFile, getValidatedFileName } from '@/lib/fileValidation';

export default function Register() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (data: any, children: any[], photoFile: File | null) => {
    setLoading(true);

    try {
      let photoUrl = null;

      // Upload photo if provided (with validation)
      if (photoFile) {
        // Validate the file before upload
        const validation = validateImageFile(photoFile);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        const fileName = getValidatedFileName(photoFile, 'registrations');

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, photoFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('photos')
          .getPublicUrl(fileName);

        photoUrl = urlData.publicUrl;
      }

      // Create profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          ...data,
          photo_url: photoUrl,
          status: 'pending',
        })
        .select()
        .single();

      if (profileError) throw profileError;

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

          if (childrenError) throw childrenError;
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
        description: error.message,
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
          <ProfileForm onSubmit={handleSubmit} loading={loading} />
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
