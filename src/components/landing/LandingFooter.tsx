import { Link } from 'react-router-dom';

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="contact" className="bg-muted/50 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <span className="font-display text-xl text-secondary">∴</span>
              </div>
              <span className="font-display text-xl text-foreground">MaçonApp</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              Sistema completo para gestão de lojas maçônicas. Simples, seguro e 
              desenvolvido com o respeito que a tradição merece.
            </p>
            <p className="text-sm text-muted-foreground">
              contato@maconapp.com.br
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="font-display font-semibold text-foreground mb-4">Produto</p>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Funcionalidades
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Planos e Preços
                </a>
              </li>
              <li>
                <Link to="/register" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Criar Conta
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Entrar
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="font-display font-semibold text-foreground mb-4">Legal</p>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Termos de Uso
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Política de Privacidade
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  LGPD
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} MaçonApp. Todos os direitos reservados.
          </p>
          <p className="text-sm text-muted-foreground">
            Feito com ♥ para a comunidade maçônica
          </p>
        </div>
      </div>
    </footer>
  );
}
