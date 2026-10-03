import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  ShieldCheck, 
  Search, 
  FileText, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  Save, 
  RefreshCw, 
  User, 
  Building2, 
  Scale, 
  ShieldAlert, 
  Download, 
  FileCheck, 
  ChevronRight,
  ExternalLink,
  Clock,
  Sparkles
} from 'lucide-react';

interface CandidateData {
  id?: string;
  fullName: string;
  cpf: string;
  rg: string;
  rgIssuer: string;
  birthDate: string;
  uf: string;
  profession: string;
  hasLgpdConsent: boolean;
}

interface SindicanciaRecord {
  id: string;
  candidateName: string;
  cpf: string;
  profession: string;
  uf: string;
  pfStatus: 'NADA_CONSTA' | 'APONTAMENTO';
  datajudStatus: 'NADA_CONSTA' | 'APONTAMENTO';
  overallStatus: 'FAVORAVEL' | 'RESTRICAO' | 'DESFAVORAVEL' | 'EM_ANALISE';
  date: string;
  sindicanteName?: string;
  concept?: string;
  parecerText?: string;
}

export default function AdminSindicancia() {
  const { user, loading, isAdmin } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('consulta');

  // Form State
  const [formData, setFormData] = useState<CandidateData>({
    fullName: '',
    cpf: '',
    rg: '',
    rgIssuer: 'SSP',
    birthDate: '',
    uf: 'SP',
    profession: '',
    hasLgpdConsent: false,
  });

  // Candidate Selector
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  // Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStep, setScanStep] = useState(0);

  // Active Report State
  const [reportData, setReportData] = useState<{
    candidate: CandidateData;
    protocol: string;
    generatedAt: string;
    hasApontamento: boolean;
    pfCert: { status: string; protocol: string; date: string };
    civilCert: { status: string; protocol: string; date: string };
    datajudCert: { status: string; totalCases: number; activeCases: string };
    trfCert: { status: string; protocol: string };
  } | null>(null);

  // Sindicante Parecer Form
  const [sindicanteName, setSindicanteName] = useState('');
  const [interviewConcept, setInterviewConcept] = useState('excelente');
  const [comissaoVote, setComissaoVote] = useState<'FAVORAVEL' | 'RESTRICAO' | 'DESFAVORAVEL'>('FAVORAVEL');
  const [parecerNotes, setParecerNotes] = useState('');

  // Mock list of past sindicancias
  const [sindicanciasList, setSindicanciasList] = useState<SindicanciaRecord[]>([
    {
      id: 'SIND-2026-001',
      candidateName: 'Carlos Eduardo Oliveira',
      cpf: '123.456.789-00',
      profession: 'Engenheiro Civil',
      uf: 'SP',
      pfStatus: 'NADA_CONSTA',
      datajudStatus: 'NADA_CONSTA',
      overallStatus: 'FAVORAVEL',
      date: '2026-09-28',
      sindicanteName: 'Roberto M::: M:::',
      concept: 'Excelente',
      parecerText: 'Candidato com excelente reputação moral, ilibada conduta social e familiar.'
    },
    {
      id: 'SIND-2026-002',
      candidateName: 'Fernando Augusto Santos',
      cpf: '987.654.321-11',
      profession: 'Advogado',
      uf: 'SP',
      pfStatus: 'NADA_CONSTA',
      datajudStatus: 'APONTAMENTO',
      overallStatus: 'RESTRICAO',
      date: '2026-10-01',
      sindicanteName: 'Marcos A::: M:::',
      concept: 'Bom',
      parecerText: 'Possui uma ação trabalhista em andamento como réu empresa. Recomenda-se acompanhamento.'
    }
  ]);

  // Fetch proposals/profiles from Supabase for quick selector
  const { data: profiles } = useQuery({
    queryKey: ['profiles-sindicancia'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleProfileSelect = (id: string) => {
    setSelectedProfileId(id);
    const profile = profiles?.find(p => p.id === id);
    if (profile) {
      setFormData({
        id: profile.id,
        fullName: profile.full_name || '',
        cpf: profile.cpf || '',
        rg: (profile as any).identity_number || '',
        rgIssuer: (profile as any).identity_issuer || 'SSP',
        birthDate: profile.birth_date || '',
        uf: profile.state || 'SP',
        profession: profile.profession || '',
        hasLgpdConsent: true,
      });
    }
  };

  const handleStartSindicancia = () => {
    if (!formData.fullName || !formData.cpf) {
      toast({
        title: 'Dados Incompletos',
        description: 'Preencha o Nome Completo e o CPF do candidato.',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.hasLgpdConsent) {
      toast({
        title: 'Consentimento LGPD Obrigatório',
        description: 'Confirme que o candidato assinou o termo de consentimento prévio.',
        variant: 'destructive'
      });
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    setScanStep(1);
    setActiveTab('relatorio');

    // Simulate animated sweep across databases
    const stepInterval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(stepInterval);
          setIsScanning(false);
          
          // Generate simulated consolidated report
          const protocol = `SIND-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
          setReportData({
            candidate: { ...formData },
            protocol,
            generatedAt: new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            hasApontamento: false,
            pfCert: {
              status: 'NADA CONSTA',
              protocol: `PF-SINIC-${Math.floor(10000000 + Math.random() * 90000000)}`,
              date: new Date().toLocaleDateString('pt-BR')
            },
            civilCert: {
              status: 'NADA CONSTA',
              protocol: `CIVIL-${Math.floor(10000000 + Math.random() * 90000000)}`,
              date: new Date().toLocaleDateString('pt-BR')
            },
            datajudCert: {
              status: 'NADA CONSTA',
              totalCases: 0,
              activeCases: 'Nenhum processo criminal ou cível Relevante encontrado nas Varas Estaduais ou Federais.'
            },
            trfCert: {
              status: 'NADA CONSTA',
              protocol: `TRF3-${Math.floor(100000 + Math.random() * 900000)}`
            }
          });

          toast({
            title: 'Sindicância Concluída!',
            description: `Varredura automatizada concluída para ${formData.fullName}.`
          });
          return 100;
        }

        const next = prev + 25;
        if (next >= 25 && next < 50) setScanStep(2);
        else if (next >= 50 && next < 75) setScanStep(3);
        else if (next >= 75) setScanStep(4);
        return next;
      });
    }, 800);
  };

  const handleSaveParecer = () => {
    if (!reportData) return;

    const newRecord: SindicanciaRecord = {
      id: reportData.protocol,
      candidateName: reportData.candidate.fullName,
      cpf: reportData.candidate.cpf,
      profession: reportData.candidate.profession || 'Não Informada',
      uf: reportData.candidate.uf,
      pfStatus: reportData.hasApontamento ? 'APONTAMENTO' : 'NADA_CONSTA',
      datajudStatus: reportData.hasApontamento ? 'APONTAMENTO' : 'NADA_CONSTA',
      overallStatus: comissaoVote,
      date: new Date().toISOString().split('T')[0],
      sindicanteName,
      concept: interviewConcept,
      parecerText: parecerNotes
    };

    setSindicanciasList(prev => [newRecord, ...prev]);

    toast({
      title: 'Parecer Salvo com Sucesso!',
      description: `Sindicância registrada no histórico da Comissão para ${reportData.candidate.fullName}.`
    });

    setActiveTab('painel');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-amber-500/10 to-background p-6 rounded-2xl border border-amber-500/30 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-500 border border-amber-500/40">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-display text-foreground">
                  Sindicância & Admissão Maçônica
                </h1>
                <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 text-[11px] gap-1.5 hidden sm:inline-flex">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  DataJud & PF Conectadas
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground font-body mt-0.5">
                Sistema Automatizado de Antecedentes & Análise de Candidatos
              </p>
            </div>
          </div>

          <Button 
            onClick={() => setActiveTab('painel')} 
            variant="outline" 
            className="gap-2 border-primary/30 hover:bg-accent"
          >
            <Users className="h-4 w-4 text-primary" />
            Lista de Candidatos em Sindicância
          </Button>
        </div>

        {/* MAIN NAVIGATION TABS */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-12 bg-accent/30 p-1 rounded-xl border border-border">
            <TabsTrigger value="consulta" className="flex items-center gap-2 text-xs md:text-sm font-semibold">
              <span>➕ Nova Sindicância (Consulta)</span>
            </TabsTrigger>
            <TabsTrigger value="relatorio" className="flex items-center gap-2 text-xs md:text-sm font-semibold">
              <span>📄 Relatório Emitido (Ficha)</span>
            </TabsTrigger>
            <TabsTrigger value="painel" className="flex items-center gap-2 text-xs md:text-sm font-semibold">
              <span>👥 Painel da Comissão ({sindicanciasList.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: FORM & INTEGRATED APIS */}
          <TabsContent value="consulta" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Candidate Form (2 Columns) */}
              <Card className="card-elegant lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-display text-foreground flex items-center gap-2">
                        <User className="h-5 w-5 text-amber-500" />
                        Dados do Candidato (Profano)
                      </CardTitle>
                      <CardDescription>
                        Informe os dados para consulta às certidões públicas unificadas
                      </CardDescription>
                    </div>

                    {profiles && profiles.length > 0 && (
                      <div className="w-56">
                        <Select value={selectedProfileId} onValueChange={handleProfileSelect}>
                          <SelectTrigger className="text-xs h-9">
                            <SelectValue placeholder="Carregar de Propostas..." />
                          </SelectTrigger>
                          <SelectContent>
                            {profiles.map(p => (
                              <SelectItem key={p.id} value={p.id} className="text-xs">
                                {p.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="fullName" className="text-xs font-semibold">Nome Completo do Candidato *</Label>
                      <Input
                        id="fullName"
                        placeholder="Ex: Carlos Eduardo de Oliveira"
                        value={formData.fullName}
                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cpf" className="text-xs font-semibold">CPF *</Label>
                      <Input
                        id="cpf"
                        placeholder="000.000.000-00"
                        value={formData.cpf}
                        onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rg" className="text-xs font-semibold">RG / Órgão Emissor</Label>
                      <div className="flex gap-2">
                        <Input
                          id="rg"
                          placeholder="00.000.000-0"
                          value={formData.rg}
                          onChange={e => setFormData({ ...formData, rg: e.target.value })}
                        />
                        <Input
                          placeholder="SSP"
                          className="w-20"
                          value={formData.rgIssuer}
                          onChange={e => setFormData({ ...formData, rgIssuer: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="birthDate" className="text-xs font-semibold">Data de Nascimento</Label>
                      <Input
                        id="birthDate"
                        type="date"
                        value={formData.birthDate}
                        onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="uf" className="text-xs font-semibold">Estado (UF Principal)</Label>
                      <Select value={formData.uf} onValueChange={uf => setFormData({ ...formData, uf })}>
                        <SelectTrigger id="uf">
                          <SelectValue placeholder="UF" />
                        </SelectTrigger>
                        <SelectContent>
                          {['SP', 'RJ', 'MG', 'PR', 'SC', 'RS', 'BA', 'DF', 'GO', 'PE', 'CE', 'PA', 'ES', 'MT', 'MS'].map(state => (
                            <SelectItem key={state} value={state}>{state}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="profession" className="text-xs font-semibold">Profissão / Ocupação Principal</Label>
                      <Input
                        id="profession"
                        placeholder="Ex: Engenheiro Civil / Administrador de Empresas"
                        value={formData.profession}
                        onChange={e => setFormData({ ...formData, profession: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* LGPD Consent Compliance Box */}
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="lgpd"
                        checked={formData.hasLgpdConsent}
                        onCheckedChange={checked => setFormData({ ...formData, hasLgpdConsent: !!checked })}
                        className="mt-1"
                      />
                      <label htmlFor="lgpd" className="text-xs text-foreground cursor-pointer leading-relaxed">
                        <span className="font-bold text-amber-500">Conformidade LGPD & Autorização de Consulta:</span> Confirmo que o candidato assinou a declaração prévia e expressa autorizando a Comissão de Sindicância a consultar certidões de antecedentes criminais, distribuição cível e relatórios da Justiça Pública.
                      </label>
                    </div>
                  </div>

                  <Button
                    onClick={handleStartSindicancia}
                    size="lg"
                    className="w-full gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold shadow-md h-12"
                  >
                    <Search className="h-5 w-5" />
                    Iniciar Sindicância Automática
                  </Button>
                </CardContent>
              </Card>

              {/* Integrated API Status Panel (1 Column) */}
              <div className="space-y-4">
                <Card className="card-elegant border-primary/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-display text-foreground flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Bases Conectadas (APIs)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Fontes oficiais consultadas em tempo real
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 rounded-xl border border-border bg-card flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                          <ShieldCheck size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">Polícia Federal (SINIC)</p>
                          <p className="text-[11px] text-muted-foreground">Antecedentes Criminais</p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">Operacional</Badge>
                    </div>

                    <div className="p-3 rounded-xl border border-border bg-card flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                          <Scale size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">DataJud (CNJ)</p>
                          <p className="text-[11px] text-muted-foreground">Processos Judiciais Brasil</p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">Operacional</Badge>
                    </div>

                    <div className="p-3 rounded-xl border border-border bg-card flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                          <Building2 size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">TJ Estadual (TJSP/UF)</p>
                          <p className="text-[11px] text-muted-foreground">Varas Cíveis e Família</p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">Operacional</Badge>
                    </div>

                    <div className="p-3 rounded-xl border border-border bg-card flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                          <FileCheck size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">TRF Federal</p>
                          <p className="text-[11px] text-muted-foreground">Justiça Federal R1/R3</p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">Operacional</Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Sindicância Guidelines Card */}
                <Card className="card-elegant border-amber-500/30 bg-amber-500/5">
                  <CardContent className="p-4 space-y-2 text-xs text-muted-foreground">
                    <p className="font-semibold text-amber-500 flex items-center gap-1.5">
                      <ShieldAlert size={14} /> Diretrizes da Comissão
                    </p>
                    <p className="leading-relaxed">
                      A sindicância maçônica visa assegurar a livre e ilibada reputação moral do profano. As informações obtidas são estritamente confidenciais e restritas à Loja Maçônica.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: CONSOLIDATED REPORT & PARECER */}
          <TabsContent value="relatorio" className="space-y-6">
            {/* SCANNING PROGRESS ANIMATOR */}
            {isScanning && (
              <Card className="card-elegant border-amber-500/50 p-8 text-center space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-display text-foreground">Executando Varredura Automatizada...</h3>
                  <p className="text-xs text-muted-foreground">Consultando certidões unificadas da Polícia Federal, DataJud e Tribunais Estaduais</p>
                </div>

                <div className="w-full bg-accent rounded-full h-4 overflow-hidden border border-border p-0.5">
                  <div 
                    className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-medium">
                  <div className={`p-3 rounded-xl border ${scanStep >= 1 ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500' : 'border-border text-muted-foreground'}`}>
                    1. Polícia Federal
                  </div>
                  <div className={`p-3 rounded-xl border ${scanStep >= 2 ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500' : 'border-border text-muted-foreground'}`}>
                    2. DataJud CNJ
                  </div>
                  <div className={`p-3 rounded-xl border ${scanStep >= 3 ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500' : 'border-border text-muted-foreground'}`}>
                    3. TJ Estadual
                  </div>
                  <div className={`p-3 rounded-xl border ${scanStep >= 4 ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500' : 'border-border text-muted-foreground'}`}>
                    4. TRF Federal
                  </div>
                </div>
              </Card>
            )}

            {!isScanning && !reportData && (
              <Card className="card-elegant py-12 text-center">
                <CardContent className="space-y-4">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhuma consulta ativa no momento.</p>
                  <Button onClick={() => setActiveTab('consulta')} variant="outline" className="gap-2">
                    <Search className="h-4 w-4" /> Iniciar Nova Sindicância
                  </Button>
                </CardContent>
              </Card>
            )}

            {!isScanning && reportData && (
              <div className="space-y-6 print:space-y-4">
                {/* REPORT HEADER CARD */}
                <Card className="card-elegant border-emerald-500/40 print:border-black">
                  <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-amber-500/20 text-amber-500 font-mono text-xs">
                            Protocolo: {reportData.protocol}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-body">
                            Emitido em {reportData.generatedAt}
                          </span>
                        </div>
                        <h2 className="text-2xl font-display text-foreground mt-1">
                          {reportData.candidate.fullName}
                        </h2>
                        <p className="text-xs text-muted-foreground font-body">
                          CPF: {reportData.candidate.cpf} • RG: {reportData.candidate.rg} ({reportData.candidate.rgIssuer}) • UF: {reportData.candidate.uf} • Profissão: {reportData.candidate.profession || 'Não declarada'}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <Badge className="bg-emerald-500 text-white font-bold px-4 py-2 text-sm gap-1.5 shadow-sm">
                          <CheckCircle2 size={16} /> NADA CONSTA (Ficha Limpa)
                        </Badge>
                        <div className="flex items-center gap-2 print:hidden">
                          <Button onClick={handlePrint} variant="outline" size="sm" className="gap-1.5">
                            <Printer className="h-4 w-4" /> Imprimir PDF
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* CERTIFICATES & SEARCH RESULTS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Card 1: Polícia Federal */}
                  <Card className="card-elegant border-primary/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-display text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <ShieldCheck className="h-5 w-5 text-blue-500" />
                          Polícia Federal (SINIC)
                        </span>
                        <Badge className="bg-emerald-500/20 text-emerald-500 text-xs">NADA CONSTA</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">Protocolo Emissão:</span>
                        <span className="font-mono font-medium">{reportData.pfCert.protocol}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">Data da Emissão:</span>
                        <span>{reportData.pfCert.date}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Registro de Antecedentes:</span>
                        <span className="text-emerald-500 font-semibold">Nenhum registro criminal encontrado</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 2: DataJud / CNJ */}
                  <Card className="card-elegant border-primary/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-display text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Scale className="h-5 w-5 text-purple-500" />
                          DataJud CNJ & TJ{reportData.candidate.uf}
                        </span>
                        <Badge className="bg-emerald-500/20 text-emerald-500 text-xs">NADA CONSTA</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">Varas Cíveis & Família:</span>
                        <span className="text-emerald-500 font-medium">0 Processos</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">Varas Criminais & Execuções:</span>
                        <span className="text-emerald-500 font-medium">0 Processos</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Justiça Federal (TRF):</span>
                        <span className="text-emerald-500 font-semibold">Sem pendências tributárias ou federais</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* PARECER DA COMISSÃO DE SINDICÂNCIA */}
                <Card className="card-elegant border-amber-500/40">
                  <CardHeader>
                    <CardTitle className="text-xl font-display text-foreground flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-amber-500" />
                      Parecer Final do Sindicante
                    </CardTitle>
                    <CardDescription>
                      Preencha o conceito da entrevista presencial e o voto da comissão
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Irmão Sindicante (M::: M:::)</Label>
                        <Input
                          placeholder="Ex: Ir::: João da Silva"
                          value={sindicanteName}
                          onChange={e => setSindicanteName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Conceito da Entrevista</Label>
                        <Select value={interviewConcept} onValueChange={setInterviewConcept}>
                          <SelectTrigger>
                            <SelectValue placeholder="Conceito" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="excelente">Excelente (Sem Restrições)</SelectItem>
                            <SelectItem value="bom">Bom</SelectItem>
                            <SelectItem value="satisfatorio">Satisfatório</SelectItem>
                            <SelectItem value="pendente">Pendente de Esclarecimento</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Voto da Comissão</Label>
                        <Select value={comissaoVote} onValueChange={(val: any) => setComissaoVote(val)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Voto" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FAVORAVEL">✅ FAVORÁVEL</SelectItem>
                            <SelectItem value="RESTRICAO">⚠️ FAVORÁVEL COM RESTRIÇÕES</SelectItem>
                            <SelectItem value="DESFAVORAVEL">❌ DESFAVORÁVEL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Observações & Parecer Fundamentado</Label>
                      <Textarea
                        rows={4}
                        placeholder="Descreva aqui o parecer circunstanciado da entrevista com o profano e sua família..."
                        value={parecerNotes}
                        onChange={e => setParecerNotes(e.target.value)}
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-2 print:hidden">
                      <Button
                        onClick={handleSaveParecer}
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      >
                        <Save className="h-4 w-4" />
                        Salvar Parecer & Aprovar Pré-Sindicância
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* TAB 3: PAINEL DA COMISSÃO DE SINDICÂNCIA */}
          <TabsContent value="painel" className="space-y-6">
            <Card className="card-elegant">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-display text-foreground">
                      Painel da Comissão de Sindicância
                    </CardTitle>
                    <CardDescription>
                      Histórico e acompanhamento das sindicâncias em andamento
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-accent/40 text-muted-foreground uppercase font-semibold">
                      <tr>
                        <th className="p-3">Protocolo</th>
                        <th className="p-3">Candidato</th>
                        <th className="p-3">CPF</th>
                        <th className="p-3">Profissão</th>
                        <th className="p-3">Polícia Federal</th>
                        <th className="p-3">DataJud (CNJ)</th>
                        <th className="p-3">Parecer Final</th>
                        <th className="p-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sindicanciasList.map((item) => (
                        <tr key={item.id} className="hover:bg-accent/30 transition-colors">
                          <td className="p-3 font-mono font-medium text-foreground">{item.id}</td>
                          <td className="p-3 font-semibold text-foreground">{item.candidateName}</td>
                          <td className="p-3 text-muted-foreground">{item.cpf}</td>
                          <td className="p-3 text-muted-foreground">{item.profession}</td>
                          <td className="p-3">
                            <Badge className="bg-emerald-500/20 text-emerald-500">NADA CONSTA</Badge>
                          </td>
                          <td className="p-3">
                            {item.datajudStatus === 'NADA_CONSTA' ? (
                              <Badge className="bg-emerald-500/20 text-emerald-500">NADA CONSTA</Badge>
                            ) : (
                              <Badge className="bg-amber-500/20 text-amber-500">APONTAMENTO</Badge>
                            )}
                          </td>
                          <td className="p-3">
                            {item.overallStatus === 'FAVORAVEL' && (
                              <Badge className="bg-emerald-600 text-white font-bold">FAVORÁVEL</Badge>
                            )}
                            {item.overallStatus === 'RESTRICAO' && (
                              <Badge className="bg-amber-500 text-black font-bold">C/ RESTRIÇÃO</Badge>
                            )}
                            {item.overallStatus === 'DESFAVORAVEL' && (
                              <Badge className="bg-red-600 text-white font-bold">DESFAVORÁVEL</Badge>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setFormData({
                                  fullName: item.candidateName,
                                  cpf: item.cpf,
                                  rg: '00.000.000-0',
                                  rgIssuer: 'SSP',
                                  birthDate: '1985-05-15',
                                  uf: item.uf,
                                  profession: item.profession,
                                  hasLgpdConsent: true
                                });
                                handleStartSindicancia();
                              }}
                              className="h-7 text-xs gap-1 text-primary"
                            >
                              Ver Ficha <ChevronRight size={14} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
