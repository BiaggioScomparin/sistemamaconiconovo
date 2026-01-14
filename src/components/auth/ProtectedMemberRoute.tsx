import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

interface ProtectedMemberRouteProps {
  children: React.ReactNode;
}

export function ProtectedMemberRoute({ children }: ProtectedMemberRouteProps) {
  const { user, loading, isAdmin } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admins sempre têm acesso
  if (isAdmin) {
    return <>{children}</>;
  }

  // Se não tem perfil ou o status não for 'membro', redireciona para a página de status
  if (!profile || (profile.status as string) !== 'membro') {
    return <Navigate to="/status" replace />;
  }

  return <>{children}</>;
}
