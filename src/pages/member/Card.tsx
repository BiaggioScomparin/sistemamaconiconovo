import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProfile } from '@/hooks/useProfile';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { MemberCard } from '@/components/member/MemberCard';
import { SogliaMemberCard } from '@/components/member/SogliaMemberCard';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Lock, Globe, CreditCard } from 'lucide-react';

export default function MemberCardPage() {
  const { user, loading, isAdmin } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const { data: permissions, isLoading: loadingPermissions } = useUserPermissions();

  if (loading || isLoading || loadingPermissions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!permissions?.can_view_card) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-display text-foreground">Carteirinha Digital</h1>
            <p className="text-muted-foreground font-body mt-1">Sua identificação como membro</p>
          </div>
          <Card className="card-elegant">
            <CardContent className="py-12 text-center">
              <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-medium">
                Acesso não liberado
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Entre em contato com a administração para liberar esta funcionalidade.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display text-foreground">Carteirinha Digital</h1>
          <p className="text-muted-foreground font-body mt-1">Identificação oficial nacional e internacional</p>
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
          <Tabs defaultValue="soglia" className="w-full space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="soglia" className="gap-2">
                <Globe className="h-4 w-4 text-amber-500" />
                Internacional (SOGLIA)
              </TabsTrigger>
              <TabsTrigger value="goib" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Nacional (GOIB)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="soglia" className="space-y-4">
              <SogliaMemberCard profile={profile} />
            </TabsContent>

            <TabsContent value="goib" className="space-y-4">
              <MemberCard profile={profile} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
