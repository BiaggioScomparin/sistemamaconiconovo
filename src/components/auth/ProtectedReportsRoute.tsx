import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { isVeneravelMestre } from '@/lib/roleUtils';

interface ProtectedReportsRouteProps {
  children: ReactNode;
}

export function ProtectedReportsRoute({ children }: ProtectedReportsRouteProps) {
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

  // Venerável Mestre can access
  const canAccess = isVeneravelMestre(profile?.lodge_position);

  if (!canAccess) {
    return <Navigate to="/member/inicial" replace />;
  }

  return <>{children}</>;
}
