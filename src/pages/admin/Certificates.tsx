import { useState, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Award, 
  Download, 
  Printer, 
  User, 
  Sparkles, 
  QrCode as QrIcon, 
  Search, 
  Check, 
  Sliders,
  CheckCircle2
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

  // Form state - Dynamic values replacing (NOME DO IRMÃO), (data do Evento), (nome da Loja)
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [memberName, setMemberName] = useState<string>('CRISTIANO RODRIGUES RIBEIRO');
  const [eventDate, setEventDate] = useState<string>('31/08/2026');
  const [lodgeName, setLodgeName] = useState<string>('A.R.L.S Lealdade e Justiça Nº 001');

  // Controls
  const [showQRCode, setShowQRCode] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch registered members from database
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

  // Filter members based on search
  const filteredMembers = useMemo(() => {
    if (!members) return [];
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.full_name.toLowerCase().includes(q) ||
        (m.cim_number && m.cim_number.includes(q)) ||
        (m.degree && m.degree.toLowerCase().includes(q))
    );
  }, [members, searchQuery]);

  // Automatic member data selection - NO MANUAL TYPING NEEDED!
  const handleSelectMember = (member: Profile) => {
    setSelectedMemberId(member.id);

    // 1. Automatic Name (Uppercase, no parentheses)
    setMemberName(member.full_name.toUpperCase());

    // 2. Automatic Date (Formatted DD/MM/AAAA, no parentheses)
    if (member.initiation_date) {
      try {
        const dateObj = new Date(member.initiation_date);
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        setEventDate(`${day}/${month}/${year}`);
      } catch (e) {
        setEventDate('31/08/2026');
      }
    } else {
      setEventDate('31/08/2026');
    }

    // 3. Automatic Lodge Name (Formatted A.R.L.S ..., no parentheses)
    if (member.lodges) {
      setLodgeName(`A.R.L.S ${member.lodges.name} Nº ${member.lodges.number || '001'}`);
    } else {
      setLodgeName('A.R.L.S Lealdade e Justiça Nº 001');
    }

    toast({
      title: 'Irmão selecionado!',
      description: `Certificado preenchido automaticamente para ${member.full_name}.`,
    });
  };

  // Export PNG in HD (4K / 300 DPI)
  const handleDownloadPNG = async () => {
    if (!certificateRef.current) return;
    try {
      setIsExporting(true);
      toast({
        title: 'Gerando certificado em Alta Definição (PNG 4K)...',
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
      const filename = `Certificado_Mestre_${memberName.replace(/\s+/g, '_')}.png`;
      link.download = filename;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();

      toast({
        title: 'Certificado baixado!',
        description: 'A imagem HD foi salva com sucesso.',
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
        title: 'Gerando PDF oficial para impressão...',
        description: 'Formatando o documento em A4 Paisagem HD.',
      });

      const canvas = await html2canvas(certificateRef.current, {
        scale: 3.5,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
      const filename = `Certificado_Mestre_${memberName.replace(/\s+/g, '_')}.pdf`;
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
              <h1 className="text-2xl font-bold tracking-tight">Gerador de Certificados Mestre Maçom</h1>
              <p className="text-sm text-muted-foreground">
                Selecione o irmão cadastrado para preenchimento automático instantâneo (sem parênteses)
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
          {/* Controls Panel (4 Cols) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Auto-Search Member Card */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  1. Buscar Irmão Cadastrado
                </CardTitle>
                <CardDescription>
                  Clique no nome do membro para preencher todos os dados automaticamente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Digite o nome do irmão ou CIM..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Member Selector List */}
                <div className="max-h-56 overflow-y-auto space-y-1 rounded-md border p-1 bg-muted/20">
                  {isLoadingMembers ? (
                    <p className="text-xs text-center py-4 text-muted-foreground">Carregando membros...</p>
                  ) : filteredMembers.length > 0 ? (
                    filteredMembers.map((member) => {
                      const isSelected = selectedMemberId === member.id;
                      return (
                        <div
                          key={member.id}
                          onClick={() => handleSelectMember(member)}
                          className={`flex items-center justify-between p-2 rounded-md text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-amber-500/20 text-amber-900 dark:text-amber-200 font-semibold border border-amber-500/30'
                              : 'hover:bg-accent/60 text-foreground'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="truncate font-medium">{member.full_name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              CIM: {member.cim_number || 'N/A'} {member.degree ? `• ${member.degree}` : ''}
                            </p>
                          </div>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0" />}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-center py-4 text-muted-foreground">Nenhum membro encontrado.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Dynamic Fields Inspector */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-primary" />
                  2. Campos Substituídos no Modelo
                </CardTitle>
                <CardDescription>
                  Estes valores substituem as áreas de (parênteses) no modelo oficial:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {/* Field 1: Nome do Irmão */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    Substitui (NOME DO IRMÃO)
                  </Label>
                  <Input
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value.toUpperCase())}
                    placeholder="CRISTIANO RODRIGUES RIBEIRO"
                    className="font-semibold text-amber-900 dark:text-amber-200"
                  />
                </div>

                {/* Field 2: Data do Evento */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    Substitui (data do Evento)
                  </Label>
                  <Input
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    placeholder="31/08/2026"
                  />
                </div>

                {/* Field 3: Nome da Loja */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    Substitui (nome da Loja)
                  </Label>
                  <Input
                    value={lodgeName}
                    onChange={(e) => setLodgeName(e.target.value)}
                    placeholder="A.R.L.S Lealdade e Justiça Nº 001"
                  />
                </div>

                {/* QR Code toggle */}
                <div className="pt-3 border-t flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <QrIcon className="h-3.5 w-3.5 text-primary" /> QR Code de Autenticidade
                    </Label>
                    <p className="text-[10px] text-muted-foreground">Exibe selo de validação pública GOIB</p>
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
            <Card className="border border-border/80 shadow-xl overflow-hidden bg-slate-900/5 dark:bg-slate-950">
              <CardHeader className="py-3 px-4 bg-muted/40 border-b flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-sm font-semibold">Pré-visualização do Certificado Final</CardTitle>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">Alta Definição • Sem Parênteses</span>
              </CardHeader>

              <CardContent className="p-3 sm:p-6 flex items-center justify-center overflow-x-auto">
                {/* CANVAS WORKSPACE (Aspect Ratio 1.414:1 - A4 Landscape) */}
                <div className="w-full max-w-[960px] shadow-2xl rounded-lg overflow-hidden border border-amber-500/30 bg-white text-slate-900">
                  <div
                    ref={certificateRef}
                    className="relative w-full aspect-[1.414/1] select-none overflow-hidden bg-white"
                    style={{
                      fontFamily: "'Playfair Display', 'Cinzel', 'Times New Roman', Georgia, serif",
                    }}
                  >
                    {/* Background Official Template Image with Signatures */}
                    <img
                      src="/certificate_mestre_template.png"
                      alt="Certificado Mestre Maçom Modelo Base"
                      className="absolute inset-0 w-full h-full object-fill pointer-events-none"
                    />

                    {/* OVERLAY DYNAMIC FIELD 1: NOME DO IRMÃO (Replaces (NOME DO IRMÃO)) */}
                    <div 
                      className="absolute left-1/2 -translate-x-1/2 top-[39.5%] w-[75%] text-center z-10 flex items-center justify-center"
                    >
                      {/* Masking Patch Box to erase underlying placeholder text */}
                      <div className="absolute inset-0 bg-[#fefdfb] shadow-sm rounded-md opacity-98" />
                      
                      <h2 
                        className="relative z-10 text-[3.2vw] lg:text-[32px] font-bold tracking-[0.08em] px-4 py-1 leading-none uppercase"
                        style={{ 
                          color: '#b38738',
                          fontFamily: "'Times New Roman', Times, Georgia, serif"
                        }}
                      >
                        {memberName || 'CRISTIANO RODRIGUES RIBEIRO'}
                      </h2>
                    </div>

                    {/* OVERLAY DYNAMIC FIELD 2 & 3: Line 2 (Replaces (data do Evento) and (nome da Loja)) */}
                    <div 
                      className="absolute left-1/2 -translate-x-1/2 top-[56.8%] w-[82%] text-center z-10 flex items-center justify-center"
                    >
                      {/* Masking Patch Box to erase underlying placeholder line */}
                      <div className="absolute inset-0 bg-[#fefdfb] shadow-sm rounded-md opacity-98" />

                      <p className="relative z-10 text-[1.4vw] lg:text-[14px] font-sans text-slate-800 leading-snug py-1 font-normal tracking-tight">
                        <span className="font-semibold text-slate-900">{eventDate || '31/08/2026'}</span> E.:V e Membro efetivo da{' '}
                        <span className="font-semibold text-slate-900">{lodgeName || 'A.R.L.S Lealdade e Justiça Nº 001'}</span>
                      </p>
                    </div>

                    {/* Optional Public QR Code Stamp at Bottom Center */}
                    {showQRCode && (
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-[3%] z-20 flex flex-col items-center">
                        <div className="p-1 bg-white rounded border border-amber-500/40 shadow-sm">
                          <QRCodeSVG value={validationUrl} size={38} level="M" />
                        </div>
                        <span className="text-[7.5px] font-mono text-slate-500 mt-0.5 uppercase tracking-tighter bg-white/80 px-1 rounded">
                          Autenticidade GOIB
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Action Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200">
                <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  O certificado será exportado em alta definição com as assinaturas oficiais do Grão-Mestrado.
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <Button 
                  onClick={handleDownloadPNG}
                  disabled={isExporting} 
                  className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white gap-1.5 text-xs font-medium"
                >
                  <Download className="h-3.5 w-3.5" /> Download PNG HD (4K)
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
