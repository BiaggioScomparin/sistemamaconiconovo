import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { isVeneravelMestre, isTesoureiro } from '@/lib/roleUtils';

interface ProtectedFinanceRouteProps {
  children: ReactNode;
}

export function ProtectedFinanceRoute({ children }: ProtectedFinanceRouteProps) {
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

  // Venerável Mestre or Tesoureiro can access
  const canAccess = isVeneravelMestre(profile?.lodge_position) || isTesoureiro(profile?.lodge_position);

  if (!canAccess) {
    return <Navigate to="/member/inicial" replace />;
  }

  return <>{children}</>;
}
