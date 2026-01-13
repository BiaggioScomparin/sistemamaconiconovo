import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OnboardingStep1 } from '@/components/onboarding/OnboardingStep1';
import { OnboardingStep2 } from '@/components/onboarding/OnboardingStep2';
import { OnboardingStep3 } from '@/components/onboarding/OnboardingStep3';
import { Progress } from '@/components/ui/progress';

export interface OrganizationData {
  name: string;
  slug: string;
}

export interface LodgeData {
  name: string;
  city: string;
  state: string;
}

export interface PlanData {
  planId: string;
}

export default function Onboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasOrganization, setHasOrganization] = useState<boolean | null>(null);

  const [organizationData, setOrganizationData] = useState<OrganizationData>({
    name: '',
    slug: '',
  });

  const [lodgeData, setLodgeData] = useState<LodgeData>({
    name: '',
    city: '',
    state: '',
  });

  const [planData, setPlanData] = useState<PlanData>({
    planId: '',
  });

  // Check if user already has an organization
  useEffect(() => {
    const checkOrganization = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1);

      if (error) {
        console.error('Error checking organization:', error);
        setHasOrganization(false);
        return;
      }

      if (data && data.length > 0) {
        setHasOrganization(true);
      } else {
        setHasOrganization(false);
      }
    };

    checkOrganization();
  }, [user]);

  if (loading || hasOrganization === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/register" replace />;
  }

  if (hasOrganization) {
    return <Navigate to="/dashboard" replace />;
  }

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    setStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleComplete = async () => {
    if (!user) return;

    setIsSubmitting(true);

    try {
      // 1. Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: organizationData.name,
          slug: organizationData.slug,
          owner_id: user.id,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // 2. Add user as owner member
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberError) throw memberError;

      // 3. Create the first lodge
      const { error: lodgeError } = await supabase
        .from('lodges')
        .insert({
          name: lodgeData.name,
          city: lodgeData.city,
          state: lodgeData.state,
          organization_id: org.id,
        });

      if (lodgeError) throw lodgeError;

      // 4. Create subscription (trial period of 14 days)
      if (planData.planId) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 14);

        const { error: subError } = await supabase
          .from('organization_subscriptions')
          .insert({
            organization_id: org.id,
            plan_id: planData.planId,
            status: 'trialing',
            current_period_end: trialEnd.toISOString(),
          });

        if (subError) throw subError;
      }

      // 5. Add admin role to user
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'admin',
        });

      if (roleError && !roleError.message.includes('duplicate')) {
        console.error('Error adding admin role:', roleError);
      }

      toast.success('Organização criada com sucesso!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error in onboarding:', error);
      toast.error(error.message || 'Erro ao criar organização');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-4">
            <span className="font-display text-3xl text-secondary">∴</span>
          </div>
          <h1 className="text-2xl font-display text-foreground">Configure sua Organização</h1>
          <p className="text-muted-foreground font-body mt-2">
            Passo {step} de {totalSteps}
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps */}
        <div className="card-elegant p-8">
          {step === 1 && (
            <OnboardingStep1
              data={organizationData}
              onChange={setOrganizationData}
              onNext={handleNext}
            />
          )}

          {step === 2 && (
            <OnboardingStep2
              data={lodgeData}
              onChange={setLodgeData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {step === 3 && (
            <OnboardingStep3
              data={planData}
              onChange={setPlanData}
              onComplete={handleComplete}
              onBack={handleBack}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </div>
    </div>
  );
}
