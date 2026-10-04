import { Link } from 'react-router-dom';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingFeatures } from '@/components/landing/LandingFeatures';
import { LandingPricing } from '@/components/landing/LandingPricing';
import { LandingCTA } from '@/components/landing/LandingCTA';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { Button } from '@/components/ui/button';

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <span className="font-display text-xl text-secondary">∴</span>
              </div>
              <span className="font-display text-xl text-foreground">MaçonApp</span>
            </div>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Funcionalidades
              </a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Planos
              </a>
              <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Contato
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" asChild>
                <Link to="/login">Entrar</Link>
              </Button>
              <Button asChild className="bg-primary text-primary-foreground font-semibold">
                <Link to="/register">Cadastrar-se / Filiação</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        <LandingHero />
        <LandingFeatures />
        <LandingPricing />
        <LandingCTA />
      </main>

      <LandingFooter />
    </div>
  );
}
