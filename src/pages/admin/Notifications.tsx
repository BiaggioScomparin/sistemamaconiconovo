import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLodges } from '@/hooks/useLodges';
import {
  useNotificationRules,
  useCreateNotificationRule,
  useUpdateNotificationRule,
  useDeleteNotificationRule,
  useWhatsAppInstance,
  useUpsertWhatsAppInstance,
  useNotificationLogs,
  NotificationRule,
} from '@/hooks/useNotifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Bell, MessageSquare, Plus, Trash2, Save, Eye, EyeOff, Wifi, WifiOff, Clock, CalendarDays, CreditCard, CheckCircle, AlertTriangle, Pencil, Cake, Award, Copy, Baby, Heart, Send } from 'lucide-react';
import { GroupMessagePanel } from '@/components/admin/GroupMessagePanel';
import { format, parseISO } from 'date-fns';

const CATEGORY_LABELS: Record<string, { label: string; description: string; icon: any }> = {
  payment_created: { label: 'Mensalidade Criada', description: 'Quando uma nova mensalidade for gerada', icon: CreditCard },
  payment_before_due: { label: 'Antes do Vencimento', description: 'X dias antes do vencimento', icon: Clock },
  payment_due_day: { label: 'Dia do Vencimento', description: 'No dia do vencimento da mensalidade', icon: AlertTriangle },
  payment_overdue: { label: 'Mensalidade Vencida', description: 'Quando estiver vencida, com repetição', icon: AlertTriangle },
  payment_paid: { label: 'Pagamento Confirmado', description: 'Quando o pagamento for confirmado', icon: CheckCircle },
  event_created: { label: 'Evento Criado', description: 'Quando um novo evento for criado para a loja', icon: CalendarDays },
  event_before_day: { label: 'Véspera do Evento', description: 'Um dia antes do evento', icon: CalendarDays },
  event_same_day: { label: 'Dia do Evento', description: 'No dia do evento (configurar horário)', icon: Bell },
  birthday: { label: 'Aniversário Natalício', description: 'Notifica todos os membros no dia do aniversário de um irmão', icon: Cake },
  initiation_anniversary: { label: 'Aniversário de Ordem', description: 'Notifica todos os membros no dia do aniversário de iniciação de um irmão', icon: Award },
  children_birthday: { label: 'Aniversário de Filho(a)', description: 'Notifica o membro no aniversário de seu filho(a)', icon: Baby },
  spouse_birthday: { label: 'Aniversário de Esposa', description: 'Notifica o membro no aniversário de sua esposa', icon: Heart },
};

