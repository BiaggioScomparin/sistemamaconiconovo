import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Link as LinkIcon, ArrowRight } from 'lucide-react';
import { OrganizationData } from '@/pages/onboarding/Onboarding';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingStep1Props {
  data: OrganizationData;
  onChange: (data: OrganizationData) => void;
  onNext: () => void;
}

export function OnboardingStep1({ data, onChange, onNext }: OnboardingStep1Props) {
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (name: string) => {
    const slug = generateSlug(name);
    onChange({ ...data, name, slug });
    setSlugAvailable(null);
  };

  const handleSlugChange = (slug: string) => {
    onChange({ ...data, slug: generateSlug(slug) });
    setSlugAvailable(null);
  };

  // Check slug availability
  useEffect(() => {
    const checkSlug = async () => {
      if (!data.slug || data.slug.length < 3) {
        setSlugAvailable(null);
        return;
      }

      setCheckingSlug(true);
      
      const { data: existing, error } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', data.slug)
        .limit(1);

      if (error) {
        console.error('Error checking slug:', error);
        setSlugAvailable(null);
      } else {
        setSlugAvailable(!existing || existing.length === 0);
      }
      
      setCheckingSlug(false);
    };

    const timeout = setTimeout(checkSlug, 500);
    return () => clearTimeout(timeout);
  }, [data.slug]);

  const isValid = data.name.trim().length >= 3 && data.slug.length >= 3 && slugAvailable === true;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground">Dados da Organização</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Informe o nome da sua organização maçônica
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="orgName" className="text-foreground">Nome da Organização</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="orgName"
              type="text"
              value={data.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Grande Oriente do Brasil"
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug" className="text-foreground">URL Personalizada</Label>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="slug"
              type="text"
              value={data.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="grande-oriente-brasil"
              className="pl-10"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Sua organização será acessível em: app.com/<span className="text-primary">{data.slug || 'sua-organizacao'}</span>
          </p>
          {checkingSlug && (
            <p className="text-xs text-muted-foreground">Verificando disponibilidade...</p>
          )}
          {!checkingSlug && slugAvailable === true && (
            <p className="text-xs text-green-600">✓ URL disponível</p>
          )}
          {!checkingSlug && slugAvailable === false && (
            <p className="text-xs text-destructive">✗ Esta URL já está em uso</p>
          )}
        </div>
      </div>

      <Button onClick={onNext} className="w-full" disabled={!isValid}>
        Próximo
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
