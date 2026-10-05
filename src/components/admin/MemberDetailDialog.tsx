import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, CalendarCheck, DollarSign, FileText, UserCheck, UserX } from 'lucide-react';
import { Profile } from '@/lib/supabase-types';

interface MemberDetailDialogProps {
  profile: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberDetailDialog({ profile, open, onOpenChange }: MemberDetailDialogProps) {
  // Fetch attendance history
  const { data: attendances } = useQuery({
    queryKey: ['member-attendances', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendances')
        .select('id, session_date, session_type, confirmed')
        .eq('profile_id', profile!.id)
        .eq('confirmed', true)
        .order('session_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id && open,
  });

  // Fetch payment history
  const { data: payments } = useQuery({
    queryKey: ['member-payments', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_payments')
        .select('*')
        .eq('profile_id', profile!.id)
        .order('reference_year', { ascending: false })
        .order('reference_month', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id && open,
  });

  // Fetch children
  const { data: children } = useQuery({
    queryKey: ['member-children', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('profile_id', profile!.id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id && open,
  });

  if (!profile) return null;

  const p = profile as any;
  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return format(new Date(d + 'T12:00:00'), 'dd/MM/yyyy');
  };

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const totalPaid = payments?.filter(p => p.status === 'paid').length || 0;
  const totalPending = payments?.filter(p => p.status === 'pending').length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile.photo_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {profile.full_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <span className="text-lg">{profile.full_name}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={p.member_status === 'active' ? 'default' : 'destructive'} className="text-xs">
                  {p.member_status === 'active' ? 'Ativo' : 'Inativo'}
                </Badge>
                {p.degree && <Badge variant="secondary" className="text-xs">{p.degree}</Badge>}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="personal" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <User className="h-3.5 w-3.5" />
              Dados Pessoais
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <CalendarCheck className="h-3.5 w-3.5" />
              Presenças
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <DollarSign className="h-3.5 w-3.5" />
              Financeiro
            </TabsTrigger>
          </TabsList>

          {/* Personal Data */}
          <TabsContent value="personal" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">Informações Maçônicas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoRow label="CIM" value={profile.cim_number} />
                  <InfoRow label="Grau" value={p.degree || 'Aprendiz'} />
                  <InfoRow label="Cargo" value={p.lodge_position} />
                  <InfoRow label="Loja" value={p.lodges?.name} />
                  <InfoRow label="Iniciação (1º Grau)" value={formatDate(profile.initiation_date)} />
                  <InfoRow label="Elevação (2º Grau)" value={formatDate((profile as any).elevation_date)} />
                  <InfoRow label="Exaltação (3º Grau)" value={formatDate((profile as any).exaltation_date)} />
                  <InfoRow label="Padrinho" value={p.sponsor_name} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">Dados Pessoais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoRow label="CPF" value={p.cpf} />
                  <InfoRow label="Nascimento" value={formatDate(profile.birth_date)} />
                  <InfoRow label="Email" value={profile.email} />
                  <InfoRow label="Celular" value={p.cell_phone} />
                  <InfoRow label="Telefone" value={p.phone} />
                  <InfoRow label="Estado Civil" value={p.civil_status} />
                  <InfoRow label="Nome da Mãe" value={profile.mother_name} />
                  <InfoRow label="Nome do Pai" value={p.father_name} />
                  <InfoRow label="Cônjuge" value={profile.spouse_name} />
                  <InfoRow label="Nasc. Cônjuge" value={p.spouse_birth_date ? new Date(p.spouse_birth_date + 'T12:00:00').toLocaleDateString('pt-BR') : undefined} />
                  <InfoRow label="Profissão" value={p.profession} />
                  <InfoRow label="Escolaridade" value={p.education_level} />
                  <InfoRow label="Nacionalidade" value={p.nationality} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">Endereço</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoRow label="CEP" value={profile.cep} />
                  <InfoRow label="Rua" value={profile.street} />
                  <InfoRow label="Número" value={profile.number} />
                  <InfoRow label="Complemento" value={profile.complement} />
                  <InfoRow label="Bairro" value={profile.neighborhood} />
                  <InfoRow label="Cidade" value={profile.city} />
                  <InfoRow label="Estado" value={profile.state} />
                </div>
              </CardContent>
            </Card>

            {children && children.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground">Filhos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {children.map(c => (
                      <div key={c.id} className="flex justify-between text-sm border-b pb-2 last:border-0">
                        <span className="font-medium">{c.name}</span>
                        <span className="text-muted-foreground">{formatDate(c.birth_date)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Attendance History */}
          <TabsContent value="attendance" className="space-y-4 mt-4">
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="outline" className="px-3 py-1">
                <UserCheck className="h-3.5 w-3.5 mr-1" />
                {attendances?.length || 0} presença(s) registrada(s)
              </Badge>
            </div>

            {attendances && attendances.length > 0 ? (
              <Card>
                <CardContent className="pt-4">
                  <div className="max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendances.map(a => (
                          <TableRow key={a.id}>
                            <TableCell>
                              {format(new Date(a.session_date + 'T12:00:00'), "dd/MM/yyyy - EEEE", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              <Badge variant={a.session_type === 'magna' ? 'default' : 'secondary'}>
                                {a.session_type === 'magna' ? 'Magna' : 'Ordinária'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-green-600">
                                <UserCheck className="h-4 w-4" />
                                Presente
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma presença registrada.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Financial History */}
          <TabsContent value="financial" className="space-y-4 mt-4">
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="outline" className="px-3 py-1 text-green-600 border-green-300">
                <DollarSign className="h-3.5 w-3.5 mr-1" />
                {totalPaid} pago(s)
              </Badge>
              <Badge variant="outline" className="px-3 py-1 text-yellow-600 border-yellow-300">
                <DollarSign className="h-3.5 w-3.5 mr-1" />
                {totalPending} pendente(s)
              </Badge>
            </div>

            {payments && payments.length > 0 ? (
              <Card>
                <CardContent className="pt-4">
                  <div className="max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Referência</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Pago em</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map(pay => (
                          <TableRow key={pay.id}>
                            <TableCell className="font-medium">
                              {monthNames[pay.reference_month - 1]}/{pay.reference_year}
                            </TableCell>
                            <TableCell>
                              R$ {Number(pay.amount).toFixed(2).replace('.', ',')}
                            </TableCell>
                            <TableCell>
                              {formatDate(pay.due_date)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                pay.status === 'paid' ? 'default' :
                                pay.status === 'overdue' ? 'destructive' : 'secondary'
                              }>
                                {pay.status === 'paid' ? 'Pago' :
                                 pay.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {pay.paid_at ? format(new Date(pay.paid_at), 'dd/MM/yyyy') : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum pagamento registrado.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span>{' '}
      <span className="font-medium">{value || '-'}</span>
    </div>
  );
}
