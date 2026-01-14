import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

interface ProtectedMinutesRouteProps {
  children: ReactNode;
}

const ALLOWED_POSITIONS = ['veneravel_mestre', 'orador', 'secretario'];

export function ProtectedMinutesRoute({ children }: ProtectedMinutesRouteProps) {
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

  // Check if member has required position
  const hasAllowedPosition = profile?.lodge_position && 
    ALLOWED_POSITIONS.includes(profile.lodge_position);

  if (!hasAllowedPosition) {
    return <Navigate to="/member/inicial" replace />;
  }

  return <>{children}</>;
}