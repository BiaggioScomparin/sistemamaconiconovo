import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle } from 'lucide-react';

export function LandingCTA() {
  return (
    <section className="py-20 bg-primary relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-40 h-40 border border-secondary rounded-full" />
        <div className="absolute bottom-10 right-10 w-60 h-60 border border-secondary rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 border border-secondary rounded-full" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-display font-bold text-primary-foreground mb-6">
          Pronto para modernizar a gestão da sua Loja?
        </h2>
        
        <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
          Junte-se a centenas de lojas que já utilizam nossa plataforma para simplificar 
          a administração e focar no que realmente importa.
        </p>

        <div className="flex flex-wrap justify-center gap-6 mb-10">
          <div className="flex items-center gap-2 text-primary-foreground/90">
            <CheckCircle className="w-5 h-5 text-secondary" />
            <span>14 dias grátis</span>
          </div>
          <div className="flex items-center gap-2 text-primary-foreground/90">
            <CheckCircle className="w-5 h-5 text-secondary" />
            <span>Sem cartão de crédito</span>
          </div>
          <div className="flex items-center gap-2 text-primary-foreground/90">
            <CheckCircle className="w-5 h-5 text-secondary" />
            <span>Suporte dedicado</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            size="lg" 
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base px-8"
            asChild
          >
            <Link to="/register">
              Começar Agora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-base px-8"
            asChild
          >
            <a href="mailto:contato@maconapp.com.br">
              Falar com Vendas
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
