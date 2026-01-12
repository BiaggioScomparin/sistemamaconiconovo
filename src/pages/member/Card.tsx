import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProfile } from '@/hooks/useProfile';
import { MemberCard } from '@/components/member/MemberCard';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function MemberCardPage() {
  const { user, loading, isAdmin } = useAuth();
  const { data: profile, isLoading } = useProfile();

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display text-foreground">Carteirinha Digital</h1>
          <p className="text-muted-foreground font-body mt-1">Sua identificação como membro</p>
        </div>

        {!profile ? (
          <Card className="card-elegant">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
              <p className="text-muted-foreground">
                Você ainda não possui um perfil cadastrado.
              </p>
            </CardContent>
          </Card>
        ) : (
          <MemberCard profile={profile} />
        )}
      </div>
    </AppLayout>
  );
}
