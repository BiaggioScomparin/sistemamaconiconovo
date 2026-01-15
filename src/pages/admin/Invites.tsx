import { useState, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLodges } from '@/hooks/useLodges';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Download, Mail, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

const SESSION_TYPES = [
  { value: 'ordinaria', label: 'Sessão Ordinária', hasNames: false },
  { value: 'magna_iniciacao', label: 'Sessão Magna de Iniciação', hasNames: true, nameLabel: 'Iniciandos' },
  { value: 'magna_elevacao', label: 'Sessão Magna de Elevação', hasNames: true, nameLabel: 'Companheiros a serem elevados' },
  { value: 'magna_exaltacao', label: 'Sessão Magna de Exaltação', hasNames: true, nameLabel: 'Mestres a serem exaltados' },
  { value: 'instalacao_posse', label: 'Sessão de Instalação e Posse', hasNames: true, nameLabel: 'Oficiais a serem empossados' },
  { value: 'publica', label: 'Sessão Pública', hasNames: false },
  { value: 'branca', label: 'Sessão Branca', hasNames: false },
  { value: 'funebre', label: 'Sessão Fúnebre', hasNames: false },
];

const LODGE_ADDRESS = 'Rua Paru, 175 - Vila Mazzei, São Paulo - SP, 02310-200';

export default function Invites() {
  const { data: lodges } = useLodges();
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState('20:00');
  const [lodgeId, setLodgeId] = useState('');
  const [sessionType, setSessionType] = useState('');
  const [names, setNames] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const inviteRef = useRef<HTMLDivElement>(null);

  const selectedLodge = lodges?.find(l => l.id === lodgeId);
  const selectedSessionType = SESSION_TYPES.find(t => t.value === sessionType);

  const canGenerate = date && time && lodgeId && sessionType;

  const getSessionTypeLabel = () => {
    return selectedSessionType?.label || '';
  };

  const getNamesArray = () => {
    return names.split('\n').map(n => n.trim()).filter(n => n.length > 0);
  };

  const formatDateFull = () => {
    if (!date) return '';
    return format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const handleDownload = async () => {
    if (!inviteRef.current) return;
    
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(inviteRef.current, {
        scale: 3,
        backgroundColor: null,
        useCORS: true,
      });
      
      const link = document.createElement('a');
      link.download = `convite_${selectedLodge?.name?.replace(/\s+/g, '_')}_${format(date!, 'yyyy-MM-dd')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success('Convite baixado com sucesso!');
    } catch (error) {
      console.error('Error generating invite:', error);
      toast.error('Erro ao gerar convite');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = () => {
    if (!canGenerate) {
      toast.error('Preencha todos os campos');
      return;
    }
    setShowPreview(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Mail className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Gerador de Convites</h1>
            <p className="text-muted-foreground">Crie convites visuais para as sessões da Loja</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Dados do Convite</CardTitle>
              <CardDescription>Preencha as informações para gerar o convite</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Loja</Label>
                <Select value={lodgeId} onValueChange={setLodgeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a Loja" />
                  </SelectTrigger>
                  <SelectContent>
                    {lodges?.map((lodge) => (
                      <SelectItem key={lodge.id} value={lodge.id}>
                        {lodge.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Sessão</Label>
                <Select value={sessionType} onValueChange={setSessionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {SESSION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data da Sessão</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, 'PPP', { locale: ptBR }) : 'Selecione a data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>

              {selectedSessionType?.hasNames && (
                <div className="space-y-2">
                  <Label>{selectedSessionType.nameLabel}</Label>
                  <Textarea
                    value={names}
                    onChange={(e) => setNames(e.target.value)}
                    placeholder="Digite um nome por linha"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Digite um nome por linha
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button onClick={handlePreview} disabled={!canGenerate} className="flex-1">
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizar
                </Button>
                {showPreview && (
                  <Button onClick={handleDownload} disabled={isGenerating} variant="secondary" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    {isGenerating ? 'Gerando...' : 'Baixar PNG'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Prévia do Convite</CardTitle>
              <CardDescription>Visualize o convite antes de baixar</CardDescription>
            </CardHeader>
            <CardContent>
              {showPreview && canGenerate ? (
                <div className="flex justify-center">
                  <div 
                    ref={inviteRef}
                    className="w-[400px] bg-gradient-to-br from-[#1a365d] via-[#2c5282] to-[#1a365d] rounded-lg overflow-hidden shadow-2xl"
                  >
                    {/* Header with logos */}
                    <div className="bg-[#0d1b2a] py-4 px-6 text-center border-b-2 border-[#c9a227]">
                      <div className="flex items-center justify-center gap-4 mb-2">
                        <img 
                          src="/images/logo-goib-edital.png" 
                          alt="Logo GOIB" 
                          className="h-14"
                        />
                        {(selectedLodge as any)?.logo_url && (
                          <img 
                            src={(selectedLodge as any).logo_url} 
                            alt={`Logo ${selectedLodge?.name}`}
                            className="h-14 object-contain"
                          />
                        )}
                      </div>
                      <p className="text-[#c9a227] text-xs tracking-widest font-medium">
                        GRANDE ORIENTE INDEPENDENTE DO BRASIL
                      </p>
                    </div>

                    {/* Main content */}
                    <div className="px-8 py-6 text-center">
                      <div className="border-2 border-[#c9a227]/30 rounded-lg p-6 bg-[#0d1b2a]/40">
                        <p className="text-[#c9a227] text-sm tracking-wider mb-4">
                          A∴R∴L∴S∴
                        </p>
                        <h2 className="text-white text-2xl font-bold mb-4 leading-tight">
                          {selectedLodge?.name}
                        </h2>
                        <p className="text-white/80 text-sm mb-6">
                          Oriente de {selectedLodge?.city} - {selectedLodge?.state}
                        </p>

                        <div className="h-px bg-gradient-to-r from-transparent via-[#c9a227] to-transparent my-6" />

                        <p className="text-white text-sm uppercase tracking-widest mb-2">
                          Convida para a
                        </p>
                        <h3 className="text-[#c9a227] text-xl font-bold mb-6">
                          {getSessionTypeLabel()}
                        </h3>

                        <div className="bg-[#c9a227]/10 rounded-lg p-4 mb-4">
                          <p className="text-white text-lg font-semibold capitalize">
                            {formatDateFull()}
                          </p>
                          <p className="text-[#c9a227] text-2xl font-bold mt-1">
                            às {time} horas
                          </p>
                        </div>

                        {/* Names section */}
                        {selectedSessionType?.hasNames && getNamesArray().length > 0 && (
                          <div className="mt-4 pt-4 border-t border-[#c9a227]/30">
                            <p className="text-[#c9a227] text-xs uppercase tracking-widest mb-3">
                              {selectedSessionType.nameLabel}
                            </p>
                            <div className="space-y-1">
                              {getNamesArray().map((name, index) => (
                                <p key={index} className="text-white text-sm font-medium">
                                  {name}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-[#0d1b2a] py-4 px-6 text-center border-t-2 border-[#c9a227]">
                      <p className="text-white/80 text-xs mb-2">
                        {LODGE_ADDRESS}
                      </p>
                      <p className="text-white/80 text-xs">
                        Traje Maçônico • Aguardamos a presença de todos
                      </p>
                      <p className="text-[#c9a227] text-xs mt-2 tracking-wider">
                        ✧ LIBERDADE • IGUALDADE • FRATERNIDADE ✧
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[500px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                  <p>Preencha os dados e clique em "Visualizar"</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
