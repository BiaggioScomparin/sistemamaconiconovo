import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  CreditCard, 
  LogOut, 
  Menu,
  X,
  User,
  FileText,
  Calendar,
  Shield,
  ShieldCheck,
  Crown,
  DollarSign,
  Settings,
  Home,
  BookOpen,
  ClipboardList,
  Mail,
  Bell,
  BarChart3,
  Award
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';

import { isVeneravelMestre, isTesoureiro, isChanceler } from '@/lib/roleUtils';
import logoGoib from '@/assets/logo-goib.png';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, isAdmin, signOut } = useAuth();
  const { data: permissions } = useUserPermissions();
  const { data: profile } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close the mobile sidebar when the user presses Escape.
  useEffect(() => {
    if (!sidebarOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  // Close the sidebar automatically when navigating to a new route (mobile).
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Keep the browser tab title in sync with the current route for better
  // tab/history navigation and accessibility.
  useEffect(() => {
    const base = 'Sistema Maçônico';
    const titleMap: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/admin/reports': 'Relatórios',
      '/admin/proposals': 'Propostas',
      '/admin/sindicancia': 'Sindicância',
      '/admin/members': 'Membros',
      '/admin/approvals': 'Aprovações',
      '/admin/lodges': 'Lojas',
      '/admin/attendances': 'Presenças',
      '/admin/minutes': 'Atas',
      '/admin/calendar': 'Calendário',
      '/admin/invites': 'Convites',
      '/admin/certificados': 'Certificados',
      '/admin/financeiro': 'Financeiro',
      '/admin/library': 'Biblioteca',
      '/admin/permissions': 'Permissões',
      '/admin/notifications': 'Notificações',
      '/admin/settings': 'Configurações',
      '/member/inicial': 'Início',
      '/member/profile': 'Meu Perfil',
      '/member/card': 'Carteirinha',
      '/member/attendance': 'Frequência',
      '/member/payments': 'Mensalidades',
      '/member/library': 'Biblioteca',
      '/member/calendar': 'Calendário',
    };
    const page = titleMap[location.pathname];
    document.title = page ? `${page} — ${base}` : base;
  }, [location.pathname]);

  // Check if user can access minutes (Venerável Mestre, Orador, Secretário)
  const canAccessMinutes = profile?.lodge_position && 
    ['veneravel_mestre', 'orador', 'secretario'].includes(profile.lodge_position.toLowerCase());

  // Check role-based permissions
  const isVeneravel = isVeneravelMestre(profile?.lodge_position);
  const isTes = isTesoureiro(profile?.lodge_position);
  const isCha = isChanceler(profile?.lodge_position);

  const canAccessInvites = isVeneravel;
  const canAccessAttendances = isVeneravel || isCha;
  const canAccessFinance = isVeneravel || isTes;
  const canAccessReports = isVeneravel;

  // Check if current route is an admin route
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname === '/dashboard';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const adminCategories = [
    {
      title: "Visão Geral",
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/admin/reports', label: 'Relatórios', icon: BarChart3 },
      ]
    },
    {
      title: "Gestão Humana",
      items: [
        { href: '/admin/proposals', label: 'Propostas', icon: FileText },
        { href: '/admin/sindicancia', label: 'Sindicância & Antecedentes', icon: ShieldCheck },
        { href: '/admin/members', label: 'Membros', icon: Users },
        { href: '/admin/approvals', label: 'Aprovações', icon: Shield },
      ]
    },
    {
      title: "Loja & Sessões",
      items: [
        { href: '/admin/lodges', label: 'Lojas', icon: Building2 },
        { href: '/admin/attendances', label: 'Presenças', icon: Calendar },
        { href: '/admin/minutes', label: 'Atas', icon: ClipboardList },
        { href: '/admin/calendar', label: 'Calendário', icon: Calendar },
        { href: '/admin/invites', label: 'Convites', icon: Mail },
        { href: '/admin/certificados', label: 'Certificados', icon: Award },
      ]
    },
    {
      title: "Tesouraria & Acervo",
      items: [
        { href: '/admin/financeiro', label: 'Financeiro', icon: DollarSign },
        { href: '/admin/library', label: 'Biblioteca', icon: BookOpen },
      ]
    },
    {
      title: "Configurações",
      items: [
        { href: '/admin/permissions', label: 'Permissões', icon: Shield },
        { href: '/admin/notifications', label: 'Notificações', icon: Bell },
        { href: '/admin/settings', label: 'Configurações', icon: Settings },
      ]
    }
  ];

  // Filter member links based on permissions
  const getMemberLinks = () => {
    const links = [];
    
    // Inicial is always visible
    links.push({ href: '/member/inicial', label: 'Inicial', icon: Home });
    
    // Profile is always visible but editing depends on permission
    links.push({ href: '/member/profile', label: 'Meu Perfil', icon: User });
    
    if (permissions?.can_view_card) {
      links.push({ href: '/member/card', label: 'Carteirinha', icon: CreditCard });
    }
    
    if (permissions?.can_view_attendance || permissions?.can_register_attendance) {
      links.push({ href: '/member/attendance', label: 'Frequência', icon: Calendar });
    }
    
    // Payments always visible for members
    links.push({ href: '/member/payments', label: 'Mensalidades', icon: DollarSign });
    
    // Library always visible for members
    links.push({ href: '/member/library', label: 'Biblioteca', icon: BookOpen });
    
    // Calendar always visible for members
    links.push({ href: '/member/calendar', label: 'Calendário', icon: Calendar });
    
    // Minutes visible for members with specific positions (Venerável Mestre, Orador, Secretário)
    if (canAccessMinutes) {
      links.push({ href: '/admin/minutes', label: 'Atas', icon: ClipboardList });
    }
    
    // Invites visible for Venerável Mestre
    if (canAccessInvites) {
      links.push({ href: '/admin/invites', label: 'Convites', icon: Mail });
    }

    // Attendance management visible for Venerável Mestre and Chanceler
    if (canAccessAttendances) {
      links.push({ href: '/admin/attendances', label: 'Gestão de Presenças', icon: ClipboardList });
    }

    // Finance management visible for Venerável Mestre and Tesoureiro
    if (canAccessFinance) {
      links.push({ href: '/admin/financeiro', label: 'Gestão Financeira', icon: DollarSign });
    }

    // Reports visible for Venerável Mestre
    if (canAccessReports) {
      links.push({ href: '/admin/reports', label: 'Relatórios da Loja', icon: BarChart3 });
    }
    
    return links;
  };

  const mobileAdminLinks = [
    { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
    { href: '/admin/members', label: 'Membros', icon: Users },
    { href: '/admin/proposals', label: 'Propostas', icon: FileText },
    { href: '/admin/financeiro', label: 'Financeiro', icon: DollarSign },
  ];

  const mobileMemberLinks = [
    { href: '/member/inicial', label: 'Início', icon: Home },
    { href: '/member/card', label: 'Carteira', icon: CreditCard },
    { href: '/member/attendance', label: 'Presenças', icon: Calendar },
    { href: '/member/profile', label: 'Perfil', icon: User },
  ];

  const currentMobileLinks = isAdminRoute && isAdmin ? mobileAdminLinks : mobileMemberLinks;

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Admin Button - Top Right */}
      {isAdmin && !isAdminRoute && (
        <Link
          to="/dashboard"
          className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold shadow-lg transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Crown size={20} aria-hidden="true" />
          ADMIN
        </Link>
      )}

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-primary text-primary-foreground h-16 flex items-center justify-between px-4 shadow-lg">
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
          aria-expanded={sidebarOpen}
          aria-controls="main-sidebar"
          className="p-2 hover:bg-navy-light rounded-lg transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {sidebarOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
        </button>
        <div className="flex items-center gap-2">
          <img src={logoGoib} alt="G.O.I.B." className="h-8 w-8 object-contain" />
          <h1 className="font-display text-base font-bold">G.O.I.B.</h1>
        </div>
        {isAdmin && !isAdminRoute ? (
          <Link
            to="/dashboard"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/90 text-secondary-foreground text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Crown size={16} aria-hidden="true" />
            ADMIN
          </Link>
        ) : (
          <div className="w-10" />
        )}
      </header>

      {/* Sidebar */}
      <aside
        id="main-sidebar"
        aria-label="Navegação principal"
        className={cn(
          "fixed top-0 left-0 z-40 h-full w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-300 lg:translate-x-0 shadow-xl motion-reduce:transition-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col">
          {/* Logo Header */}
          <div className="p-5 border-b border-sidebar-border text-center">
            <div className="flex items-center justify-center gap-3 mb-1">
              <img src={logoGoib} alt="G.O.I.B." className="h-10 w-10 object-contain drop-shadow-md" />
              <div className="text-left">
                <h1 className="font-display text-lg font-bold text-sidebar-primary leading-none tracking-wide">
                  G.O.I.B.
                </h1>
                <p className="text-[10px] text-amber-500 font-semibold uppercase tracking-wider mt-0.5">
                  Sistema Maçônico
                </p>
              </div>
            </div>
            <p className="text-xs text-sidebar-foreground/70 text-center mt-1 font-body">
              {isAdminRoute && isAdmin ? 'Painel Administrativo' : 'Área do Membro'}
            </p>
            
            {/* Admin Access Button */}
            {isAdmin && !isAdminRoute && (
              <Link
                to="/dashboard"
                onClick={() => setSidebarOpen(false)}
                className="mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold shadow-md transition-all hover:shadow-lg motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Crown size={18} aria-hidden="true" />
                Acessar Admin
              </Link>
            )}
            
            {/* Back to Member Area */}
            {isAdmin && isAdminRoute && (
              <Link
                to="/member/inicial"
                onClick={() => setSidebarOpen(false)}
                className="mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-foreground font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              >
                <User size={18} aria-hidden="true" />
                Área do Membro
              </Link>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
            {isAdminRoute && isAdmin ? (
              adminCategories.map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                    {cat.title}
                  </h3>
                  <div className="space-y-1">
                    {cat.items.map((link) => {
                      const isActive = location.pathname === link.href;
                      return (
                        <Link
                          key={link.href}
                          to={link.href}
                          onClick={() => setSidebarOpen(false)}
                          aria-current={isActive ? 'page' : undefined}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                            isActive
                              ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                              : "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground"
                          )}
                        >
                          <link.icon size={18} aria-hidden="true" />
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              getMemberLinks().map((link) => {
                const isActive = location.pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setSidebarOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg font-body transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                        : "hover:bg-sidebar-accent text-sidebar-foreground"
                    )}
                  >
                    <link.icon size={20} aria-hidden="true" />
                    {link.label}
                  </Link>
                );
              })
            )}
          </nav>

          {/* User info & logout */}
          <div className="p-4 border-t border-sidebar-border space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate font-body">
                  {user?.email}
                </p>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500 text-xs font-semibold">
                    <Crown size={12} />
                    Admin
                  </span>
                )}
              </div>
              <ThemeToggle />
            </div>
            <Button
              variant="destructive"
              onClick={handleSignOut}
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen pt-16 pb-20 lg:pt-0 lg:pb-0">
        <div className="p-3.5 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Navegação rápida"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar/95 backdrop-blur-md border-t border-sidebar-border h-16 flex items-center justify-around px-2 shadow-2xl"
      >
        {currentMobileLinks.map((link) => {
          const isActive = location.pathname === link.href;
          return (
            <Link
              key={link.href}
              to={link.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full py-1 text-xs font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring",
                isActive
                  ? "text-sidebar-primary font-bold"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
              )}
            >
              <link.icon
                aria-hidden="true"
                className={cn("h-5 w-5 mb-0.5", isActive && "scale-110 transition-transform motion-reduce:transition-none")}
              />
              <span>{link.label}</span>
            </Link>
          );
        })}
        {/* "Mais" opens the full sidebar so every destination stays reachable on mobile */}
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir menu completo"
          aria-controls="main-sidebar"
          aria-expanded={sidebarOpen}
          className="flex flex-col items-center justify-center w-full h-full py-1 text-xs font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring"
        >
          <Menu aria-hidden="true" className="h-5 w-5 mb-0.5" />
          <span>Mais</span>
        </button>
      </nav>
    </div>
  );
}
