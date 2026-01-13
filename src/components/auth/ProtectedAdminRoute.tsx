import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedAdminRouteProps {
  children: ReactNode;
}

export function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
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

  // Not admin - redirect to member area
  if (!isAdmin) {
    return <Navigate to="/member/inicial" replace />;
  }

  return <>{children}</>;
}
