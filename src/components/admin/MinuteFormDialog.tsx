import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateSessionMinute, useUpdateSessionMinute, SessionMinute } from '@/hooks/useSessionMinutes';
import { useProfile } from '@/hooks/useProfile';
import { useLodges } from '@/hooks/useLodges';
import { useLodgeMembers } from '@/hooks/useLodgeMembers';
import { useAttendancesByDate } from '@/hooks/useAttendancesByDate';
import { MemberSelectField } from './MemberSelectField';
import { toast } from 'sonner';
import { Loader2, Users, FileText, BookOpen, Gavel, MessageSquare, RefreshCw } from 'lucide-react';

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
  const { data: lodges = [] } = useLodges();
  const createMutation = useCreateSessionMinute();
  const updateMutation = useUpdateSessionMinute();

  const [selectedLodgeId, setSelectedLodgeId] = useState<string>('');
  
  const { data: lodgeMembers = [] } = useLodgeMembers(selectedLodgeId);
  
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

  const { data: attendances = [], refetch: refetchAttendances } = useAttendancesByDate(
    selectedLodgeId, 
    formData.session_date
  );

  useEffect(() => {
    if (minute) {
      setSelectedLodgeId(minute.lodge_id || profile?.lodge_id || '');
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
      setSelectedLodgeId(profile?.lodge_id || '');
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
  }, [minute, open, profile?.lodge_id]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLoadAttendances = () => {
    if (attendances.length > 0) {
      const presentMembers = attendances
        .filter(a => a.full_name)
        .map(a => a.full_name)
        .join(', ');
      
      setFormData(prev => ({ 
        ...prev, 
        members_present: presentMembers 
      }));
      toast.success(`${attendances.length} presenças carregadas!`);
    } else {
      toast.info('Nenhuma presença confirmada encontrada para esta data.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLodgeId) {
      toast.error('Selecione uma Loja');
      return;
    }

    const payload = {
      ...formData,
      session_number: formData.session_number ? parseInt(formData.session_number) : null,
      session_type: sessionType,
      lodge_id: selectedLodgeId,
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
  const selectedLodge = lodges.find(l => l.id === selectedLodgeId);

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
            {/* Seleção de Loja */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Loja
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="lodge">Selecione a Loja *</Label>
                  <Select
                    value={selectedLodgeId}
                    onValueChange={setSelectedLodgeId}
                    disabled={!isEditable || !!minute}
                  >
                    <SelectTrigger id="lodge">
                      <SelectValue placeholder="Selecione uma loja" />
                    </SelectTrigger>
                    <SelectContent>
                      {lodges.map((lodge) => (
                        <SelectItem key={lodge.id} value={lodge.id}>
                          {lodge.name}
                          {lodge.city && ` - ${lodge.city}`}
                          {lodge.state && `/${lodge.state}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedLodge && (
                    <p className="text-xs text-muted-foreground">
                      {lodgeMembers.length} membros ativos nesta loja
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

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
                {!selectedLodgeId && (
                  <p className="text-xs text-amber-600">
                    Selecione uma loja para ver a lista de membros
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <MemberSelectField
                    id="presiding_master"
                    label="Venerável Mestre"
                    value={formData.presiding_master}
                    onChange={(value) => handleChange('presiding_master', value)}
                    members={lodgeMembers}
                    disabled={!isEditable}
                    placeholder="Selecione o V.·.M.·."
                  />
                  <MemberSelectField
                    id="first_vigilant"
                    label="1º Vigilante"
                    value={formData.first_vigilant}
                    onChange={(value) => handleChange('first_vigilant', value)}
                    members={lodgeMembers}
                    disabled={!isEditable}
                  />
                  <MemberSelectField
                    id="second_vigilant"
                    label="2º Vigilante"
                    value={formData.second_vigilant}
                    onChange={(value) => handleChange('second_vigilant', value)}
                    members={lodgeMembers}
                    disabled={!isEditable}
                  />
                  <MemberSelectField
                    id="orator"
                    label="Orador"
                    value={formData.orator}
                    onChange={(value) => handleChange('orator', value)}
                    members={lodgeMembers}
                    disabled={!isEditable}
                  />
                  <MemberSelectField
                    id="secretary"
                    label="Secretário"
                    value={formData.secretary}
                    onChange={(value) => handleChange('secretary', value)}
                    members={lodgeMembers}
                    disabled={!isEditable}
                  />
                  <MemberSelectField
                    id="treasurer"
                    label="Tesoureiro"
                    value={formData.treasurer}
                    onChange={(value) => handleChange('treasurer', value)}
                    members={lodgeMembers}
                    disabled={!isEditable}
                  />
                  <MemberSelectField
                    id="first_deacon"
                    label="1º Diácono"
                    value={formData.first_deacon}
                    onChange={(value) => handleChange('first_deacon', value)}
                    members={lodgeMembers}
                    disabled={!isEditable}
                  />
                  <MemberSelectField
                    id="second_deacon"
                    label="2º Diácono"
                    value={formData.second_deacon}
                    onChange={(value) => handleChange('second_deacon', value)}
                    members={lodgeMembers}
                    disabled={!isEditable}
                  />
                  <MemberSelectField
                    id="chancellor"
                    label="Chanceler"
                    value={formData.chancellor}
                    onChange={(value) => handleChange('chancellor', value)}
                    members={lodgeMembers}
                    disabled={!isEditable}
                  />
                  <MemberSelectField
                    id="master_of_ceremonies"
                    label="Mestre de Cerimônias"
                    value={formData.master_of_ceremonies}
                    onChange={(value) => handleChange('master_of_ceremonies', value)}
                    members={lodgeMembers}
                    disabled={!isEditable}
                  />
                  <MemberSelectField
                    id="inner_guard"
                    label="Cobridor Interno"
                    value={formData.inner_guard}
                    onChange={(value) => handleChange('inner_guard', value)}
                    members={lodgeMembers}
                    disabled={!isEditable}
                  />
                  <MemberSelectField
                    id="hospitaller"
                    label="Hospitaleiro"
                    value={formData.hospitaller}
                    onChange={(value) => handleChange('hospitaller', value)}
                    members={lodgeMembers}
                    disabled={!isEditable}
                  />
                  <MemberSelectField
                    id="master_of_harmony"
                    label="Mestre de Harmonia"
                    value={formData.master_of_harmony}
                    onChange={(value) => handleChange('master_of_harmony', value)}
                    members={lodgeMembers}
                    disabled={!isEditable}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="members_present">Membros Presentes</Label>
                      {isEditable && selectedLodgeId && formData.session_date && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleLoadAttendances}
                          className="h-7 text-xs"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Carregar Presenças
                        </Button>
                      )}
                    </div>
                    <Textarea
                      id="members_present"
                      value={formData.members_present}
                      onChange={(e) => handleChange('members_present', e.target.value)}
                      rows={3}
                      placeholder="Liste os IIr.·. presentes..."
                      disabled={!isEditable}
                    />
                    {attendances.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {attendances.length} presenças confirmadas nesta data
                      </p>
                    )}
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
                <Button type="submit" disabled={isLoading || !selectedLodgeId}>
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
