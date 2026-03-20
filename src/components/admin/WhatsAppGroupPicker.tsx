import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Search, Users } from 'lucide-react';
import { toast } from 'sonner';

interface WhatsAppGroup {
  id: string;
  name: string;
}

interface WhatsAppGroupPickerProps {
  lodgeId: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  description?: string;
}

export function WhatsAppGroupPicker({
  lodgeId,
  value,
  onChange,
  label = 'ID do Grupo WhatsApp (opcional)',
  description = 'Se preenchido, a notificação será enviada para o grupo ao invés de individualmente.',
}: WhatsAppGroupPickerProps) {
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('list-whatsapp-groups', {
        body: { lodge_id: lodgeId },
      });
      if (error) {
        // Try to parse the error response for unsupported message
        try {
          const errBody = JSON.parse(error.message || '{}');
          if (errBody?.unsupported) {
            toast.info(errBody.error || 'API não suporta listagem de grupos.');
            setLoading(false);
            return;
          }
        } catch {}
        throw error;
      }
      if (data?.unsupported) {
        toast.info(data.error || 'API não suporta listagem de grupos. Insira o ID manualmente.');
        setLoading(false);
        return;
      }
      setGroups(data?.groups || []);
      if ((data?.groups || []).length === 0) {
        toast.info('Nenhum grupo encontrado na instância WhatsApp.');
      }
    } catch (err: any) {
      console.error('Failed to fetch groups:', err);
      // Check if the error contains the unsupported message
      const errMsg = err?.context?.body ? await err.context.body.text?.() : '';
      let parsed: any = {};
      try { parsed = JSON.parse(errMsg); } catch {}
      if (parsed?.unsupported) {
        toast.info(parsed.error || 'API não suporta listagem automática de grupos.');
      } else {
        toast.error('Falha ao buscar grupos. Verifique a configuração da instância WhatsApp.');
      }
    }
    setLoading(false);
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && groups.length === 0) {
      fetchGroups();
    }
  };

  const filteredGroups = search
    ? groups.filter(
        (g) =>
          g.name.toLowerCase().includes(search.toLowerCase()) ||
          g.id.toLowerCase().includes(search.toLowerCase())
      )
    : groups;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ex: 120363xxxxx@g.us"
          className="flex-1"
        />
        <Popover open={open} onOpenChange={handleOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" type="button" title="Buscar grupos">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="p-3 border-b">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4" />
                Grupos do WhatsApp
              </div>
              <Input
                placeholder="Filtrar grupos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mt-2 h-8 text-sm"
              />
            </div>
            <ScrollArea className="max-h-64">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {groups.length === 0 ? 'Nenhum grupo encontrado.' : 'Nenhum grupo corresponde ao filtro.'}
                </div>
              ) : (
                <div className="p-1">
                  {filteredGroups.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-sm"
                      onClick={() => {
                        onChange(group.id);
                        setOpen(false);
                      }}
                    >
                      <p className="font-medium truncate">{group.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{group.id}</p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
            {!loading && groups.length > 0 && (
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={fetchGroups}
                >
                  Atualizar lista
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
