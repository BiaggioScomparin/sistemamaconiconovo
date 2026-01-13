import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, Users, Calendar } from 'lucide-react';

export function LandingHero() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-secondary/5 rounded-full blur-3xl" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <Shield className="w-4 h-4" />
            Sistema completo para gestão maçônica
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-foreground leading-tight mb-6">
            Gerencie sua Loja Maçônica com{' '}
            <span className="text-secondary">Excelência</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Controle de membros, presenças, eventos e finanças em uma única plataforma. 
            Simples, seguro e desenvolvido especialmente para sua loja.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button size="lg" className="text-base px-8" asChild>
              <Link to="/register">
                Começar Teste Grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8" asChild>
              <a href="#features">Ver Funcionalidades</a>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-display font-bold text-foreground">14</div>
              <div className="text-sm text-muted-foreground">Dias grátis</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-display font-bold text-foreground">100%</div>
              <div className="text-sm text-muted-foreground">Seguro</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-display font-bold text-foreground">24/7</div>
              <div className="text-sm text-muted-foreground">Disponível</div>
            </div>
          </div>
        </div>

        {/* Feature Cards Preview */}
        <div className="mt-20 grid md:grid-cols-3 gap-6">
          <div className="card-elegant p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-foreground mb-2">Gestão de Membros</h3>
            <p className="text-sm text-muted-foreground">
              Cadastro completo, graus, cargos e histórico de cada irmão
            </p>
          </div>

          <div className="card-elegant p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="font-display font-semibold text-foreground mb-2">Controle de Presenças</h3>
            <p className="text-sm text-muted-foreground">
              Registro de sessões, eventos e frequência dos membros
            </p>
          </div>

          <div className="card-elegant p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-foreground mb-2">Carteira Digital</h3>
            <p className="text-sm text-muted-foreground">
              Identificação digital com QR Code para validação
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
