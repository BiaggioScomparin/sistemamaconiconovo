import { 
  Users, 
  Calendar, 
  CreditCard, 
  FileText, 
  Shield, 
  BarChart3,
  Bell,
  Building2
} from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Gestão de Membros',
    description: 'Cadastro completo com dados pessoais, graus, cargos e histórico maçônico. Acompanhe a evolução de cada irmão.',
  },
  {
    icon: Calendar,
    title: 'Controle de Presenças',
    description: 'Registre presenças em sessões ordinárias, extraordinárias e eventos. Relatórios automáticos de frequência.',
  },
  {
    icon: CreditCard,
    title: 'Gestão Financeira',
    description: 'Controle de mensalidades, emissão de boletos e PIX. Acompanhe inadimplências e gere relatórios.',
  },
  {
    icon: FileText,
    title: 'Documentos Digitais',
    description: 'Gere editais, atas e documentos oficiais automaticamente. Templates personalizáveis para sua loja.',
  },
  {
    icon: Shield,
    title: 'Carteira Digital',
    description: 'Identificação digital com QR Code único para cada membro. Validação instantânea em qualquer dispositivo.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios e Métricas',
    description: 'Dashboard completo com estatísticas, gráficos e indicadores importantes para sua gestão.',
  },
  {
    icon: Bell,
    title: 'Notificações',
    description: 'Lembretes automáticos de sessões, aniversários e vencimentos. Mantenha todos informados.',
  },
  {
    icon: Building2,
    title: 'Multi-Lojas',
    description: 'Gerencie múltiplas lojas em uma única conta. Ideal para Grandes Orientes e administrações regionais.',
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
            Tudo que sua Loja precisa em um só lugar
          </h2>
          <p className="text-lg text-muted-foreground">
            Ferramentas completas desenvolvidas especificamente para a gestão maçônica moderna
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              className="card-elegant p-6 hover:shadow-xl transition-shadow duration-300"
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                index % 2 === 0 ? 'bg-primary/10' : 'bg-secondary/20'
              }`}>
                <feature.icon className={`w-6 h-6 ${
                  index % 2 === 0 ? 'text-primary' : 'text-secondary'
                }`} />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
