import { Link } from 'react-router-dom';
import logoGoib from '@/assets/logo-goib.png';

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="contact" className="bg-muted/50 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img src={logoGoib} alt="G.O.I.B." className="h-10 w-10 object-contain" />
              <div>
                <span className="font-display text-lg font-bold text-foreground block leading-none">G.O.I.B.</span>
                <span className="text-[10px] text-amber-500 font-semibold uppercase tracking-wider">Grande Oriente Independente do Brasil</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              Sistema oficial para gestão de Lojas Maçônicas sob a jurisdição do Grande Oriente Independente do Brasil (G.O.I.B.).
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
            © {currentYear} G.O.I.B. - Grande Oriente Independente do Brasil. Todos os direitos reservados.
          </p>
          <p className="text-sm text-muted-foreground">
            T.T.G.O.T.U. ∴
          </p>
        </div>
      </div>
    </footer>
  );
}
