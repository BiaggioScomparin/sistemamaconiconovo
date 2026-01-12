import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { useApprovedProfiles } from '@/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users } from 'lucide-react';

export default function AdminMembers() {
  const { user, loading, isAdmin } = useAuth();
  const { data: profiles, isLoading } = useApprovedProfiles();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display text-foreground">Membros</h1>
          <p className="text-muted-foreground font-body mt-1">Lista de membros aprovados</p>
        </div>

        <Card className="card-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Users className="h-5 w-5 text-secondary" />
              Membros Ativos ({profiles?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : profiles?.length === 0 ? (
              <p className="text-muted-foreground">Nenhum membro aprovado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membro</TableHead>
                      <TableHead>CIM</TableHead>
                      <TableHead>Loja</TableHead>
                      <TableHead>Iniciação</TableHead>
                      <TableHead>Nascimento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles?.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={profile.photo_url || undefined} />
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {profile.full_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{profile.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{profile.cim_number || '-'}</TableCell>
                        <TableCell>{profile.lodge?.name || '-'}</TableCell>
                        <TableCell>{formatDate(profile.initiation_date)}</TableCell>
                        <TableCell>{formatDate(profile.birth_date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
