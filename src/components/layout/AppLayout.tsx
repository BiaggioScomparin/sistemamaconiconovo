import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  UserCheck, 
  CreditCard, 
  LogOut, 
  Menu,
  X,
  User,
  FileText,
  Calendar,
  Shield
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, isAdmin, signOut } = useAuth();
  const { data: permissions } = useUserPermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const adminLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/proposals', label: 'Propostas', icon: FileText },
    { href: '/admin/members', label: 'Membros', icon: Users },
    { href: '/admin/lodges', label: 'Lojas', icon: Building2 },
    { href: '/admin/approvals', label: 'Aprovações', icon: UserCheck },
    { href: '/admin/attendances', label: 'Presenças', icon: Calendar },
    { href: '/admin/permissions', label: 'Permissões', icon: Shield },
  ];

  // Filter member links based on permissions
  const getMemberLinks = () => {
    const links = [];
    
    // Profile is always visible but editing depends on permission
    links.push({ href: '/member/profile', label: 'Meu Perfil', icon: User });
    
    if (permissions?.can_view_card) {
      links.push({ href: '/member/card', label: 'Carteirinha', icon: CreditCard });
    }
    
    if (permissions?.can_view_attendance || permissions?.can_register_attendance) {
      links.push({ href: '/member/attendance', label: 'Frequência', icon: Calendar });
    }
    
    return links;
  };

  const links = isAdmin ? adminLinks : getMemberLinks();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground h-16 flex items-center justify-between px-4 shadow-lg">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-navy-light rounded-lg transition-colors"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="font-display text-lg">Sistema Maçônico</h1>
        <div className="w-10" />
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
              {isAdmin ? 'Administração' : 'Área do Membro'}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
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
          <div className="p-4 border-t border-sidebar-border">
            <p className="text-sm text-sidebar-foreground/70 mb-3 truncate font-body">
              {user?.email}
            </p>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
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