export default function AdminNotifications() {
  const { data: lodges } = useLodges();
  const [selectedLodgeId, setSelectedLodgeId] = useState<string>('');
  const { data: rules, isLoading: rulesLoading } = useNotificationRules(selectedLodgeId || undefined);
  const { data: whatsappInstance } = useWhatsAppInstance(selectedLodgeId || undefined);
  const { data: logs } = useNotificationLogs(selectedLodgeId || undefined, 100);
  const createRule = useCreateNotificationRule();
  const updateRule = useUpdateNotificationRule();
  const deleteRule = useDeleteNotificationRule();
  const upsertInstance = useUpsertWhatsAppInstance();

  // WhatsApp config state
  const [wpInstanceId, setWpInstanceId] = useState('');
  const [wpToken, setWpToken] = useState('');
  const [wpBaseUrl, setWpBaseUrl] = useState('https://api.z-api.io');
  const [wpActive, setWpActive] = useState(true);
  const [wpApiFormat, setWpApiFormat] = useState('wattend');
  const [showToken, setShowToken] = useState(false);

  // Dialog state for adding rule
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newDaysOffset, setNewDaysOffset] = useState('2');
  const [newHoursBefore, setNewHoursBefore] = useState('');
  const [newRepeatDays, setNewRepeatDays] = useState('7');
  const [newTemplate, setNewTemplate] = useState('');
  const [newGroupId, setNewGroupId] = useState('');

  // Dialog state for cloning rules
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [cloneSourceLodgeId, setCloneSourceLodgeId] = useState('');
  const [cloneLoading, setCloneLoading] = useState(false);
  const { data: sourceRulesForClone } = useNotificationRules(cloneSourceLodgeId || undefined);

  // Dialog state for editing rule
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  const [editDaysOffset, setEditDaysOffset] = useState('');
  const [editHoursBefore, setEditHoursBefore] = useState('');
  const [editRepeatDays, setEditRepeatDays] = useState('');
  const [editTemplate, setEditTemplate] = useState('');
  const [editGroupId, setEditGroupId] = useState('');

  // Auto-select first lodge
  useEffect(() => {
    if (lodges && lodges.length > 0 && !selectedLodgeId) {
      setSelectedLodgeId(lodges[0].id);
    }
  }, [lodges, selectedLodgeId]);

  // Sync WhatsApp instance data
  useEffect(() => {
    if (whatsappInstance) {
      setWpInstanceId(whatsappInstance.instance_id);
      setWpToken(whatsappInstance.token);
      setWpBaseUrl(whatsappInstance.base_url);
      setWpActive(whatsappInstance.is_active);
      setWpApiFormat((whatsappInstance as any).api_format || 'wattend');
    } else {
      setWpInstanceId('');
      setWpToken('');
      setWpBaseUrl('https://api.wattend.io');
      setWpActive(true);
      setWpApiFormat('wattend');
    }
  }, [whatsappInstance]);

  const handleSaveWhatsApp = async () => {
    if (!selectedLodgeId || !wpInstanceId || !wpToken) {
      toast.error('Preencha Instance ID e Token');
      return;
    }
    try {
      await upsertInstance.mutateAsync({
        lodge_id: selectedLodgeId,
        instance_id: wpInstanceId,
        token: wpToken,
        base_url: wpBaseUrl,
        is_active: wpActive,
        api_format: wpApiFormat,
      });
      toast.success('Configuração WhatsApp salva!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    }
  };

  const handleAddRule = async () => {
    if (!selectedLodgeId || !newCategory) {
      toast.error('Selecione uma loja e categoria');
      return;
    }
    try {
      await createRule.mutateAsync({
        lodge_id: selectedLodgeId,
        category: newCategory,
        is_enabled: true,
        days_offset: newCategory === 'payment_before_due' ? parseInt(newDaysOffset) || 2 : 0,
        hours_before: newCategory === 'event_same_day' ? parseInt(newHoursBefore) || null : null,
        repeat_interval_days: newCategory === 'payment_overdue' ? parseInt(newRepeatDays) || 7 : null,
        message_template: newTemplate || null,
        whatsapp_group_id: newGroupId || null,
      });
      toast.success('Regra de notificação criada!');
      setAddDialogOpen(false);
      setNewCategory('');
      setNewTemplate('');
      setNewGroupId('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar regra');
    }
  };

  const handleToggleRule = async (rule: NotificationRule) => {
    try {
      await updateRule.mutateAsync({ id: rule.id, is_enabled: !rule.is_enabled });
      toast.success(rule.is_enabled ? 'Regra desativada' : 'Regra ativada');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar');
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta regra?')) return;
    try {
      await deleteRule.mutateAsync(id);
      toast.success('Regra excluída');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir');
    }
  };

  const handleOpenEdit = (rule: NotificationRule) => {
    setEditingRule(rule);
    setEditDaysOffset(String(rule.days_offset ?? ''));
    setEditHoursBefore(String(rule.hours_before ?? ''));
    setEditRepeatDays(String(rule.repeat_interval_days ?? ''));
    setEditTemplate(rule.message_template || '');
    setEditGroupId(rule.whatsapp_group_id || '');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRule) return;
    try {
      await updateRule.mutateAsync({
        id: editingRule.id,
        days_offset: editingRule.category === 'payment_before_due' ? parseInt(editDaysOffset) || 0 : editingRule.days_offset,
        hours_before: editingRule.category === 'event_same_day' ? (parseInt(editHoursBefore) || null) : editingRule.hours_before,
        repeat_interval_days: editingRule.category === 'payment_overdue' ? (parseInt(editRepeatDays) || null) : editingRule.repeat_interval_days,
        message_template: editTemplate || null,
        whatsapp_group_id: editGroupId || null,
      });
      toast.success('Regra atualizada!');
      setEditDialogOpen(false);
      setEditingRule(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar');
    }
  };

  const handleCloneRules = async () => {
    if (!selectedLodgeId || !cloneSourceLodgeId || !sourceRulesForClone?.length) {
      toast.error('Selecione uma loja de origem com regras');
      return;
    }
    if (selectedLodgeId === cloneSourceLodgeId) {
      toast.error('A loja de origem deve ser diferente da loja de destino');
      return;
    }
    setCloneLoading(true);
    try {
      let created = 0;
      for (const rule of sourceRulesForClone) {
        await createRule.mutateAsync({
          lodge_id: selectedLodgeId,
          category: rule.category,
          is_enabled: rule.is_enabled,
          days_offset: rule.days_offset,
          hours_before: rule.hours_before,
          repeat_interval_days: rule.repeat_interval_days,
          message_template: rule.message_template,
          whatsapp_group_id: rule.whatsapp_group_id || null,
        });
        created++;
      }
      toast.success(`${created} regra(s) clonada(s) com sucesso!`);
      setCloneDialogOpen(false);
      setCloneSourceLodgeId('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao clonar regras');
    } finally {
      setCloneLoading(false);
    }
  };

  const getCategoryInfo = (cat: string) => CATEGORY_LABELS[cat] || { label: cat, description: '', icon: Bell };

  const getStatusBadge = (status: string) => {
    if (status === 'sent') return <Badge className="bg-green-600 text-white">Enviado</Badge>;
    if (status === 'failed') return <Badge variant="destructive">Falhou</Badge>;
    return <Badge variant="secondary">Pendente</Badge>;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold font-display">Central de Notificações</h1>
            <p className="text-muted-foreground">Configure notificações via WhatsApp por loja</p>
          </div>
        </div>

        {/* Lodge Selector */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label className="shrink-0">Selecione a Loja:</Label>
              <Select value={selectedLodgeId} onValueChange={setSelectedLodgeId}>
                <SelectTrigger className="max-w-sm">
                  <SelectValue placeholder="Selecione uma loja" />
                </SelectTrigger>
                <SelectContent>
                  {lodges?.map((lodge) => (
                    <SelectItem key={lodge.id} value={lodge.id}>{lodge.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {selectedLodgeId && (
          <Tabs defaultValue="whatsapp" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="whatsapp">
                <MessageSquare className="h-4 w-4 mr-2" />
                WhatsApp
              </TabsTrigger>
              <TabsTrigger value="rules">
                <Bell className="h-4 w-4 mr-2" />
                Regras
              </TabsTrigger>
              <TabsTrigger value="group">
                <Send className="h-4 w-4 mr-2" />
                Comunicação em Grupo
              </TabsTrigger>
              <TabsTrigger value="logs">
                <Clock className="h-4 w-4 mr-2" />
                Histórico
              </TabsTrigger>
            </TabsList>

            {/* WhatsApp Config Tab */}
            <TabsContent value="whatsapp">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Conexão WhatsApp
                  </CardTitle>
                  <CardDescription>
                    Configure a instância para envio de mensagens WhatsApp desta loja
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    {whatsappInstance?.is_active ? (
                      <Badge className="bg-green-600 text-white"><Wifi className="h-3 w-3 mr-1" /> Conectado</Badge>
                    ) : (
                      <Badge variant="secondary"><WifiOff className="h-3 w-3 mr-1" /> Desconectado</Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Provedor da API</Label>
                    <Select value={wpApiFormat} onValueChange={setWpApiFormat}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o provedor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wattend">Wattend</SelectItem>
                        <SelectItem value="z-api">Z-API</SelectItem>
                        <SelectItem value="z-pro">Z-Pro / CloudZAPI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>URL Base da API</Label>
                    <Input value={wpBaseUrl} onChange={(e) => setWpBaseUrl(e.target.value)} placeholder="https://api.wattend.io" />
                  </div>
                  <div className="space-y-2">
                    <Label>Instance ID</Label>
                    <Input value={wpInstanceId} onChange={(e) => setWpInstanceId(e.target.value)} placeholder="Seu Instance ID" />
                  </div>
                  <div className="space-y-2">
                    <Label>Token</Label>
                    <div className="relative">
                      <Input
                        type={showToken ? 'text' : 'password'}
                        value={wpToken}
                        onChange={(e) => setWpToken(e.target.value)}
                        placeholder="Seu Token"
                        className="pr-10"
                      />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowToken(!showToken)}>
                        {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={wpActive} onCheckedChange={setWpActive} />
                    <Label>Instância ativa</Label>
                  </div>
                  <Button onClick={handleSaveWhatsApp} disabled={upsertInstance.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Configuração
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notification Rules Tab */}
            <TabsContent value="rules">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Regras de Notificação
                      </CardTitle>
                      <CardDescription>Defina quando e como os membros serão notificados</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline"><Copy className="h-4 w-4 mr-2" /> Clonar de Outra Loja</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Clonar Regras de Outra Loja</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Loja de Origem</Label>
                              <Select value={cloneSourceLodgeId} onValueChange={setCloneSourceLodgeId}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione a loja de origem" />
                                </SelectTrigger>
                                <SelectContent>
                                  {lodges?.filter(l => l.id !== selectedLodgeId).map((lodge) => (
                                    <SelectItem key={lodge.id} value={lodge.id}>{lodge.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {cloneSourceLodgeId && sourceRulesForClone && (
                              <div className="space-y-2">
                                <Label>Regras encontradas: {sourceRulesForClone.length}</Label>
                                <div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-2">
                                  {sourceRulesForClone.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Nenhuma regra encontrada nesta loja.</p>
                                  ) : (
                                    sourceRulesForClone.map((r) => {
                                      const info = getCategoryInfo(r.category);
                                      return (
                                        <div key={r.id} className="flex items-center gap-2 text-sm py-1">
                                          <Badge variant={r.is_enabled ? 'default' : 'secondary'} className="text-xs">
                                            {r.is_enabled ? 'Ativa' : 'Inativa'}
                                          </Badge>
                                          <span>{info.label}</span>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            )}
                            <Button
                              onClick={handleCloneRules}
                              disabled={cloneLoading || !cloneSourceLodgeId || !sourceRulesForClone?.length}
                              className="w-full"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              {cloneLoading ? 'Clonando...' : `Clonar ${sourceRulesForClone?.length || 0} Regra(s)`}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                        <DialogTrigger asChild>
                          <Button><Plus className="h-4 w-4 mr-2" /> Nova Regra</Button>
                        </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Nova Regra de Notificação</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Tipo de Notificação</Label>
                            <Select value={newCategory} onValueChange={setNewCategory}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
                                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {newCategory === 'payment_before_due' && (
                            <div className="space-y-2">
                              <Label>Quantos dias antes do vencimento?</Label>
                              <Input type="number" min="1" max="30" value={newDaysOffset} onChange={(e) => setNewDaysOffset(e.target.value)} />
                            </div>
                          )}

                          {newCategory === 'payment_overdue' && (
                            <div className="space-y-2">
                              <Label>Repetir a cada quantos dias?</Label>
                              <Input type="number" min="1" max="30" value={newRepeatDays} onChange={(e) => setNewRepeatDays(e.target.value)} />
                              <p className="text-xs text-muted-foreground">O membro será notificado novamente a cada X dias enquanto a mensalidade estiver vencida.</p>
                            </div>
                          )}

                          {newCategory === 'event_same_day' && (
                            <div className="space-y-2">
                              <Label>Quantas horas antes do evento?</Label>
                              <Input type="number" min="1" max="24" value={newHoursBefore} onChange={(e) => setNewHoursBefore(e.target.value)} placeholder="Ex: 2" />
                              <p className="text-xs text-muted-foreground">Deixe vazio para notificar no início do dia. Crie várias regras para múltiplos horários.</p>
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label>Mensagem Personalizada (opcional)</Label>
                            <Textarea
                              value={newTemplate}
                              onChange={(e) => setNewTemplate(e.target.value)}
                              placeholder="Use variáveis: {{nome}}, {{mes}}, {{ano}}, {{valor}}, {{vencimento}}, {{evento}}, {{data}}, {{horario}}, {{aniversariante}}, {{anos}}, {{filho}}"
                              rows={4}
                            />
                            <p className="text-xs text-muted-foreground">
                              Variáveis disponíveis: {'{{nome}}'}, {'{{mes}}'}, {'{{ano}}'}, {'{{valor}}'}, {'{{vencimento}}'}, {'{{evento}}'}, {'{{data}}'}, {'{{horario}}'}, {'{{quando}}'}, {'{{aniversariante}}'}, {'{{anos}}'}, {'{{filho}}'} (nome do filho/esposa)
                            </p>
                          </div>

                          <Button onClick={handleAddRule} className="w-full" disabled={createRule.isPending}>
                            Criar Regra
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {rulesLoading ? (
                    <p className="text-muted-foreground">Carregando...</p>
                  ) : !rules || rules.length === 0 ? (
                    <div className="text-center py-8">
                      <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Nenhuma regra configurada para esta loja.</p>
                      <p className="text-sm text-muted-foreground mt-1">Clique em "Nova Regra" para começar.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rules.map((rule) => {
                        const info = getCategoryInfo(rule.category);
                        const Icon = info.icon;
                        return (
                          <div key={rule.id} className="flex items-center gap-4 p-4 border rounded-lg">
                            <Switch checked={rule.is_enabled} onCheckedChange={() => handleToggleRule(rule)} />
                            <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{info.label}</p>
                              <p className="text-sm text-muted-foreground">{info.description}</p>
                              {rule.category === 'payment_before_due' && (
                                <p className="text-xs text-muted-foreground mt-1">📌 {rule.days_offset} dias antes</p>
                              )}
                              {rule.category === 'payment_overdue' && rule.repeat_interval_days && (
                                <p className="text-xs text-muted-foreground mt-1">🔄 Repetir a cada {rule.repeat_interval_days} dias</p>
                              )}
                              {rule.category === 'event_same_day' && rule.hours_before && (
                                <p className="text-xs text-muted-foreground mt-1">⏰ {rule.hours_before} hora(s) antes</p>
                              )}
                              {rule.message_template && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">💬 Mensagem personalizada</p>
                              )}
                            </div>
                            <Badge variant={rule.is_enabled ? 'default' : 'secondary'}>
                              {rule.is_enabled ? 'Ativa' : 'Inativa'}
                            </Badge>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(rule)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(rule.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Group Message Tab */}
            <TabsContent value="group">
              <GroupMessagePanel lodgeId={selectedLodgeId} />
            </TabsContent>

            {/* Logs Tab */}
            <TabsContent value="logs">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Histórico de Notificações
                  </CardTitle>
                  <CardDescription>Últimas notificações enviadas para esta loja</CardDescription>
                </CardHeader>
                <CardContent>
                  {!logs || logs.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Nenhuma notificação enviada ainda.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Mensagem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-sm whitespace-nowrap">
                              {format(parseISO(log.sent_at), "dd/MM/yyyy HH:mm")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {getCategoryInfo(log.category).label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{log.phone || '-'}</TableCell>
                            <TableCell>{getStatusBadge(log.status)}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                              {log.error_message || log.message || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Edit Rule Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Regra de Notificação</DialogTitle>
            </DialogHeader>
            {editingRule && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Tipo</Label>
                  <p className="font-medium">{getCategoryInfo(editingRule.category).label}</p>
                </div>

                {editingRule.category === 'payment_before_due' && (
                  <div className="space-y-2">
                    <Label>Quantos dias antes do vencimento?</Label>
                    <Input type="number" min="1" max="30" value={editDaysOffset} onChange={(e) => setEditDaysOffset(e.target.value)} />
                  </div>
                )}

                {editingRule.category === 'payment_overdue' && (
                  <div className="space-y-2">
                    <Label>Repetir a cada quantos dias?</Label>
                    <Input type="number" min="1" max="30" value={editRepeatDays} onChange={(e) => setEditRepeatDays(e.target.value)} />
                    <p className="text-xs text-muted-foreground">O membro será notificado novamente a cada X dias enquanto a mensalidade estiver vencida.</p>
                  </div>
                )}

                {editingRule.category === 'event_same_day' && (
                  <div className="space-y-2">
                    <Label>Quantas horas antes do evento?</Label>
                    <Input type="number" min="1" max="24" value={editHoursBefore} onChange={(e) => setEditHoursBefore(e.target.value)} placeholder="Ex: 2" />
                    <p className="text-xs text-muted-foreground">Deixe vazio para notificar no início do dia.</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Mensagem Personalizada (opcional)</Label>
                  <Textarea
                    value={editTemplate}
                    onChange={(e) => setEditTemplate(e.target.value)}
                    placeholder="Use variáveis: {{nome}}, {{mes}}, {{ano}}, {{valor}}, {{vencimento}}, {{evento}}, {{data}}, {{horario}}"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Variáveis: {'{{nome}}'}, {'{{mes}}'}, {'{{ano}}'}, {'{{valor}}'}, {'{{vencimento}}'}, {'{{evento}}'}, {'{{data}}'}, {'{{horario}}'}, {'{{quando}}'}
                  </p>
                </div>

                <Button onClick={handleSaveEdit} className="w-full" disabled={updateRule.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
