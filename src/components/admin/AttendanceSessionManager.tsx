import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, CheckCircle, Save, Search, Users, UserCheck, UserX } from 'lucide-react';
import { Event } from '@/hooks/useEvents';

interface AttendanceSessionManagerProps {
  event: Event;
  lodgeId: string;
  onBack: () => void;
}

interface MemberAttendance {
  profileId: string;
  fullName: string;
  cimNumber: string | null;
  present: boolean;
  attendanceId: string | null;
}

export function AttendanceSessionManager({ event, lodgeId, onBack }: AttendanceSessionManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [memberAttendances, setMemberAttendances] = useState<MemberAttendance[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch lodge members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['lodge-members-attendance', lodgeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, cim_number')
        .eq('lodge_id', lodgeId)
        .in('status', ['approved', 'membro'])
        .eq('member_status', 'active')
        .order('full_name');

      if (error) throw error;
      return data;
    },
    enabled: !!lodgeId,
    // Avoid refetch-on-focus clobbering the admin's in-progress selections,
    // which are kept in local state and re-synced by the merge effect below.
    refetchOnWindowFocus: false,
  });

  // Fetch existing attendances for this session
  const { data: existingAttendances, isLoading: attendancesLoading } = useQuery({
    queryKey: ['session-attendances', lodgeId, event.event_date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendances')
        .select('id, profile_id, confirmed')
        .eq('lodge_id', lodgeId)
        .eq('session_date', event.event_date);

      if (error) throw error;
      return data;
    },
    enabled: !!lodgeId && !!event.event_date,
    refetchOnWindowFocus: false,
  });

  // Merge members with existing attendances
  useEffect(() => {
    if (!members) return;

    const attendanceMap = new Map(
      existingAttendances?.map(a => [a.profile_id, a]) || []
    );

    const merged: MemberAttendance[] = members.map(m => {
      const existing = attendanceMap.get(m.id);
      return {
        profileId: m.id,
        fullName: m.full_name,
        cimNumber: m.cim_number,
        present: existing?.confirmed ?? false,
        attendanceId: existing?.id ?? null,
      };
    });

    setMemberAttendances(merged);
  }, [members, existingAttendances]);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return memberAttendances;
    const lower = search.toLowerCase();
    return memberAttendances.filter(
      m => m.fullName.toLowerCase().includes(lower) ||
           (m.cimNumber && m.cimNumber.includes(search))
    );
  }, [memberAttendances, search]);

  const toggleMember = (profileId: string) => {
    setMemberAttendances(prev =>
      prev.map(m =>
        m.profileId === profileId ? { ...m, present: !m.present } : m
      )
    );
  };

  const selectAll = () => {
    setMemberAttendances(prev => prev.map(m => ({ ...m, present: true })));
  };

  const deselectAll = () => {
    setMemberAttendances(prev => prev.map(m => ({ ...m, present: false })));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const presentMembers = memberAttendances.filter(m => m.present);
      const absentMembers = memberAttendances.filter(m => !m.present);

      const nowIso = new Date().toISOString();

      // Batch the writes and run them concurrently; collect any errors instead of
      // silently continuing (the previous loop ignored every error).
      const updates = presentMembers
        .filter(m => m.attendanceId)
        .map(m =>
          supabase
            .from('attendances')
            .update({ confirmed: true, confirmed_at: nowIso })
            .eq('id', m.attendanceId!)
        );

      const insertsPayload = presentMembers
        .filter(m => !m.attendanceId)
        .map(m => ({
          profile_id: m.profileId,
          lodge_id: lodgeId,
          session_date: event.event_date,
          session_type: 'ordinaria',
          confirmed: true,
          confirmed_at: nowIso,
        }));

      const idsToDelete = absentMembers
        .filter(m => m.attendanceId)
        .map(m => m.attendanceId!);

      const operations: PromiseLike<{ error: unknown }>[] = [...updates];

      if (insertsPayload.length > 0) {
        operations.push(supabase.from('attendances').insert(insertsPayload));
      }

      if (idsToDelete.length > 0) {
        operations.push(supabase.from('attendances').delete().in('id', idsToDelete));
      }

      const results = await Promise.all(operations.map(op => Promise.resolve(op)));
      const firstError = results.find(r => r.error)?.error as { message?: string } | undefined;

      if (firstError) {
        throw new Error(firstError.message || 'Falha ao gravar uma ou mais presenças.');
      }

      queryClient.invalidateQueries({ queryKey: ['session-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['all-attendances'] });

      toast({
        title: 'Presenças salvas!',
        description: `${presentMembers.length} membro(s) marcado(s) como presente(s).`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar presenças',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const presentCount = memberAttendances.filter(m => m.present).length;
  const totalCount = memberAttendances.length;
  const isLoading = membersLoading || attendancesLoading;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{event.title}</h2>
          <p className="text-sm text-muted-foreground">
            {format(new Date(event.event_date + 'T12:00:00'), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            {event.event_time && ` • ${event.event_time.slice(0, 5)}`}
          </p>
        </div>
        <Badge variant="outline" className="text-base px-3 py-1">
          <UserCheck className="h-4 w-4 mr-1" />
          {presentCount}/{totalCount}
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lista de Membros
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Todos
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                <UserX className="h-4 w-4 mr-1" />
                Nenhum
              </Button>
            </div>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CIM..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground animate-pulse">Carregando membros...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum membro encontrado.
            </p>
          ) : (
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {filteredMembers.map((member) => (
                <button
                  key={member.profileId}
                  type="button"
                  onClick={() => toggleMember(member.profileId)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                    member.present
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted border border-transparent'
                  }`}
                >
                  <Checkbox
                    checked={member.present}
                    onCheckedChange={() => toggleMember(member.profileId)}
                    className="pointer-events-none"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{member.fullName}</p>
                    {member.cimNumber && (
                      <p className="text-xs text-muted-foreground">CIM: {member.cimNumber}</p>
                    )}
                  </div>
                  {member.present && (
                    <Badge variant="default" className="shrink-0">Presente</Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 sticky bottom-0 bg-background py-3">
        <Button variant="outline" onClick={onBack}>Cancelar</Button>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Salvando...' : 'Salvar Presenças'}
        </Button>
      </div>
    </div>
  );
}
