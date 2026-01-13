import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, Sparkles } from 'lucide-react';
import { PlanData } from '@/pages/onboarding/Onboarding';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  max_lodges: number;
  max_members_per_lodge: number;
  features: string[];
}

interface OnboardingStep3Props {
  data: PlanData;
  onChange: (data: PlanData) => void;
  onComplete: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export function OnboardingStep3({ data, onChange, onComplete, onBack, isSubmitting }: OnboardingStep3Props) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data: plansData, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly');

      if (error) {
        console.error('Error fetching plans:', error);
      } else {
        const formattedPlans = plansData?.map(plan => ({
          ...plan,
          features: Array.isArray(plan.features) 
            ? plan.features as string[]
            : JSON.parse(plan.features as string || '[]')
        })) || [];
        setPlans(formattedPlans);
        
        // Auto-select first plan
        if (formattedPlans.length > 0 && !data.planId) {
          onChange({ planId: formattedPlans[0].id });
        }
      }
      setLoading(false);
    };

    fetchPlans();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const isValid = data.planId.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Carregando planos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground">Escolha seu Plano</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Teste grátis por 14 dias, cancele quando quiser
        </p>
      </div>

      <div className="space-y-4">
        {plans.map((plan, index) => (
          <Card
            key={plan.id}
            className={cn(
              'p-4 cursor-pointer transition-all border-2',
              data.planId === plan.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
            onClick={() => onChange({ planId: plan.id })}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{plan.name}</h3>
                  {index === 1 && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Popular
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-foreground">
                    {formatPrice(plan.price_monthly)}
                  </span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>

                <div className="mt-3 space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    Até {plan.max_lodges} {plan.max_lodges === 1 ? 'loja' : 'lojas'} • {plan.max_members_per_lodge} membros por loja
                  </p>
                  {plan.features.slice(0, 3).map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="h-3.5 w-3.5 text-primary" />
                      <span className="text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                data.planId === plan.id
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground'
              )}>
                {data.planId === plan.id && (
                  <Check className="h-3 w-3 text-primary-foreground" />
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1" disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Button onClick={onComplete} className="flex-1" disabled={!isValid || isSubmitting}>
          {isSubmitting ? 'Criando...' : 'Começar Teste Grátis'}
        </Button>
      </div>
    </div>
  );
}
