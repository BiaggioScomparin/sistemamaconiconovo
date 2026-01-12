import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus } from 'lucide-react';

export default function Index() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center max-w-xl">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary mb-6">
          <span className="font-display text-5xl text-secondary">∴</span>
        </div>
        
        <h1 className="text-4xl font-display text-foreground mb-4">
          Sistema Maçônico
        </h1>
        
        <p className="text-lg text-muted-foreground font-body mb-8">
          Gestão de membros e carteirinhas para Lojas Maçônicas
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild className="bg-primary hover:bg-navy-light text-primary-foreground font-display">
            <Link to="/login">
              <LogIn className="mr-2 h-4 w-4" />
              Entrar
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground font-display">
            <Link to="/register">
              <UserPlus className="mr-2 h-4 w-4" />
              Pré-Cadastro
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
