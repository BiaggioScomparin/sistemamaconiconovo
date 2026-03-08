import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles } from 'lucide-react';
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

export function LandingPricing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly');

      if (!error && data) {
        const formattedPlans = data.map(plan => ({
          ...plan,
          features: Array.isArray(plan.features) 
            ? plan.features as string[]
            : JSON.parse(plan.features as string || '[]')
        }));
        setPlans(formattedPlans);
      }
      setLoading(false);
    };

    fetchPlans();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(price);
  };

  if (loading) {
    return (
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="animate-pulse">Carregando planos...</div>
        </div>
      </section>
    );
  }

  return (
    <section id="pricing" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
            Planos para todas as Lojas
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Escolha o plano ideal para sua loja. Teste grátis por 14 dias, sem compromisso.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setIsYearly(false)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                !isYearly ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
              )}
            >
              Mensal
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                isYearly ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
              )}
            >
              Anual
              <Badge variant="secondary" className="ml-2 bg-primary text-primary-foreground">
                -17%
              </Badge>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => {
            const isPopular = index === 1;
            const price = isYearly ? plan.price_yearly / 12 : plan.price_monthly;

            return (
              <Card
                key={plan.id}
                className={cn(
                  'relative p-8 transition-all duration-300',
                  isPopular 
                    ? 'border-2 border-secondary shadow-xl scale-105' 
                    : 'border border-border hover:border-primary/50 hover:shadow-lg'
                )}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-secondary text-secondary-foreground px-4 py-1">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Mais Popular
                    </Badge>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {plan.description}
                  </p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-foreground">
                      {formatPrice(price)}
                    </span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  {isYearly && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Cobrado {formatPrice(plan.price_yearly)} anualmente
                    </p>
                  )}
                </div>

                <div className="space-y-3 mb-8">
                  <div className="text-sm text-muted-foreground text-center pb-3 border-b border-border">
                    Até {plan.max_lodges} {plan.max_lodges === 1 ? 'loja' : 'lojas'} • {plan.max_members_per_lodge} membros/loja
                  </div>
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button 
                  className="w-full" 
                  variant={isPopular ? 'default' : 'outline'}
                  asChild
                >
                  <Link to="/register">
                    Começar Teste Grátis
                  </Link>
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Note */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Todos os planos incluem 14 dias de teste grátis. Cancele quando quiser.
        </p>
      </div>
    </section>
  );
}
