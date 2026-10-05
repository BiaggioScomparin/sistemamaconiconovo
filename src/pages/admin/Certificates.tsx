import { useState, useRef, useMemo } from 'react';
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
  Printer, 
  User, 
  Sparkles, 
  QrCode as QrIcon, 
  Search, 
  CheckCircle2,
  Sliders,
  RefreshCw
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
  status?: string | null;
  member_status?: string | null;
  lodges?: {
    name: string;
    number: string;
  } | null;
}

export default function Certificates() {
  const { toast } = useToast();
  const certificateRef = useRef<HTMLDivElement>(null);

  // Form state - Dynamic values
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [degreeType, setDegreeType] = useState<'mestre' | 'companheiro' | 'aprendiz'>('mestre');
  const [memberName, setMemberName] = useState<string>('CRISTIANO RODRIGUES RIBEIRO');
  const [eventDate, setEventDate] = useState<string>('31/08/2026');
  const [lodgeName, setLodgeName] = useState<string>('A.R.L.S Lealdade e Justiça Nº 001');
  const [ritoText, setRitoText] = useState<string>('REAA');

  // Controls
  const [showQRCode, setShowQRCode] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch registered members from database robustly
  const { data: members, isLoading: isLoadingMembers, refetch: refetchMembers } = useQuery({
    queryKey: ['members-for-certificates-robust'],
    queryFn: async () => {
      try {
        // 1. First try fetching profiles with lodges join
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, cim_number, degree, lodge_position, initiation_date, status, member_status, lodges(name, number)')
          .order('full_name', { ascending: true });

        if (!error && data && data.length > 0) {
          // Filter valid members (membro, active, approved, or anyone with a name)
          const valid = data.filter(
            (p) => p.full_name && (p.status === 'membro' || p.status === 'approved' || p.member_status === 'active' || !p.status)
          );
          return (valid.length > 0 ? valid : data) as Profile[];
        }
      } catch (err) {
        console.warn('Error fetching profiles with lodges join:', err);
      }

      // 2. Fallback: Fetch profiles directly without join if join failed
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('profiles')
        .select('id, full_name, cim_number, degree, lodge_position, initiation_date, status, member_status')
        .order('full_name', { ascending: true });

      if (fallbackError) throw fallbackError;
      return (fallbackData || []) as Profile[];
    },
  });

  // Filter members based on search
  const filteredMembers = useMemo(() => {
    if (!members) return [];
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        (m.full_name && m.full_name.toLowerCase().includes(q)) ||
        (m.cim_number && m.cim_number.includes(q)) ||
        (m.degree && m.degree.toLowerCase().includes(q))
    );
  }, [members, searchQuery]);

  // Automatic member data selection - NO MANUAL TYPING NEEDED!
  const handleSelectMember = (member: Profile) => {
    setSelectedMemberId(member.id);

    // 1. Automatic Name (Uppercase)
    if (member.full_name) {
      setMemberName(member.full_name.toUpperCase());
    }

    // 2. Automatic Degree Detection
    const currentDegree = (member.degree || '').toLowerCase();
    if (currentDegree.includes('mestre')) {
      setDegreeType('mestre');
    } else if (currentDegree.includes('companheiro')) {
      setDegreeType('companheiro');
    } else {
      setDegreeType('aprendiz');
    }

    // 3. Automatic Date (Formatted DD/MM/AAAA)
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

    // 4. Automatic Lodge Name (Formatted A.R.L.S ...)
    if (member.lodges && member.lodges.name) {
      setLodgeName(`A.R.L.S ${member.lodges.name} Nº ${member.lodges.number || '001'}`);
    } else {
      setLodgeName('A.R.L.S Lealdade e Justiça Nº 001');
    }

    toast({
      title: 'Irmão selecionado!',
      description: `Certificado preenchido automaticamente para ${member.full_name}.`,
    });
  };

  const handleDropdownSelect = (memberId: string) => {
    const m = members?.find((p) => p.id === memberId);
    if (m) handleSelectMember(m);
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
      const filename = `Certificado_${degreeType.toUpperCase()}_${memberName.replace(/\s+/g, '_')}.png`;
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

  const validationUrl = `${window.location.origin}/validar/${selectedMemberId || 'cert'}`;

  // Grau dynamic texts
  const grauTitle = degreeType === 'mestre' ? 'MESTRE MAÇOM' : degreeType === 'companheiro' ? 'COMPANHEIRO MAÇOM' : 'APRENDIZ MAÇOM';
  const grauAction = degreeType === 'mestre' ? 'exaltado' : degreeType === 'companheiro' ? 'elevado' : 'iniciado';
  const grauNumber = degreeType === 'mestre' ? 'grau 3 Mestre Maçom' : degreeType === 'companheiro' ? 'grau 2 Companheiro Maçom' : 'grau 1 Aprendiz Maçom';

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
                Emissão automática com fundo 100% transparente sobre o modelo oficial GOIB / SOGLIA
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
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    1. Selecionar Irmão Cadastrado
                  </CardTitle>
                  <CardDescription>
                    Selecione um irmão para preencher automaticamente
                  </CardDescription>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7" 
                  onClick={() => refetchMembers()}
                  title="Recarregar membros"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Select Dropdown */}
                <div className="space-y-1">
                  <Label className="text-xs">Menu suspenso de membros</Label>
                  <Select value={selectedMemberId} onValueChange={handleDropdownSelect}>
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Escolha um membro cadastrado..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {isLoadingMembers ? (
                        <SelectItem value="loading" disabled>Carregando membros...</SelectItem>
                      ) : members && members.length > 0 ? (
                        members.map((m) => (
                          <SelectItem key={m.id} value={m.id} className="text-xs">
                            {m.full_name} {m.cim_number ? `(CIM: ${m.cim_number})` : ''}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>Nenhum membro encontrado</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Search Input for Quick Filter */}
                <div className="space-y-1 pt-1">
                  <Label className="text-xs">Ou digite no campo de busca:</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou CIM..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 text-xs"
                    />
                  </div>
                </div>

                {/* Member Selector List */}
                <div className="max-h-48 overflow-y-auto space-y-1 rounded-md border p-1 bg-muted/20">
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

            {/* Customization Inspector */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-primary" />
                  2. Dados do Certificado
                </CardTitle>
                <CardDescription>
                  Campos sobrepostos no modelo de certificado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {/* Degree Selector */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Grau do Certificado</Label>
                  <div className="grid grid-cols-3 gap-1">
                    <Button
                      size="sm"
                      variant={degreeType === 'mestre' ? 'default' : 'outline'}
                      className={`h-8 text-xs ${degreeType === 'mestre' ? 'bg-amber-600' : ''}`}
                      onClick={() => setDegreeType('mestre')}
                    >
                      Mestre
                    </Button>
                    <Button
                      size="sm"
                      variant={degreeType === 'companheiro' ? 'default' : 'outline'}
                      className="h-8 text-xs"
                      onClick={() => setDegreeType('companheiro')}
                    >
                      Companheiro
                    </Button>
                    <Button
                      size="sm"
                      variant={degreeType === 'aprendiz' ? 'default' : 'outline'}
                      className="h-8 text-xs"
                      onClick={() => setDegreeType('aprendiz')}
                    >
                      Aprendiz
                    </Button>
                  </div>
                </div>

                {/* Field 1: Nome do Irmão */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    Nome do Irmão (Caixa Alta)
                  </Label>
                  <Input
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value.toUpperCase())}
                    placeholder="CRISTIANO RODRIGUES RIBEIRO"
                    className="font-semibold text-amber-900 dark:text-amber-200"
                  />
                </div>

                {/* Field 2: Rito & Data */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Rito</Label>
                    <Input
                      value={ritoText}
                      onChange={(e) => setRitoText(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Data do Evento</Label>
                    <Input
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Field 3: Nome da Loja */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Nome da Loja e Número</Label>
                  <Input
                    value={lodgeName}
                    onChange={(e) => setLodgeName(e.target.value)}
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
                  <CardTitle className="text-sm font-semibold">Pré-visualização em Fundo Transparente</CardTitle>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">Modelo Limpo HD • Sem Caixas Brancas</span>
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
                    {/* Clean Background Template Image */}
                    <img
                      src="/certificate_mestre_template.png"
                      alt="Certificado Modelo Limpo"
                      className="absolute inset-0 w-full h-full object-fill pointer-events-none"
                    />

                    {/* DYNAMIC TRANSPARENT TEXT OVERLAYS */}
                    <div className="absolute inset-0 flex flex-col justify-between p-[6%] text-center z-10">
                      
                      {/* Sub-header Block: MESTRE MAÇOM & Certifico... */}
                      <div className="pt-[23.5%] space-y-1">
                        <p 
                          className="text-[1.85vw] lg:text-[18.5px] tracking-[0.25em] font-serif text-slate-800 uppercase font-semibold leading-none"
                          style={{ fontFamily: "'Cinzel', 'Times New Roman', Georgia, serif" }}
                        >
                          {grauTitle}
                        </p>
                        <p className="text-[1.4vw] lg:text-[14px] font-sans text-slate-600 italic tracking-wide pt-1">
                          Certifico que o Ir.'.
                        </p>
                      </div>

                      {/* Member Name Block (100% Transparent Background over Watermark) */}
                      <div className="my-auto py-[1%]">
                        <h2 
                          className="text-[3.2vw] lg:text-[32px] font-bold tracking-[0.08em] px-4 leading-tight uppercase bg-transparent"
                          style={{ 
                            color: '#b38738',
                            fontFamily: "'Times New Roman', Times, Georgia, serif",
                            textShadow: '0.3px 0.3px 0.5px rgba(0,0,0,0.1)'
                          }}
                        >
                          {memberName || 'NOME DO IRMÃO'}
                        </h2>
                      </div>

                      {/* Body Text Block (100% Transparent Background over Watermark) */}
                      <div className="pb-[18%]">
                        <p className="text-[1.45vw] lg:text-[14.5px] font-sans text-slate-800 max-w-[85%] mx-auto leading-relaxed font-normal bg-transparent">
                          Foi {grauAction} ao {grauNumber} no {ritoText} na data de{' '}
                          <span className="font-semibold text-slate-950">{eventDate}</span> E.:V e Membro efetivo da{' '}
                          <span className="font-semibold text-slate-950">{lodgeName}</span>
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
                </div>
              </CardContent>
            </Card>

            {/* Quick Action Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200">
                <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  O certificado será exportado em alta resolução sem blocos brancos, integrado à marca d'água original.
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
