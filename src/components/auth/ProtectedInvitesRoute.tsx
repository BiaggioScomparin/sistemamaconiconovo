import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

interface ProtectedInvitesRouteProps {
  children: ReactNode;
}

export function ProtectedInvitesRoute({ children }: ProtectedInvitesRouteProps) {
  const { user, loading, isAdmin } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-foreground">Carregando...</div>
      </div>
    );
  }

  // Not logged in - redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin can always access
  if (isAdmin) {
    return <>{children}</>;
  }

  // Only Venerável Mestre can access
  const isVeneravel = profile?.lodge_position === 'veneravel_mestre';

  if (!isVeneravel) {
    return <Navigate to="/member/inicial" replace />;
  }

  return <>{children}</>;
}
