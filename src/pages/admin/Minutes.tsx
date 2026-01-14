import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  useSessionMinutes, 
  useDeleteSessionMinute, 
  useCompleteSessionMinute,
  useMinuteSignatures,
  SessionMinute 
} from '@/hooks/useSessionMinutes';
import { useLodges } from '@/hooks/useLodges';
import { useProfile } from '@/hooks/useProfile';
import { MinuteFormDialog } from '@/components/admin/MinuteFormDialog';
import { MinuteSignatureDialog } from '@/components/admin/MinuteSignatureDialog';
import { MinutePrintView } from '@/components/admin/MinutePrintView';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  FileText, 
  CheckCircle2, 
  PenLine,
  Clock,
  Shield,
  Calendar,
  Printer,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const statusConfig = {
  draft: { label: 'Rascunho', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', icon: Clock },
  completed: { label: 'Aguardando Assinaturas', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: PenLine },
  signed: { label: 'Concluída', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle2 },
};

type SessionType = 'ordinaria' | 'magna';

// Print button component that fetches signatures
function PrintMinuteButton({ minute, lodgeName }: { minute: SessionMinute; lodgeName: string }) {
  const { data: signatures } = useMinuteSignatures(minute.id);
  return <MinutePrintView minute={minute} signatures={signatures || []} lodgeName={lodgeName} />;
}

export default function AdminMinutes() {
  const [activeTab, setActiveTab] = useState<SessionType>('ordinaria');
  const { data: minutes, isLoading } = useSessionMinutes(activeTab);
  const { data: lodges } = useLodges();
  const { data: profile } = useProfile();
  const deleteMutation = useDeleteSessionMinute();
  const completeMutation = useCompleteSessionMinute();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [editingMinute, setEditingMinute] = useState<SessionMinute | null>(null);
  const [selectedMinute, setSelectedMinute] = useState<SessionMinute | null>(null);
  const [printMinute, setPrintMinute] = useState<SessionMinute | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [completeId, setCompleteId] = useState<string | null>(null);

  const getLodgeName = (lodgeId: string) => {
    return lodges?.find(l => l.id === lodgeId)?.name || '';
  };

  const handleEdit = (minute: SessionMinute) => {
    setEditingMinute(minute);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingMinute(null);
    setDialogOpen(true);
  };

  const handleSign = (minute: SessionMinute) => {
    setSelectedMinute(minute);
    setSignatureDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Ata excluída com sucesso!');
    } catch (error) {
      toast.error('Erro ao excluir ata');
    }
    setDeleteId(null);
  };

  const handleComplete = async () => {
    if (!completeId) return;
    try {
      await completeMutation.mutateAsync(completeId);
      toast.success('Ata concluída! Agora pode ser assinada.');
    } catch (error) {
      toast.error('Erro ao concluir ata');
    }
    setCompleteId(null);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Atas de Sessão</h1>
            <p className="text-muted-foreground">
              Gerencie as atas das sessões maçônicas
            </p>
          </div>
          <Button onClick={handleNew}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Nova Ata</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SessionType)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ordinaria" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Sessão Ordinária
            </TabsTrigger>
            <TabsTrigger value="magna" className="flex items-center gap-2" disabled>
              <Calendar className="h-4 w-4" />
              Sessão Magna
              <Badge variant="outline" className="ml-1 text-xs">Em breve</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ordinaria" className="mt-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-pulse text-muted-foreground">Carregando...</div>
              </div>
            ) : minutes?.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma ata de sessão ordinária</p>
                  <Button onClick={handleNew} className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Criar primeira ata
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {minutes?.map((minute) => {
                  const StatusIcon = statusConfig[minute.status].icon;
                  return (
                    <Card key={minute.id}>
                      <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="space-y-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              Ata de Sessão Ordinária
                              {minute.session_number && (
                                <span className="text-muted-foreground font-normal">
                                  #{minute.session_number}
                                </span>
                              )}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(minute.session_date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className={statusConfig[minute.status].color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[minute.status].label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap items-center gap-2">
                          {minute.status === 'draft' && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleEdit(minute)}>
                                <Pencil className="h-4 w-4 mr-1" />
                                Editar
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setCompleteId(minute.id)}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Concluir
                              </Button>
                            </>
                          )}
                          
                          {(minute.status === 'completed' || minute.status === 'signed') && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleSign(minute)}>
                                <PenLine className="h-4 w-4 mr-1" />
                                {minute.status === 'signed' ? 'Ver Assinaturas' : 'Assinar'}
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleEdit(minute)}>
                                <Eye className="h-4 w-4 mr-1" />
                                Visualizar
                              </Button>
                              <PrintMinuteButton minute={minute} lodgeName={getLodgeName(minute.lodge_id)} />
                            </>
                          )}

                          {minute.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setDeleteId(minute.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Excluir
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="magna" className="mt-6">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Atas de Sessão Magna em desenvolvimento</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <MinuteFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        minute={editingMinute}
        sessionType={activeTab}
      />

      {selectedMinute && (
        <MinuteSignatureDialog
          open={signatureDialogOpen}
          onOpenChange={setSignatureDialogOpen}
          minute={selectedMinute}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta ata? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Confirmation */}
      <AlertDialog open={!!completeId} onOpenChange={() => setCompleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir Ata</AlertDialogTitle>
            <AlertDialogDescription>
              Após concluir, a ata não poderá mais ser editada e ficará disponível para assinatura 
              pelo Venerável Mestre, Orador e Secretário. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete}>
              Concluir Ata
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
