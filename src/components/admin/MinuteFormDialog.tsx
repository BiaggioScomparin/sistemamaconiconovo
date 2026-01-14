import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCreateSessionMinute, useUpdateSessionMinute, SessionMinute } from '@/hooks/useSessionMinutes';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface MinuteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  minute?: SessionMinute | null;
  sessionType: 'ordinaria' | 'magna';
}

export function MinuteFormDialog({ open, onOpenChange, minute, sessionType }: MinuteFormDialogProps) {
  const { data: profile } = useProfile();
  const createMutation = useCreateSessionMinute();
  const updateMutation = useUpdateSessionMinute();

  const [formData, setFormData] = useState({
    session_date: '',
    session_number: '',
    opening_time: '',
    closing_time: '',
    presiding_master: '',
    orator: '',
    secretary: '',
    members_present: '',
    visitors: '',
    correspondence_read: '',
    treasury_report: '',
    proposals: '',
    deliberations: '',
    word_of_order: '',
    general_matters: '',
    observations: '',
  });

  useEffect(() => {
    if (minute) {
      setFormData({
        session_date: minute.session_date || '',
        session_number: minute.session_number?.toString() || '',
        opening_time: minute.opening_time || '',
        closing_time: minute.closing_time || '',
        presiding_master: minute.presiding_master || '',
        orator: minute.orator || '',
        secretary: minute.secretary || '',
        members_present: minute.members_present || '',
        visitors: minute.visitors || '',
        correspondence_read: minute.correspondence_read || '',
        treasury_report: minute.treasury_report || '',
        proposals: minute.proposals || '',
        deliberations: minute.deliberations || '',
        word_of_order: minute.word_of_order || '',
        general_matters: minute.general_matters || '',
        observations: minute.observations || '',
      });
    } else {
      setFormData({
        session_date: new Date().toISOString().split('T')[0],
        session_number: '',
        opening_time: '',
        closing_time: '',
        presiding_master: '',
        orator: '',
        secretary: '',
        members_present: '',
        visitors: '',
        correspondence_read: '',
        treasury_report: '',
        proposals: '',
        deliberations: '',
        word_of_order: '',
        general_matters: '',
        observations: '',
      });
    }
  }, [minute, open]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      session_number: formData.session_number ? parseInt(formData.session_number) : null,
      session_type: sessionType,
      lodge_id: profile?.lodge_id,
    };

    try {
      if (minute) {
        await updateMutation.mutateAsync({ id: minute.id, ...payload });
        toast.success('Ata atualizada com sucesso!');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Ata criada com sucesso!');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao salvar ata');
      console.error(error);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const isEditable = !minute || minute.status === 'draft';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>
            {minute ? 'Editar' : 'Nova'} Ata de Sessão {sessionType === 'ordinaria' ? 'Ordinária' : 'Magna'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] px-6">
          <form onSubmit={handleSubmit} className="space-y-6 pb-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="session_date">Data da Sessão *</Label>
                <Input
                  id="session_date"
                  type="date"
                  value={formData.session_date}
                  onChange={(e) => handleChange('session_date', e.target.value)}
                  required
                  disabled={!isEditable}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session_number">Número da Sessão</Label>
                <Input
                  id="session_number"
                  type="number"
                  value={formData.session_number}
                  onChange={(e) => handleChange('session_number', e.target.value)}
                  disabled={!isEditable}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="opening_time">Abertura</Label>
                  <Input
                    id="opening_time"
                    type="time"
                    value={formData.opening_time}
                    onChange={(e) => handleChange('opening_time', e.target.value)}
                    disabled={!isEditable}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closing_time">Encerramento</Label>
                  <Input
                    id="closing_time"
                    type="time"
                    value={formData.closing_time}
                    onChange={(e) => handleChange('closing_time', e.target.value)}
                    disabled={!isEditable}
                  />
                </div>
              </div>
            </div>

            {/* Officers */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Oficiais</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="presiding_master">Venerável Mestre</Label>
                  <Input
                    id="presiding_master"
                    value={formData.presiding_master}
                    onChange={(e) => handleChange('presiding_master', e.target.value)}
                    disabled={!isEditable}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orator">Orador</Label>
                  <Input
                    id="orator"
                    value={formData.orator}
                    onChange={(e) => handleChange('orator', e.target.value)}
                    disabled={!isEditable}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secretary">Secretário</Label>
                  <Input
                    id="secretary"
                    value={formData.secretary}
                    onChange={(e) => handleChange('secretary', e.target.value)}
                    disabled={!isEditable}
                  />
                </div>
              </div>
            </div>

            {/* Attendance */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Presença</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="members_present">Membros Presentes</Label>
                  <Textarea
                    id="members_present"
                    value={formData.members_present}
                    onChange={(e) => handleChange('members_present', e.target.value)}
                    rows={3}
                    placeholder="Liste os membros presentes..."
                    disabled={!isEditable}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visitors">Visitantes</Label>
                  <Textarea
                    id="visitors"
                    value={formData.visitors}
                    onChange={(e) => handleChange('visitors', e.target.value)}
                    rows={3}
                    placeholder="Liste os visitantes..."
                    disabled={!isEditable}
                  />
                </div>
              </div>
            </div>

            {/* Agenda */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Pauta</h3>
              
              <div className="space-y-2">
                <Label htmlFor="correspondence_read">Correspondências Lidas</Label>
                <Textarea
                  id="correspondence_read"
                  value={formData.correspondence_read}
                  onChange={(e) => handleChange('correspondence_read', e.target.value)}
                  rows={3}
                  disabled={!isEditable}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="treasury_report">Relatório do Tesoureiro</Label>
                <Textarea
                  id="treasury_report"
                  value={formData.treasury_report}
                  onChange={(e) => handleChange('treasury_report', e.target.value)}
                  rows={3}
                  disabled={!isEditable}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proposals">Propostas</Label>
                <Textarea
                  id="proposals"
                  value={formData.proposals}
                  onChange={(e) => handleChange('proposals', e.target.value)}
                  rows={3}
                  disabled={!isEditable}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliberations">Deliberações</Label>
                <Textarea
                  id="deliberations"
                  value={formData.deliberations}
                  onChange={(e) => handleChange('deliberations', e.target.value)}
                  rows={4}
                  disabled={!isEditable}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="word_of_order">Palavra de Ordem</Label>
                <Textarea
                  id="word_of_order"
                  value={formData.word_of_order}
                  onChange={(e) => handleChange('word_of_order', e.target.value)}
                  rows={2}
                  disabled={!isEditable}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="general_matters">Assuntos Gerais</Label>
                <Textarea
                  id="general_matters"
                  value={formData.general_matters}
                  onChange={(e) => handleChange('general_matters', e.target.value)}
                  rows={4}
                  disabled={!isEditable}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  value={formData.observations}
                  onChange={(e) => handleChange('observations', e.target.value)}
                  rows={3}
                  disabled={!isEditable}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              {isEditable && (
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    minute ? 'Atualizar' : 'Criar Ata'
                  )}
                </Button>
              )}
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
