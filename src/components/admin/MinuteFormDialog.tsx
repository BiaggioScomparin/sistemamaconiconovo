import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateSessionMinute, useUpdateSessionMinute, SessionMinute } from '@/hooks/useSessionMinutes';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { Loader2, Users, FileText, BookOpen, Gavel, MessageSquare } from 'lucide-react';

interface MinuteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  minute?: SessionMinute | null;
  sessionType: 'ordinaria' | 'magna';
}

const currentMasonicYear = () => {
  const year = new Date().getFullYear();
  return `${year + 4000}`;
};

export function MinuteFormDialog({ open, onOpenChange, minute, sessionType }: MinuteFormDialogProps) {
  const { data: profile } = useProfile();
  const createMutation = useCreateSessionMinute();
  const updateMutation = useUpdateSessionMinute();

  const [formData, setFormData] = useState({
    // Cabeçalho
    session_date: '',
    session_number: '',
    masonic_year: currentMasonicYear(),
    opening_time: '',
    closing_time: '',
    
    // Oficiais - Constituição da Loja
    presiding_master: '',
    first_vigilant: '',
    second_vigilant: '',
    orator: '',
    secretary: '',
    first_deacon: '',
    second_deacon: '',
    chancellor: '',
    inner_guard: '',
    master_of_ceremonies: '',
    hospitaller: '',
    treasurer: '',
    master_of_harmony: '',
    
    // Presença
    members_present: '',
    visitors: '',
    
    // Conteúdo da Sessão
    previous_minutes_reading: '',
    expedient: '',
    proposal_bag: '',
    order_of_the_day: '',
    study_time: '',
    beneficence_trunk: '',
    word_for_order: '',
    closing_ritual: '',
    observations: '',
  });

  useEffect(() => {
    if (minute) {
      setFormData({
        session_date: minute.session_date || '',
        session_number: minute.session_number?.toString() || '',
        masonic_year: minute.masonic_year || currentMasonicYear(),
        opening_time: minute.opening_time || '',
        closing_time: minute.closing_time || '',
        presiding_master: minute.presiding_master || '',
        first_vigilant: minute.first_vigilant || '',
        second_vigilant: minute.second_vigilant || '',
        orator: minute.orator || '',
        secretary: minute.secretary || '',
        first_deacon: minute.first_deacon || '',
        second_deacon: minute.second_deacon || '',
        chancellor: minute.chancellor || '',
        inner_guard: minute.inner_guard || '',
        master_of_ceremonies: minute.master_of_ceremonies || '',
        hospitaller: minute.hospitaller || '',
        treasurer: minute.treasurer || '',
        master_of_harmony: minute.master_of_harmony || '',
        members_present: minute.members_present || '',
        visitors: minute.visitors || '',
        previous_minutes_reading: minute.previous_minutes_reading || '',
        expedient: minute.expedient || '',
        proposal_bag: minute.proposal_bag || '',
        order_of_the_day: minute.order_of_the_day || '',
        study_time: minute.study_time || '',
        beneficence_trunk: minute.beneficence_trunk || '',
        word_for_order: minute.word_for_order || '',
        closing_ritual: minute.closing_ritual || '',
        observations: minute.observations || '',
      });
    } else {
      setFormData({
        session_date: new Date().toISOString().split('T')[0],
        session_number: '',
        masonic_year: currentMasonicYear(),
        opening_time: '',
        closing_time: '',
        presiding_master: '',
        first_vigilant: '',
        second_vigilant: '',
        orator: '',
        secretary: '',
        first_deacon: '',
        second_deacon: '',
        chancellor: '',
        inner_guard: '',
        master_of_ceremonies: '',
        hospitaller: '',
        treasurer: '',
        master_of_harmony: '',
        members_present: '',
        visitors: '',
        previous_minutes_reading: '',
        expedient: '',
        proposal_bag: '',
        order_of_the_day: '',
        study_time: '',
        beneficence_trunk: '',
        word_for_order: '',
        closing_ritual: '',
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
      <DialogContent className="max-w-5xl max-h-[95vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl">
            {minute ? 'Editar' : 'Nova'} Ata de Sessão {sessionType === 'ordinaria' ? 'Ordinária' : 'Magna'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Grande Oriente Independente do Brasil - G.·.O.·.I.·.B.·.
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(95vh-140px)]">
          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-6">
            {/* Cabeçalho */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Informações da Sessão
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="session_number">Ata Nº</Label>
                  <Input
                    id="session_number"
                    type="number"
                    value={formData.session_number}
                    onChange={(e) => handleChange('session_number', e.target.value)}
                    placeholder="001"
                    disabled={!isEditable}
                  />
                </div>
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
                  <Label htmlFor="masonic_year">Ano V.·.L.·.</Label>
                  <Input
                    id="masonic_year"
                    value={formData.masonic_year}
                    onChange={(e) => handleChange('masonic_year', e.target.value)}
                    placeholder="6025"
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
              </CardContent>
            </Card>

            {/* Constituição da Loja */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  A Loja Estava Assim Constituída
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="presiding_master">Venerável Mestre</Label>
                    <Input
                      id="presiding_master"
                      value={formData.presiding_master}
                      onChange={(e) => handleChange('presiding_master', e.target.value)}
                      placeholder="Ir.·."
                      disabled={!isEditable}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="first_vigilant">1º Vigilante</Label>
                    <Input
                      id="first_vigilant"
                      value={formData.first_vigilant}
                      onChange={(e) => handleChange('first_vigilant', e.target.value)}
                      placeholder="Ir.·."
                      disabled={!isEditable}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="second_vigilant">2º Vigilante</Label>
                    <Input
                      id="second_vigilant"
                      value={formData.second_vigilant}
                      onChange={(e) => handleChange('second_vigilant', e.target.value)}
                      placeholder="Ir.·."
                      disabled={!isEditable}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orator">Orador</Label>
                    <Input
                      id="orator"
                      value={formData.orator}
                      onChange={(e) => handleChange('orator', e.target.value)}
                      placeholder="Ir.·."
                      disabled={!isEditable}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secretary">Secretário</Label>
                    <Input
                      id="secretary"
                      value={formData.secretary}
                      onChange={(e) => handleChange('secretary', e.target.value)}
                      placeholder="Ir.·."
                      disabled={!isEditable}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="treasurer">Tesoureiro</Label>
                    <Input
                      id="treasurer"
                      value={formData.treasurer}
                      onChange={(e) => handleChange('treasurer', e.target.value)}
                      placeholder="Ir.·."
                      disabled={!isEditable}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="first_deacon">1º Diácono</Label>
                    <Input
                      id="first_deacon"
                      value={formData.first_deacon}
                      onChange={(e) => handleChange('first_deacon', e.target.value)}
                      placeholder="Ir.·."
                      disabled={!isEditable}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="second_deacon">2º Diácono</Label>
                    <Input
                      id="second_deacon"
                      value={formData.second_deacon}
                      onChange={(e) => handleChange('second_deacon', e.target.value)}
                      placeholder="Ir.·."
                      disabled={!isEditable}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chancellor">Chanceler</Label>
                    <Input
                      id="chancellor"
                      value={formData.chancellor}
                      onChange={(e) => handleChange('chancellor', e.target.value)}
                      placeholder="Ir.·."
                      disabled={!isEditable}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="master_of_ceremonies">Mestre de Cerimônias</Label>
                    <Input
                      id="master_of_ceremonies"
                      value={formData.master_of_ceremonies}
                      onChange={(e) => handleChange('master_of_ceremonies', e.target.value)}
                      placeholder="Ir.·."
                      disabled={!isEditable}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inner_guard">Cobridor Interno</Label>
                    <Input
                      id="inner_guard"
                      value={formData.inner_guard}
                      onChange={(e) => handleChange('inner_guard', e.target.value)}
                      placeholder="Ir.·."
                      disabled={!isEditable}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hospitaller">Hospitaleiro</Label>
                    <Input
                      id="hospitaller"
                      value={formData.hospitaller}
                      onChange={(e) => handleChange('hospitaller', e.target.value)}
                      placeholder="Ir.·."
                      disabled={!isEditable}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="master_of_harmony">Mestre de Harmonia</Label>
                    <Input
                      id="master_of_harmony"
                      value={formData.master_of_harmony}
                      onChange={(e) => handleChange('master_of_harmony', e.target.value)}
                      placeholder="Ir.·."
                      disabled={!isEditable}
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="members_present">Membros Presentes</Label>
                    <Textarea
                      id="members_present"
                      value={formData.members_present}
                      onChange={(e) => handleChange('members_present', e.target.value)}
                      rows={3}
                      placeholder="Liste os IIr.·. presentes..."
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
                      placeholder="Liste os visitantes e suas Lojas..."
                      disabled={!isEditable}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conteúdo da Sessão */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Gavel className="h-4 w-4" />
                  Trabalhos da Sessão
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="previous_minutes_reading">Leitura da Ata Anterior</Label>
                  <Textarea
                    id="previous_minutes_reading"
                    value={formData.previous_minutes_reading}
                    onChange={(e) => handleChange('previous_minutes_reading', e.target.value)}
                    rows={2}
                    placeholder="Foi lida e aprovada a ata da sessão anterior..."
                    disabled={!isEditable}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expedient">Expediente</Label>
                  <Textarea
                    id="expedient"
                    value={formData.expedient}
                    onChange={(e) => handleChange('expedient', e.target.value)}
                    rows={3}
                    placeholder="Correspondências recebidas e enviadas..."
                    disabled={!isEditable}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proposal_bag">Saco de Proposta e Informações</Label>
                  <Textarea
                    id="proposal_bag"
                    value={formData.proposal_bag}
                    onChange={(e) => handleChange('proposal_bag', e.target.value)}
                    rows={3}
                    placeholder="Propostas apresentadas..."
                    disabled={!isEditable}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="order_of_the_day">Ordem do Dia</Label>
                  <Textarea
                    id="order_of_the_day"
                    value={formData.order_of_the_day}
                    onChange={(e) => handleChange('order_of_the_day', e.target.value)}
                    rows={4}
                    placeholder="Assuntos tratados na ordem do dia..."
                    disabled={!isEditable}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Estudos e Beneficência */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Estudos e Beneficência
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="study_time">Tempo de Estudos</Label>
                  <Textarea
                    id="study_time"
                    value={formData.study_time}
                    onChange={(e) => handleChange('study_time', e.target.value)}
                    rows={4}
                    placeholder="Trabalhos apresentados, palestras, instruções..."
                    disabled={!isEditable}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="beneficence_trunk">Tronco de Beneficência</Label>
                  <Textarea
                    id="beneficence_trunk"
                    value={formData.beneficence_trunk}
                    onChange={(e) => handleChange('beneficence_trunk', e.target.value)}
                    rows={2}
                    placeholder="Valor arrecadado e destino..."
                    disabled={!isEditable}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Encerramento */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Encerramento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="word_for_order">A Palavra a Bem da Ordem em Geral e do Quadro em Particular</Label>
                  <Textarea
                    id="word_for_order"
                    value={formData.word_for_order}
                    onChange={(e) => handleChange('word_for_order', e.target.value)}
                    rows={3}
                    placeholder="Manifestações dos IIr.·...."
                    disabled={!isEditable}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="closing_ritual">Encerramento da Sessão</Label>
                  <Textarea
                    id="closing_ritual"
                    value={formData.closing_ritual}
                    onChange={(e) => handleChange('closing_ritual', e.target.value)}
                    rows={2}
                    placeholder="O V.·.M.·. encerrou a presente sessão com ritualística..."
                    disabled={!isEditable}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observations">Observações</Label>
                  <Textarea
                    id="observations"
                    value={formData.observations}
                    onChange={(e) => handleChange('observations', e.target.value)}
                    rows={2}
                    placeholder="Observações adicionais..."
                    disabled={!isEditable}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background py-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {isEditable ? 'Cancelar' : 'Fechar'}
              </Button>
              {isEditable && (
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    minute ? 'Atualizar Ata' : 'Criar Ata'
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
