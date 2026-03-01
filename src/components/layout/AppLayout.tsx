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
  Crown,
  DollarSign,
  Settings,
  Home,
  BookOpen,
  ClipboardList,
  Mail,
  Bell,
  BarChart3
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

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

  // Check if user can access minutes (Venerável Mestre, Orador, Secretário)
  const canAccessMinutes = profile?.lodge_position && 
    ['veneravel_mestre', 'orador', 'secretario'].includes(profile.lodge_position);

  // Check if user can access invites (only Venerável Mestre)
  const canAccessInvites = profile?.lodge_position === 'veneravel_mestre';

  // Check if current route is an admin route
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname === '/dashboard';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const adminLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/proposals', label: 'Propostas', icon: FileText },
    { href: '/admin/members', label: 'Membros', icon: Users },
    { href: '/admin/lodges', label: 'Lojas', icon: Building2 },
    { href: '/admin/attendances', label: 'Presenças', icon: Calendar },
    { href: '/admin/calendar', label: 'Calendário', icon: Calendar },
    { href: '/admin/financeiro', label: 'Financeiro', icon: DollarSign },
    { href: '/admin/library', label: 'Biblioteca', icon: BookOpen },
    { href: '/admin/minutes', label: 'Atas', icon: ClipboardList },
    { href: '/admin/invites', label: 'Convites', icon: Mail },
    { href: '/admin/permissions', label: 'Permissões', icon: Shield },
    { href: '/admin/notifications', label: 'Notificações', icon: Bell },
    { href: '/admin/settings', label: 'Configurações', icon: Settings },
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
    
    // Invites visible only for Venerável Mestre
    if (canAccessInvites) {
      links.push({ href: '/admin/invites', label: 'Convites', icon: Mail });
    }
    
    return links;
  };

  const links = isAdminRoute && isAdmin ? adminLinks : getMemberLinks();

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Admin Button - Top Right */}
      {isAdmin && !isAdminRoute && (
        <Link
          to="/dashboard"
          className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white font-bold shadow-lg transition-colors"
        >
          <Crown size={20} />
          ADMIN
        </Link>
      )}

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-primary text-primary-foreground h-16 flex items-center justify-between px-4 shadow-lg">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-navy-light rounded-lg transition-colors"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="font-display text-lg">Sistema Maçônico</h1>
        {isAdmin && !isAdminRoute ? (
          <Link
            to="/dashboard"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-bold"
          >
            <Crown size={16} />
            ADMIN
          </Link>
        ) : (
          <div className="w-10" />
        )}
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-300 lg:translate-x-0 shadow-xl",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border">
            <h1 className="font-display text-xl text-sidebar-primary text-center">
              Sistema Maçônico
            </h1>
            <p className="text-sm text-sidebar-foreground/70 text-center mt-1 font-body">
              {isAdminRoute && isAdmin ? 'Administração' : 'Área do Membro'}
            </p>
            
            {/* Admin Access Button */}
            {isAdmin && !isAdminRoute && (
              <Link
                to="/dashboard"
                onClick={() => setSidebarOpen(false)}
                className="mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white font-bold shadow-md transition-all hover:shadow-lg"
              >
                <Crown size={18} />
                Acessar Admin
              </Link>
            )}
            
            {/* Back to Member Area */}
            {isAdmin && isAdminRoute && (
              <Link
                to="/member/inicial"
                onClick={() => setSidebarOpen(false)}
                className="mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-foreground font-medium transition-colors"
              >
                <User size={18} />
                Área do Membro
              </Link>
            )}
          </div>



          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {links.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg font-body transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "hover:bg-sidebar-accent text-sidebar-foreground"
                  )}
                >
                  <link.icon size={20} />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* User info & logout */}
          <div className="p-4 border-t border-sidebar-border space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-sidebar-foreground truncate font-body">
                  {user?.email}
                </p>
              </div>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500 text-xs font-semibold shrink-0">
                  <Crown size={12} />
                  Admin
                </span>
              )}
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
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
