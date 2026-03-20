import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Send, Users, Filter, Search, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface MemberForMessage {
  id: string;
  full_name: string;
  cell_phone: string | null;
  degree: string | null;
  photo_url: string | null;
  lodge_position: string | null;
}

function useLodgeMembersForMessage(lodgeId: string | undefined) {
  return useQuery({
    queryKey: ['lodge-members-message', lodgeId],
    queryFn: async () => {
      if (!lodgeId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, cell_phone, degree, photo_url, lodge_position')
        .eq('lodge_id', lodgeId)
        .in('status', ['approved', 'membro'])
        .eq('member_status', 'active')
        .order('full_name');
      if (error) throw error;
      return (data || []) as MemberForMessage[];
    },
    enabled: !!lodgeId,
  });
}

interface GroupMessagePanelProps {
  lodgeId: string;
}

type FilterMode = 'all' | 'degree' | 'manual';

interface SendProgress {
  total: number;
  sent: number;
  failed: number;
  current: string;
}

export function GroupMessagePanel({ lodgeId }: GroupMessagePanelProps) {
  const { data: members, isLoading } = useLodgeMembersForMessage(lodgeId);

  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedDegree, setSelectedDegree] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<SendProgress | null>(null);

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    let list = members;

    if (filterMode === 'degree' && selectedDegree) {
      list = list.filter((m) => m.degree === selectedDegree);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter((m) => m.full_name.toLowerCase().includes(term));
    }

    return list;
  }, [members, filterMode, selectedDegree, searchTerm]);

  const recipients = useMemo(() => {
    if (!members) return [];
    if (filterMode === 'all') return members.filter((m) => m.cell_phone);
    if (filterMode === 'degree' && selectedDegree) {
      return members.filter((m) => m.degree === selectedDegree && m.cell_phone);
    }
    if (filterMode === 'manual') {
      return members.filter((m) => selectedIds.has(m.id) && m.cell_phone);
    }
    return [];
  }, [members, filterMode, selectedDegree, selectedIds]);

  const membersWithoutPhone = useMemo(() => {
    if (!members) return 0;
    if (filterMode === 'all') return members.filter((m) => !m.cell_phone).length;
    if (filterMode === 'degree' && selectedDegree) {
      return members.filter((m) => m.degree === selectedDegree && !m.cell_phone).length;
    }
    if (filterMode === 'manual') {
      return members.filter((m) => selectedIds.has(m.id) && !m.cell_phone).length;
    }
    return 0;
  }, [members, filterMode, selectedDegree, selectedIds]);

  const toggleMember = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredMembers.map((m) => m.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Digite uma mensagem antes de enviar.');
      return;
    }
    if (recipients.length === 0) {
      toast.error('Nenhum destinatário com telefone cadastrado.');
      return;
    }

    setSending(true);
    const progressState: SendProgress = {
      total: recipients.length,
      sent: 0,
      failed: 0,
      current: '',
    };
    setProgress(progressState);

    for (const member of recipients) {
      progressState.current = member.full_name;
      setProgress({ ...progressState });

      const personalizedMessage = message
        .replace(/\{\{nome\}\}/g, member.full_name)
        .replace(/\{\{grau\}\}/g, member.degree || '')
        .replace(/\{\{cargo\}\}/g, member.lodge_position || '');

      try {
        const { error } = await supabase.functions.invoke('send-whatsapp', {
          body: {
            lodge_id: lodgeId,
            phone: member.cell_phone,
            message: personalizedMessage,
            category: 'group_message',
            profile_id: member.id,
          },
        });

        if (error) throw error;
        progressState.sent++;
      } catch (err) {
        console.error(`Failed to send to ${member.full_name}:`, err);
        progressState.failed++;
      }

      setProgress({ ...progressState });
      // Small delay between messages to avoid rate limiting
      await new Promise((r) => setTimeout(r, 800));
    }

    setSending(false);

    if (progressState.failed === 0) {
      toast.success(`Mensagem enviada para ${progressState.sent} membro(s)!`);
    } else {
      toast.warning(
        `Enviadas: ${progressState.sent} | Falhas: ${progressState.failed}`
      );
    }

    setTimeout(() => setProgress(null), 3000);
  };

  const degrees = ['Aprendiz', 'Companheiro', 'Mestre', 'Mestre Instalado'];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Carregando membros...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recipient Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Destinatários
          </CardTitle>
          <CardDescription>Selecione quem receberá a mensagem</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Filtro de Destinatários</Label>
            <Select value={filterMode} onValueChange={(v) => { setFilterMode(v as FilterMode); setSelectedIds(new Set()); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Todos os Membros Ativos
                  </div>
                </SelectItem>
                <SelectItem value="degree">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Por Grau
                  </div>
                </SelectItem>
                <SelectItem value="manual">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Selecionar Manualmente
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filterMode === 'degree' && (
            <div className="space-y-2">
              <Label>Grau</Label>
              <Select value={selectedDegree} onValueChange={setSelectedDegree}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o grau" />
                </SelectTrigger>
                <SelectContent>
                  {degrees.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {filterMode === 'manual' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar membro..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Todos
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Nenhum
                </Button>
              </div>

              <ScrollArea className="h-64 border rounded-lg p-2">
                <div className="space-y-1">
                  {filteredMembers.map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedIds.has(member.id)}
                        onCheckedChange={() => toggleMember(member.id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.photo_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {member.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.degree || 'Sem grau'} {member.cell_phone ? '' : '• ⚠️ Sem telefone'}
                        </p>
                      </div>
                    </label>
                  ))}
                  {filteredMembers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum membro encontrado.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Recipient Summary */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="gap-1">
              <Send className="h-3 w-3" />
              {recipients.length} destinatário(s)
            </Badge>
            {membersWithoutPhone > 0 && (
              <Badge variant="secondary" className="gap-1 text-amber-600">
                <AlertTriangle className="h-3 w-3" />
                {membersWithoutPhone} sem telefone
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Message Composer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Mensagem
          </CardTitle>
          <CardDescription>Escreva a mensagem que será enviada aos destinatários</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem aqui...

Use variáveis: {{nome}}, {{grau}}, {{cargo}}"
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Variáveis disponíveis: {'{{nome}}'} (nome do membro), {'{{grau}}'} (grau maçônico), {'{{cargo}}'} (cargo na loja)
            </p>
          </div>

          {/* Progress */}
          {progress && (
            <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Enviando para: <strong>{progress.current}</strong>
                </span>
                <span className="font-medium">
                  {progress.sent + progress.failed}/{progress.total}
                </span>
              </div>
              <Progress value={((progress.sent + progress.failed) / progress.total) * 100} />
              <div className="flex gap-3 text-xs">
                <span className="text-green-600">✓ {progress.sent} enviadas</span>
                {progress.failed > 0 && (
                  <span className="text-destructive">✗ {progress.failed} falhas</span>
                )}
              </div>
            </div>
          )}

          <Button
            onClick={handleSend}
            disabled={sending || !message.trim() || recipients.length === 0}
            className="w-full"
            size="lg"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar para {recipients.length} membro(s)
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
