import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  MessageSquare, 
  Save, 
  RotateCcw, 
  Sparkles, 
  Eye, 
  CheckCircle2, 
  Search, 
  UserCheck, 
  Calendar, 
  UserX, 
  FileText 
} from 'lucide-react';
import {
  useProposalMessageTemplates,
  ProposalStatusKey,
  ProposalMessageTemplate,
  DEFAULT_PROPOSAL_TEMPLATES,
  TEMPLATE_VARIABLES,
  formatProposalMessage,
} from '@/hooks/useProposalMessageTemplates';

interface ProposalMessageSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_TABS: { key: ProposalStatusKey; label: string; icon: any; color: string }[] = [
  { key: 'proposta', label: 'Proposta', icon: FileText, color: 'text-blue-500' },
  { key: 'sindicancia', label: 'Sindicância', icon: Search, color: 'text-yellow-500' },
  { key: 'sindicancia_aprovada', label: 'Sind. Aprovada', icon: UserCheck, color: 'text-orange-500' },
  { key: 'aguardando_iniciacao', label: 'Aguard. Iniciação', icon: Calendar, color: 'text-purple-500' },
  { key: 'membro', label: 'Novo Membro', icon: CheckCircle2, color: 'text-emerald-500' },
  { key: 'reprovado', label: 'Reprovado', icon: UserX, color: 'text-red-500' },
];

export function ProposalMessageSettingsDialog({
  open,
  onOpenChange,
}: ProposalMessageSettingsDialogProps) {
  const { templates, saveTemplates, isSaving } = useProposalMessageTemplates();
  const [formState, setFormState] = useState<Record<ProposalStatusKey, ProposalMessageTemplate>>(DEFAULT_PROPOSAL_TEMPLATES);
  const [activeTab, setActiveTab] = useState<ProposalStatusKey>('proposta');

  useEffect(() => {
    if (templates) {
      setFormState(templates);
    }
  }, [templates]);

  const handleUpdateTemplate = (status: ProposalStatusKey, text: string) => {
    setFormState(prev => ({
      ...prev,
      [status]: {
        ...prev[status],
        template: text,
      },
    }));
  };

  const handleToggleEnabled = (status: ProposalStatusKey, enabled: boolean) => {
    setFormState(prev => ({
      ...prev,
      [status]: {
        ...prev[status],
        enabled,
      },
    }));
  };

  const handleInsertTag = (status: ProposalStatusKey, tag: string) => {
    const current = formState[status]?.template || '';
    handleUpdateTemplate(status, current + (current.endsWith(' ') || current === '' ? '' : ' ') + tag);
  };

  const handleRestoreDefaults = () => {
    setFormState(DEFAULT_PROPOSAL_TEMPLATES);
  };

  const handleSave = async () => {
    await saveTemplates(formState);
    onOpenChange(false);
  };

  const exampleProfile = {
    full_name: 'Erbely Pericles da Silva',
    email: 'erbely@gmail.com',
    cell_phone: '(11) 99471-4504',
    cim_number: '720168',
    degree: 'Aprendiz',
  };

  const exampleExtra = {
    lodgeName: 'A.·.R.·.L.·.S.·. Lealdade e Justiça 001',
    initiationDate: '25/10/2026',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-display">
                Gerenciar Mensagens de Disparo (WhatsApp)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Configure os modelos de mensagens disparadas nas mudanças de status do funil de candidatos.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as ProposalStatusKey)}>
            <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-auto p-1 bg-muted/50 rounded-xl">
              {STATUS_TABS.map((tab) => {
                const Icon = tab.icon;
                const isEnabled = formState[tab.key]?.enabled;
                return (
                  <TabsTrigger
                    key={tab.key}
                    value={tab.key}
                    className="flex flex-col sm:flex-row items-center gap-1.5 py-2 px-1 text-xs data-[state=active]:bg-background"
                  >
                    <Icon className={`h-3.5 w-3.5 ${tab.color}`} />
                    <span className="truncate">{tab.label}</span>
                    {isEnabled ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Ativo" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" title="Desativado" />
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {STATUS_TABS.map((tab) => {
              const currentConfig = formState[tab.key] || DEFAULT_PROPOSAL_TEMPLATES[tab.key];
              const previewText = formatProposalMessage(
                currentConfig.template,
                exampleProfile,
                exampleExtra
              );

              return (
                <TabsContent key={tab.key} value={tab.key} className="mt-4 space-y-4">
                  {/* Status header & toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-accent/30 rounded-xl border border-border/50">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <span>Etapa: {tab.label}</span>
                        <Badge variant={currentConfig.enabled ? 'default' : 'secondary'} className="text-[10px]">
                          {currentConfig.enabled ? 'Envio Ativo' : 'Envio Desativado'}
                        </Badge>
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {currentConfig.enabled
                          ? 'A mensagem será carregada automaticamente ao mover o candidato para este status.'
                          : 'O envio de WhatsApp para esta etapa permanecerá desativado por padrão.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`switch-${tab.key}`} className="text-xs font-medium cursor-pointer">
                        {currentConfig.enabled ? 'Ativado' : 'Desativado'}
                      </Label>
                      <Switch
                        id={`switch-${tab.key}`}
                        checked={currentConfig.enabled}
                        onCheckedChange={(checked) => handleToggleEnabled(tab.key, checked)}
                      />
                    </div>
                  </div>

                  {/* Message editor */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground">
                      Texto da Mensagem (WhatsApp)
                    </Label>
                    <Textarea
                      rows={4}
                      value={currentConfig.template}
                      onChange={(e) => handleUpdateTemplate(tab.key, e.target.value)}
                      placeholder="Digite a mensagem padrão..."
                      className="font-mono text-xs leading-relaxed"
                    />
                  </div>

                  {/* Dynamic Tags Picker */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      <span>Variáveis dinâmicas (clique para adicionar ao texto):</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {TEMPLATE_VARIABLES.map((v) => (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => handleInsertTag(tab.key, v.key)}
                          title={`Exemplo: ${v.example}`}
                          className="text-[11px] px-2 py-0.5 bg-secondary/60 hover:bg-secondary text-secondary-foreground rounded-md border border-border/60 transition-colors cursor-pointer"
                        >
                          <span className="font-semibold text-primary">{v.key}</span>{' '}
                          <span className="text-muted-foreground text-[10px]">({v.label})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Live Preview */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Eye className="h-3.5 w-3.5 text-blue-500" />
                      <span>Prévia no WhatsApp (com dados de exemplo):</span>
                    </div>
                    <Card className="bg-emerald-950/10 border-emerald-500/20">
                      <CardContent className="p-3">
                        <div className="bg-[#dcf8c6] dark:bg-[#054640] text-slate-900 dark:text-slate-100 p-3 rounded-lg text-xs font-sans whitespace-pre-wrap leading-relaxed shadow-sm">
                          {previewText || <span className="text-muted-foreground italic">Nenhuma mensagem configurada.</span>}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </div>

        <DialogFooter className="p-4 border-t bg-muted/20 flex flex-row items-center justify-between sm:justify-between w-full">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRestoreDefaults}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar Padrão
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="gap-1.5 bg-primary text-primary-foreground font-semibold"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Salvando...' : 'Salvar Mensagens'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
