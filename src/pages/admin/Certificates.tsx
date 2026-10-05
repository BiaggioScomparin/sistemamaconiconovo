import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Award, 
  Download, 
  FileText, 
  Printer, 
  User, 
  Sparkles, 
  QrCode as QrIcon, 
  Search, 
  Check, 
  RefreshCw,
  Sliders
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Profile {
  id: string;
  full_name: string;
  cim_number: string | null;
  degree: string | null;
  lodge_position: string | null;
  initiation_date: string | null;
  lodges?: {
    name: string;
    number: string;
  } | null;
}

export default function Certificates() {
  const { toast } = useToast();
  const certificateRef = useRef<HTMLDivElement>(null);

  // Form state
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [degreeType, setDegreeType] = useState<'mestre' | 'companheiro' | 'aprendiz'>('mestre');
  const [memberName, setMemberName] = useState<string>('CRISTIANO RODRIGUES RIBEIRO');
  const [ritoText, setRitoText] = useState<string>('REAA');
  const [eventDate, setEventDate] = useState<string>('31/08/2026 E.:V');
  const [lodgeName, setLodgeName] = useState<string>('A.R.L.S Lealdade e Justiça Nº 001');
  const [grauNumberText, setGrauNumberText] = useState<string>('grau 3 Mestre Maçom');
  const [grauActionText, setGrauActionText] = useState<string>('exaltado');
  
  // Signature settings
  const [graoMestreGeral, setGraoMestreGeral] = useState<string>('SILVIO R. ZAMBRINI');
  const [graoMestreAdjunto, setGraoMestreAdjunto] = useState<string>('BIAGGIO SCOMPARIN');
  const [showQRCode, setShowQRCode] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [searchMember, setSearchMember] = useState<string>('');

  // Fetch profiles for auto-fill
  const { data: members, isLoading: isLoadingMembers } = useQuery({
    queryKey: ['members-for-certificates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, cim_number, degree, lodge_position, initiation_date, lodges(name, number)')
        .eq('status', 'membro')
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data as Profile[];
    },
  });

  // Handle member selection
  const handleSelectMember = (memberId: string) => {
    setSelectedMemberId(memberId);
    const member = members?.find((m) => m.id === memberId);
    if (!member) return;

    setMemberName(member.full_name.toUpperCase());

    // Format Lodge Name
    if (member.lodges) {
      setLodgeName(`A.R.L.S ${member.lodges.name} Nº ${member.lodges.number || '001'}`);
    }

    // Format Degree defaults
    const currentDegree = (member.degree || '').toLowerCase();
    if (currentDegree.includes('mestre')) {
      setDegreeType('mestre');
      setGrauNumberText('grau 3 Mestre Maçom');
      setGrauActionText('exaltado');
    } else if (currentDegree.includes('companheiro')) {
      setDegreeType('companheiro');
      setGrauNumberText('grau 2 Companheiro Maçom');
      setGrauActionText('elevado');
    } else {
      setDegreeType('aprendiz');
      setGrauNumberText('grau 1 Aprendiz Maçom');
      setGrauActionText('iniciado');
    }

    // Format Initiation / Event date if available
    if (member.initiation_date) {
      try {
        const dateObj = new Date(member.initiation_date);
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        setEventDate(`${day}/${month}/${year} E.:V`);
      } catch (e) {
        console.error('Error formatting date:', e);
      }
    }

    toast({
      title: 'Dados carregados!',
      description: `Certificado preenchido para ${member.full_name}.`,
    });
  };

  // Change degree preset manually
  const handleDegreePresetChange = (type: 'mestre' | 'companheiro' | 'aprendiz') => {
    setDegreeType(type);
    if (type === 'mestre') {
      setGrauNumberText('grau 3 Mestre Maçom');
      setGrauActionText('exaltado');
    } else if (type === 'companheiro') {
      setGrauNumberText('grau 2 Companheiro Maçom');
      setGrauActionText('elevado');
    } else {
      setGrauNumberText('grau 1 Aprendiz Maçom');
      setGrauActionText('iniciado');
    }
  };

  // Export PNG in HD (4K / 300 DPI)
  const handleDownloadPNG = async () => {
    if (!certificateRef.current) return;
    try {
      setIsExporting(true);
      toast({
        title: 'Gerando certificado em Alta Definição...',
        description: 'Por favor, aguarde alguns segundos.',
      });

      const canvas = await html2canvas(certificateRef.current, {
        scale: 3.5, // 3.5x Ultra HD resolution
        backgroundColor: null,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      const link = document.createElement('a');
      const filename = `Certificado_${degreeType.toUpperCase()}_${memberName.replace(/\s+/g, '_')}.png`;
      link.download = filename;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();

      toast({
        title: 'Certificado baixado!',
        description: 'A imagem HD foi salva na sua pasta de downloads.',
      });
    } catch (error: any) {
      console.error('Error exporting PNG:', error);
      toast({
        title: 'Erro ao gerar imagem',
        description: error.message || 'Ocorreu um erro ao processar o certificado.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Export PDF Vector / Print
  const handleDownloadPDF = async () => {
    if (!certificateRef.current) return;
    try {
      setIsExporting(true);
      toast({
        title: 'Gerando PDF para impressão...',
        description: 'Formatando o documento em alta resolução A4 Paisagem.',
      });

      const canvas = await html2canvas(certificateRef.current, {
        scale: 3.5,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      
      // A4 Landscape dimensions in mm: 297 x 210
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
      const filename = `Certificado_${degreeType.toUpperCase()}_${memberName.replace(/\s+/g, '_')}.pdf`;
      pdf.save(filename);

      toast({
        title: 'PDF gerado com sucesso!',
        description: 'O arquivo PDF pronto para impressão foi baixado.',
      });
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'Erro ao gerar PDF',
        description: error.message || 'Ocorreu um erro ao exportar o PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const filteredMembers = members?.filter((m) =>
    m.full_name.toLowerCase().includes(searchMember.toLowerCase()) ||
    (m.cim_number && m.cim_number.includes(searchMember))
  );

  const validationUrl = `${window.location.origin}/validar/${selectedMemberId || 'cert'}`;

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6 max-w-7xl px-3 sm:px-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Award className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Gerador de Certificados Maçônicos</h1>
              <p className="text-sm text-muted-foreground">
                Emissão automática em alta definição (HD 4K) baseada nos modelos oficiais GOIB / SOGLIA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="gap-2 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
            >
              <Printer className="h-4 w-4" />
              {isExporting ? 'Processando...' : 'Baixar PDF'}
            </Button>
            <Button
              onClick={handleDownloadPNG}
              disabled={isExporting}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium"
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Processando...' : 'Baixar Imagem HD (PNG)'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form & Controls Panel (4 Cols) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Member Selection Card */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  1. Selecionar Irmão Cadastrado
                </CardTitle>
                <CardDescription>
                  Puxe os dados automáticos do cadastro do membro
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Buscar e selecionar membro</Label>
                  <Select value={selectedMemberId} onValueChange={handleSelectMember}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Escolha um irmão da lista..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {isLoadingMembers ? (
                        <SelectItem value="loading" disabled>Carregando membros...</SelectItem>
                      ) : (
                        members?.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.full_name} {m.degree ? `(${m.degree})` : ''}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>Grau do Modelo:</span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant={degreeType === 'mestre' ? 'default' : 'outline'}
                      className={`h-7 text-[11px] px-2 ${degreeType === 'mestre' ? 'bg-amber-600' : ''}`}
                      onClick={() => handleDegreePresetChange('mestre')}
                    >
                      Mestre
                    </Button>
                    <Button
                      size="sm"
                      variant={degreeType === 'companheiro' ? 'default' : 'outline'}
                      className="h-7 text-[11px] px-2"
                      onClick={() => handleDegreePresetChange('companheiro')}
                    >
                      Comp.
                    </Button>
                    <Button
                      size="sm"
                      variant={degreeType === 'aprendiz' ? 'default' : 'outline'}
                      className="h-7 text-[11px] px-2"
                      onClick={() => handleDegreePresetChange('aprendiz')}
                    >
                      Aprendiz
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customization Form Card */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-primary" />
                  2. Personalizar Textos do Certificado
                </CardTitle>
                <CardDescription>
                  Ajuste o nome, datas e instâncias emitentes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5 text-xs">
                {/* Nome do Irmão */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Nome do Irmão (Caixa Alta)</Label>
                  <Input
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value.toUpperCase())}
                    placeholder="NOME COMPLETO"
                  />
                </div>

                {/* Ação e Grau */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Ação do Grau</Label>
                    <Input
                      value={grauActionText}
                      onChange={(e) => setGrauActionText(e.target.value)}
                      placeholder="exaltado / elevado / iniciado"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Nome do Grau</Label>
                    <Input
                      value={grauNumberText}
                      onChange={(e) => setGrauNumberText(e.target.value)}
                      placeholder="grau 3 Mestre Maçom"
                    />
                  </div>
                </div>

                {/* Rito e Data */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Rito</Label>
                    <Input
                      value={ritoText}
                      onChange={(e) => setRitoText(e.target.value)}
                      placeholder="REAA"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Data (E.:V)</Label>
                    <Input
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      placeholder="31/08/2026 E.:V"
                    />
                  </div>
                </div>

                {/* Nome da Loja */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Loja e Número</Label>
                  <Input
                    value={lodgeName}
                    onChange={(e) => setLodgeName(e.target.value)}
                    placeholder="A.R.L.S Lealdade e Justiça Nº 001"
                  />
                </div>

                {/* Assinaturas */}
                <div className="pt-2 border-t space-y-2">
                  <p className="font-semibold text-xs text-foreground">Signatários Oficiais</p>
                  
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Grão-Mestre Geral</Label>
                    <Input
                      value={graoMestreGeral}
                      onChange={(e) => setGraoMestreGeral(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Grão-Mestre Adjunto</Label>
                    <Input
                      value={graoMestreAdjunto}
                      onChange={(e) => setGraoMestreAdjunto(e.target.value)}
                    />
                  </div>
                </div>

                {/* QR Code toggle */}
                <div className="pt-2 border-t flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <QrIcon className="h-3.5 w-3.5 text-primary" /> QR Code de Autenticidade
                    </Label>
                    <p className="text-[10px] text-muted-foreground">Exibe código para validação online</p>
                  </div>
                  <Switch
                    checked={showQRCode}
                    onCheckedChange={setShowQRCode}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Certificate Live Canvas Preview (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            <Card className="border border-border/80 shadow-lg overflow-hidden bg-slate-900/5 dark:bg-slate-950">
              <CardHeader className="py-3 px-4 bg-muted/40 border-b flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-sm font-semibold">Pré-visualização do Certificado Oficial</CardTitle>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">Modelo HD • Proporção A4 Paisagem</span>
              </CardHeader>

              <CardContent className="p-3 sm:p-6 flex items-center justify-center overflow-x-auto">
                {/* CANVAS WORKSPACE (Aspect Ratio 1.414:1 - A4 Landscape) */}
                <div className="w-full max-w-[960px] shadow-2xl rounded-lg overflow-hidden border border-amber-500/20 bg-white text-slate-900">
                  <div
                    ref={certificateRef}
                    className="relative w-full aspect-[1.414/1] select-none overflow-hidden bg-white"
                    style={{
                      fontFamily: "'Playfair Display', 'Cinzel', 'Times New Roman', Georgia, serif",
                    }}
                  >
                    {/* Background Official Template Image */}
                    <img
                      src="/certificate_mestre_template.png"
                      alt="Certificado Mestre Maçom Template"
                      className="absolute inset-0 w-full h-full object-fill pointer-events-none"
                    />

                    {/* OVERLAY DYNAMIC TEXT FIELDS */}
                    <div className="absolute inset-0 flex flex-col justify-between p-[6%] text-center z-10">
                      {/* Top Header Block */}
                      <div className="pt-[5%] space-y-1">
                        <h1 
                          className="text-[4.2vw] lg:text-[42px] font-bold tracking-[0.18em] leading-none"
                          style={{ 
                            color: '#b38738', 
                            textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.15)',
                            fontFamily: "'Cinzel', 'Times New Roman', Georgia, serif"
                          }}
                        >
                          CERTIFICADO
                        </h1>
                        <p className="text-[1.8vw] lg:text-[18px] tracking-[0.25em] font-serif text-slate-800 uppercase font-semibold">
                          {degreeType === 'mestre' ? 'MESTRE MAÇOM' : degreeType === 'companheiro' ? 'COMPANHEIRO MAÇOM' : 'APRENDIZ MAÇOM'}
                        </p>
                        <p className="text-[1.4vw] lg:text-[14px] font-sans text-slate-600 italic tracking-wide pt-1">
                          Certifico que o Ir.'.
                        </p>
                      </div>

                      {/* Member Name Block */}
                      <div className="my-auto py-[2%]">
                        <h2 
                          className="text-[3.2vw] lg:text-[32px] font-bold tracking-[0.1em] px-6 leading-tight uppercase"
                          style={{ 
                            color: '#b38738',
                            fontFamily: "'Times New Roman', Times, serif"
                          }}
                        >
                          {memberName || 'NOME DO IRMÃO'}
                        </h2>

                        {/* Description Text */}
                        <p className="text-[1.5vw] lg:text-[15px] font-sans text-slate-700 max-w-[82%] mx-auto leading-relaxed mt-4 font-normal">
                          Foi {grauActionText} ao {grauNumberText} no {ritoText} na data de{' '}
                          <span className="font-semibold text-slate-900">{eventDate}</span> e Membro efetivo da{' '}
                          <span className="font-semibold text-slate-900">{lodgeName}</span>
                        </p>
                      </div>

                      {/* Bottom Signatures Block */}
                      <div className="pb-[4%] grid grid-cols-2 gap-8 items-end px-[8%] relative">
                        {/* Left Signatory */}
                        <div className="text-center">
                          <div className="w-[85%] mx-auto border-t border-slate-700/60 mb-1.5" />
                          <p className="text-[1.3vw] lg:text-[13px] font-bold tracking-wider text-slate-900 font-sans uppercase">
                            {graoMestreGeral}
                          </p>
                          <p className="text-[1.1vw] lg:text-[11px] font-sans text-slate-600 tracking-widest font-semibold uppercase">
                            GRÃO MESTRE GERAL
                          </p>
                        </div>

                        {/* Right Signatory */}
                        <div className="text-center">
                          <div className="w-[85%] mx-auto border-t border-slate-700/60 mb-1.5" />
                          <p className="text-[1.3vw] lg:text-[13px] font-bold tracking-wider text-slate-900 font-sans uppercase">
                            {graoMestreAdjunto}
                          </p>
                          <p className="text-[1.1vw] lg:text-[11px] font-sans text-slate-600 tracking-widest font-semibold uppercase">
                            GRÃO MESTRE ADJUNTO
                          </p>
                        </div>

                        {/* Public QR Code watermark in center bottom */}
                        {showQRCode && (
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-[5%] flex flex-col items-center">
                            <div className="p-1 bg-white rounded border border-amber-500/40 shadow-sm">
                              <QRCodeSVG value={validationUrl} size={42} level="M" />
                            </div>
                            <span className="text-[8px] font-mono text-slate-400 mt-0.5 uppercase tracking-tighter">
                              Autenticidade GOIB
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Action Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  O certificado será exportado sem marca d'água no tamanho original com alta precisão de impressão.
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <Button 
                  onClick={handleDownloadPNG}
                  disabled={isExporting} 
                  className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white gap-1.5 text-xs"
                >
                  <Download className="h-3.5 w-3.5" /> Download PNG HD
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
