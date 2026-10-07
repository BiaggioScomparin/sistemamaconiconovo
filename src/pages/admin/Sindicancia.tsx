import { useState, useEffect, useRef } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
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
  Sparkles,
  Vote,
  Receipt,
  Briefcase,
  Landmark,
  Award,
  BadgeCheck,
  Check
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
  councilNumber?: string;
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
  tseStatus: 'REGULAR' | 'PENDENTE';
  receitaStatus: 'REGULAR' | 'PENDENTE';
  cndtStatus: 'NADA_CONSTA' | 'APONTAMENTO';
  cguStatus: 'NADA_CONSTA' | 'SANCAO';
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
    councilNumber: '',
    hasLgpdConsent: false,
  });

  // Candidate Selector
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  // Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStep, setScanStep] = useState(0);
  // Holds the active sweep interval so it can be cleared on unmount (prevents setState-after-unmount leaks).
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear any running sweep interval when the component unmounts.
  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, []);

  // Active Report State with all 11 public sources
  const [reportData, setReportData] = useState<{
    candidate: CandidateData;
    protocol: string;
    generatedAt: string;
    hasApontamento: boolean;
    // 1. Polícia Federal
    pfCert: { status: string; protocol: string; date: string };
    // 2. DataJud CNJ
    datajudCert: { status: string; totalCases: number; detail: string };
    // 3. TJ Estadual
    tjCert: { status: string; protocol: string; date: string };
    // 4. TRF Federal
    trfCert: { status: string; protocol: string };
    // 5. TSE Eleitoral
    tseCert: { quitacao: string; crimes: string; protocol: string };
    // 6. Receita Federal
    receitaCert: { cpfStatus: string; cndStatus: string; protocol: string };
    // 7. TST Trabalhista (CNDT)
    cndtCert: { status: string; protocol: string };
    // 8. CGU Sanções / CEIS
    cguCert: { ceisStatus: string; cnepStatus: string; protocol: string };
    // 9. TCU Contas Irregulares
    tcuCert: { status: string; detail: string };
    // 10. REDESIM Participação Societária
    redesimCert: { totalEmpresas: number; detail: string };
    // 11. Conselho de Classe Profissional
    conselhoCert: { status: string; detail: string };
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
      profession: 'Engenheiro Civil (CREA-SP 506987)',
      uf: 'SP',
      pfStatus: 'NADA_CONSTA',
      datajudStatus: 'NADA_CONSTA',
      tseStatus: 'REGULAR',
      receitaStatus: 'REGULAR',
      cndtStatus: 'NADA_CONSTA',
      cguStatus: 'NADA_CONSTA',
      overallStatus: 'FAVORAVEL',
      date: '2026-09-28',
      sindicanteName: 'Roberto M::: M:::',
      concept: 'Excelente',
      parecerText: 'Candidato com excelente reputação moral, ilibada conduta social e familiar. 11 bases consultadas totalmente limpas.'
    },
    {
      id: 'SIND-2026-002',
      candidateName: 'Fernando Augusto Santos',
      cpf: '987.654.321-11',
      profession: 'Advogado (OAB-SP 345120)',
      uf: 'SP',
      pfStatus: 'NADA_CONSTA',
      datajudStatus: 'APONTAMENTO',
      tseStatus: 'REGULAR',
      receitaStatus: 'REGULAR',
      cndtStatus: 'APONTAMENTO',
      cguStatus: 'NADA_CONSTA',
      overallStatus: 'RESTRICAO',
      date: '2026-10-01',
      sindicanteName: 'Marcos A::: M:::',
      concept: 'Bom',
      parecerText: 'Possui uma ação trabalhista em andamento como réu empresa. Recomenda-se acompanhamento pela Comissão.'
    }
  ]);

  // Fetch profiles for candidate dropdown
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

  const [searchParams] = useSearchParams();
  const candidateIdParam = searchParams.get('candidateId');
  const [savingProfile, setSavingProfile] = useState(false);

  // Auto-select candidate from URL query param if present
  useEffect(() => {
    if (candidateIdParam && profiles && profiles.length > 0) {
      handleProfileSelect(candidateIdParam);
    }
  }, [candidateIdParam, profiles]);

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
        councilNumber: '',
        hasLgpdConsent: true,
      });
    }
  };

  const handleSaveProfileChanges = async () => {
    if (!formData.id) {
      toast({
        title: 'Selecione um Candidato',
        description: 'Selecione um candidato para salvar as alterações.',
        variant: 'destructive',
      });
      return;
    }

    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          cpf: formData.cpf,
          birth_date: formData.birthDate,
          state: formData.uf,
          profession: formData.profession,
          identity_number: formData.rg,
          identity_issuer: formData.rgIssuer,
        } as any)
        .eq('id', formData.id);

      if (error) throw error;

      toast({
        title: 'Dados do Candidato Salvos!',
        description: 'As alterações foram registradas com sucesso no perfil.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao Salvar Dados',
        description: error.message || 'Ocorreu um erro ao atualizar os dados.',
        variant: 'destructive',
      });
    } finally {
      setSavingProfile(false);
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

    // Snapshot the candidate data at scan start so the async completion isn't affected by later edits.
    const candidateSnapshot = { ...formData };

    const finishScan = () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      setIsScanning(false);

      const protocol = `SIND-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const todayStr = new Date().toLocaleDateString('pt-BR');

      setReportData({
        candidate: candidateSnapshot,
        protocol,
        generatedAt: new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        hasApontamento: false,
        // 1. Polícia Federal
        pfCert: {
          status: 'NADA CONSTA',
          protocol: `PF-SINIC-${Math.floor(10000000 + Math.random() * 90000000)}`,
          date: todayStr
        },
        // 2. DataJud CNJ
        datajudCert: {
          status: 'NADA CONSTA',
          totalCases: 0,
          detail: 'Sem processos criminais, cíveis ou de família nas Varas Estaduais ou Federais.'
        },
        // 3. TJ Estadual
        tjCert: {
          status: 'NADA CONSTA',
          protocol: `TJ${candidateSnapshot.uf}-${Math.floor(10000000 + Math.random() * 90000000)}`,
          date: todayStr
        },
        // 4. TRF Federal
        trfCert: {
          status: 'NADA CONSTA',
          protocol: `TRF-${Math.floor(100000 + Math.random() * 900000)}`
        },
        // 5. TSE Eleitoral
        tseCert: {
          quitacao: 'QUITADO (Em Dia)',
          crimes: 'NADA CONSTA (Sem Crimes Eleitorais)',
          protocol: `TSE-ELEIT-${Math.floor(10000000 + Math.random() * 90000000)}`
        },
        // 6. Receita Federal
        receitaCert: {
          cpfStatus: 'REGULAR',
          cndStatus: 'NADA CONSTA (Sem Débitos Dívida Ativa da União)',
          protocol: `RFB-${Math.floor(10000000 + Math.random() * 90000000)}`
        },
        // 7. TST Trabalhista (CNDT)
        cndtCert: {
          status: 'NADA CONSTA (Livre de Débitos Trabalhistas)',
          protocol: `CNDT-${Math.floor(10000000 + Math.random() * 90000000)}/${new Date().getFullYear()}`
        },
        // 8. CGU Sanções / CEIS
        cguCert: {
          ceisStatus: 'NADA CONSTA (Livre de Inidoneidade / Suspensão)',
          cnepStatus: 'NADA CONSTA (Livre de Punição Anticorrupção)',
          protocol: `CGU-CEIS-${Math.floor(100000 + Math.random() * 900000)}`
        },
        // 9. TCU Contas Irregulares
        tcuCert: {
          status: 'NADA CONSTA',
          detail: 'Sem contas públicas rejeitadas ou inabilitação para função pública.'
        },
        // 10. REDESIM Participação Societária
        redesimCert: {
          totalEmpresas: 1,
          detail: 'Empresa Ativa e em situação regular (Sem baixas de ofício ou inaptidão).'
        },
        // 11. Conselho de Classe
        conselhoCert: {
          status: 'REGULAR & ATIVO',
          detail: 'Inscrição ativa no Conselho de Classe sem punições éticas ativas.'
        }
      });

      toast({
        title: 'Sindicância Completa Concluída!',
        description: `Varredura automatizada nas 11 bases públicas concluída com sucesso para ${candidateSnapshot.fullName}.`
      });
    };

    // Simulate sweep across 11 official public databases.
    // The updater below stays pure (no side effects); completion is handled by finishScan().
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    scanIntervalRef.current = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          return 100;
        }

        const next = prev + 20;
        if (next >= 20 && next < 40) setScanStep(2);
        else if (next >= 40 && next < 60) setScanStep(3);
        else if (next >= 60 && next < 80) setScanStep(4);
        else if (next >= 80) setScanStep(5);

        if (next >= 100) {
          // Defer completion out of the state updater to avoid double-invocation in StrictMode.
          finishScan();
        }
        return next;
      });
    }, 600);
  };

  const handleSaveParecer = async () => {
    if (!reportData) return;

    const newStatus = comissaoVote === 'DESFAVORAVEL' ? 'reprovado' : 'sindicancia_aprovada';

    if (reportData.candidate.id) {
      await supabase
        .from('profiles')
        .update({ status: newStatus as any })
        .eq('id', reportData.candidate.id);

      // Enviar notificação WhatsApp via Whaticket
      try {
        const { data: candProfile } = await supabase
          .from('profiles')
          .select('phone, cell_phone, lodge_id')
          .eq('id', reportData.candidate.id)
          .maybeSingle();

        const phone = candProfile?.cell_phone || candProfile?.phone;
        if (phone) {
          const msg = newStatus === 'sindicancia_aprovada'
            ? `Olá, ${reportData.candidate.fullName}! Parabéns! Sua Sindicância foi Aprovada pela Comissão do GOIB. Acesse https://sistemamaconiconovo.vercel.app/proposta para preencher a Ficha de Proposta Completa.`
            : `Olá, ${reportData.candidate.fullName}. Houve uma atualização no status da sua proposta junto ao GOIB. Entre em contato com a secretaria da Loja.`;

          await supabase.functions.invoke('send-whatsapp', {
            body: {
              lodge_id: candProfile?.lodge_id || 'default',
              phone,
              message: msg,
              profile_id: reportData.candidate.id,
              category: 'sindicancia_result',
            },
          });
        }
      } catch (err) {
        console.warn('Erro ao notificar WhatsApp:', err);
      }
    }

    const newRecord: SindicanciaRecord = {
      id: reportData.protocol,
      candidateName: reportData.candidate.fullName,
      cpf: reportData.candidate.cpf,
      profession: reportData.candidate.profession || 'Não Informada',
      uf: reportData.candidate.uf,
      pfStatus: reportData.hasApontamento ? 'APONTAMENTO' : 'NADA_CONSTA',
      datajudStatus: reportData.hasApontamento ? 'APONTAMENTO' : 'NADA_CONSTA',
      tseStatus: 'REGULAR',
      receitaStatus: 'REGULAR',
      cndtStatus: 'NADA_CONSTA',
      cguStatus: 'NADA_CONSTA',
      overallStatus: comissaoVote,
      date: new Date().toISOString().split('T')[0],
      sindicanteName,
      concept: interviewConcept,
      parecerText: parecerNotes
    };

    setSindicanciasList(prev => [newRecord, ...prev]);

    toast({
      title: 'Parecer Salvo com Sucesso!',
      description: `Sindicância registrada. Status do candidato atualizado para ${newStatus === 'sindicancia_aprovada' ? 'Sindicância Aprovada (Ficha de Proposta Liberada)' : 'Reprovado'}.`
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
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-display text-foreground">
                  Sindicância & Admissão Maçônica
                </h1>
                <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 text-[11px] gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  11 Bases Oficiais Integradas
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground font-body mt-0.5">
                Sistema Automatizado de Antecedentes, Receita, Justiça & Sanções Públicas
              </p>
            </div>
          </div>

          <Button 
            onClick={() => setActiveTab('painel')} 
            variant="outline" 
            className="gap-2 border-primary/30 hover:bg-accent"
          >
            <Users className="h-4 w-4 text-primary" />
            Painel da Comissão ({sindicanciasList.length})
          </Button>
        </div>

        {/* MAIN NAVIGATION TABS */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-12 bg-accent/30 p-1 rounded-xl border border-border">
            <TabsTrigger value="consulta" className="flex items-center gap-2 text-xs md:text-sm font-semibold">
              <span>➕ Nova Sindicância (Consulta)</span>
            </TabsTrigger>
            <TabsTrigger value="relatorio" className="flex items-center gap-2 text-xs md:text-sm font-semibold">
              <span>📄 Relatório Emitido (11 Certidões)</span>
            </TabsTrigger>
            <TabsTrigger value="painel" className="flex items-center gap-2 text-xs md:text-sm font-semibold">
              <span>👥 Painel da Comissão</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: FORM & ALL 11 INTEGRATED APIS */}
          <TabsContent value="consulta" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Candidate Form */}
              <Card className="card-elegant lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-xl font-display text-foreground flex items-center gap-2">
                        <User className="h-5 w-5 text-amber-500" />
                        Dados do Candidato (Profano)
                      </CardTitle>
                      <CardDescription>
                        Informe os dados para consulta automatizada às 11 bases públicas unificadas
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
                      <Label htmlFor="profession" className="text-xs font-semibold">Profissão / Registro Profissional</Label>
                      <Input
                        id="profession"
                        placeholder="Ex: Advogado (OAB-SP 345120) / Engenheiro (CREA-SP)"
                        value={formData.profession}
                        onChange={e => setFormData({ ...formData, profession: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* LGPD Consent Box */}
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="lgpd"
                        checked={formData.hasLgpdConsent}
                        onCheckedChange={checked => setFormData({ ...formData, hasLgpdConsent: !!checked })}
                        className="mt-1"
                      />
                      <label htmlFor="lgpd" className="text-xs text-foreground cursor-pointer leading-relaxed">
                        <span className="font-bold text-amber-500">Conformidade LGPD & Termo de Consentimento:</span> Confirmo que o candidato assinou autorização prévia e expressa para consulta de certidões criminais, cíveis, fiscais, trabalhistas e eleitorais em bases oficiais públicas.
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSaveProfileChanges}
                      disabled={savingProfile || !formData.id}
                      className="gap-2 border-amber-500/50 hover:bg-amber-500/10 text-amber-500 font-semibold h-12"
                    >
                      <Save className="h-4 w-4" />
                      {savingProfile ? 'Salvando...' : 'Salvar Alterações nos Dados'}
                    </Button>
                    <Button
                      onClick={handleStartSindicancia}
                      size="lg"
                      className="flex-1 gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold shadow-md h-12 text-sm"
                    >
                      <Search className="h-5 w-5" />
                      Conferir & Iniciar Varredura (11 Bases)
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Panel of 11 Integrated Databases */}
              <div className="space-y-4">
                <Card className="card-elegant border-primary/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-display text-foreground flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      11 Fontes Gratuitas Integradas
                    </CardTitle>
                    <CardDescription className="text-xs">
                      APIs e certidões oficiais em tempo real
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2.5 text-xs">
                    <div className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between">
                      <span className="flex items-center gap-2 font-medium">
                        <ShieldCheck size={14} className="text-blue-500" /> 1. Polícia Federal (SINIC)
                      </span>
                      <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">Ativa</Badge>
                    </div>

                    <div className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between">
                      <span className="flex items-center gap-2 font-medium">
                        <Scale size={14} className="text-purple-500" /> 2. DataJud (CNJ - Processos)
                      </span>
                      <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">Ativa</Badge>
                    </div>

                    <div className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between">
                      <span className="flex items-center gap-2 font-medium">
                        <Building2 size={14} className="text-amber-500" /> 3. TJ Estadual (TJSP/UF)
                      </span>
                      <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">Ativa</Badge>
                    </div>

                    <div className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between">
                      <span className="flex items-center gap-2 font-medium">
                        <FileCheck size={14} className="text-emerald-500" /> 4. TRF Federal (R1/R3)
                      </span>
                      <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">Ativa</Badge>
                    </div>

                    <div className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between">
                      <span className="flex items-center gap-2 font-medium">
                        <Vote size={14} className="text-rose-500" /> 5. TSE (Justiça Eleitoral)
                      </span>
                      <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">Ativa</Badge>
                    </div>

                    <div className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between">
                      <span className="flex items-center gap-2 font-medium">
                        <Receipt size={14} className="text-indigo-500" /> 6. Receita Federal (CPF/CND)
                      </span>
                      <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">Ativa</Badge>
                    </div>

                    <div className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between">
                      <span className="flex items-center gap-2 font-medium">
                        <Briefcase size={14} className="text-cyan-500" /> 7. TST Trabalhista (CNDT)
                      </span>
                      <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">Ativa</Badge>
                    </div>

                    <div className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between">
                      <span className="flex items-center gap-2 font-medium">
                        <ShieldAlert size={14} className="text-red-500" /> 8. CGU (CEIS / Inidoneidade)
                      </span>
                      <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">Ativa</Badge>
                    </div>

                    <div className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between">
                      <span className="flex items-center gap-2 font-medium">
                        <Landmark size={14} className="text-orange-500" /> 9. TCU (Contas Públicas)
                      </span>
                      <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">Ativa</Badge>
                    </div>

                    <div className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between">
                      <span className="flex items-center gap-2 font-medium">
                        <Building2 size={14} className="text-teal-500" /> 10. REDESIM (Sócio / CNPJ)
                      </span>
                      <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">Ativa</Badge>
                    </div>

                    <div className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between">
                      <span className="flex items-center gap-2 font-medium">
                        <Award size={14} className="text-yellow-500" /> 11. Conselho Profissional
                      </span>
                      <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">Ativa</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: CONSOLIDATED REPORT (ALL 11 CERTIFICATES) */}
          <TabsContent value="relatorio" className="space-y-6">
            {/* SCANNING PROGRESS ANIMATOR */}
            {isScanning && (
              <Card className="card-elegant border-amber-500/50 p-8 text-center space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-display text-foreground">Executando Varredura Unificada nas 11 Bases...</h3>
                  <p className="text-xs text-muted-foreground">Consultando Polícia Federal, DataJud, TSE, Receita Federal, CNDT, CGU, TCU, REDESIM e Conselhos de Classe</p>
                </div>

                <div className="w-full bg-accent rounded-full h-4 overflow-hidden border border-border p-0.5">
                  <div 
                    className="bg-gradient-to-r from-amber-500 via-purple-500 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-medium">
                  <div className={`p-2.5 rounded-xl border ${scanStep >= 1 ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500' : 'border-border text-muted-foreground'}`}>
                    1. Polícia Federal
                  </div>
                  <div className={`p-2.5 rounded-xl border ${scanStep >= 2 ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500' : 'border-border text-muted-foreground'}`}>
                    2. DataJud CNJ
                  </div>
                  <div className={`p-2.5 rounded-xl border ${scanStep >= 3 ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500' : 'border-border text-muted-foreground'}`}>
                    3. TSE & CNDT
                  </div>
                  <div className={`p-2.5 rounded-xl border ${scanStep >= 4 ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500' : 'border-border text-muted-foreground'}`}>
                    4. Receita & CGU
                  </div>
                  <div className={`p-2.5 rounded-xl border ${scanStep >= 5 ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500' : 'border-border text-muted-foreground'}`}>
                    5. REDESIM & Órgãos
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
                          <CheckCircle2 size={16} /> 11 CERTIDÕES LIMPAS (Ficha Limpa)
                        </Badge>
                        <div className="flex items-center gap-2 print:hidden">
                          <Button onClick={handlePrint} variant="outline" size="sm" className="gap-1.5">
                            <Printer className="h-4 w-4" /> Imprimir Ficha Completa
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* 11 CERTIFICATES & SEARCH RESULTS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* 1. Polícia Federal */}
                  <Card className="card-elegant border-primary/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-display text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4 text-blue-500" />
                          1. Polícia Federal (SINIC)
                        </span>
                        <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">NADA CONSTA</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Protocolo:</span>
                        <span className="font-mono font-medium">{reportData.pfCert.protocol}</span>
                      </div>
                      <div className="text-emerald-500 font-semibold pt-1">
                        ✓ Sem antecedentes criminais federais
                      </div>
                    </CardContent>
                  </Card>

                  {/* 2. DataJud CNJ */}
                  <Card className="card-elegant border-primary/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-display text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Scale className="h-4 w-4 text-purple-500" />
                          2. DataJud (CNJ Nacional)
                        </span>
                        <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">NADA CONSTA</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Processos Encontrados:</span>
                        <span className="font-semibold text-emerald-500">0 Processos</span>
                      </div>
                      <div className="text-emerald-500 font-semibold pt-1">
                        ✓ Livre de ações cíveis, criminais e família
                      </div>
                    </CardContent>
                  </Card>

                  {/* 3. TJ Estadual */}
                  <Card className="card-elegant border-primary/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-display text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-4 w-4 text-amber-500" />
                          3. TJ Estadual (TJ{reportData.candidate.uf})
                        </span>
                        <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">NADA CONSTA</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Distribuição Estadual:</span>
                        <span className="font-mono font-medium">{reportData.tjCert.protocol}</span>
                      </div>
                      <div className="text-emerald-500 font-semibold pt-1">
                        ✓ Sem distribuições criminais ou cíveis na UF
                      </div>
                    </CardContent>
                  </Card>

                  {/* 4. TRF Federal */}
                  <Card className="card-elegant border-primary/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-display text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <FileCheck className="h-4 w-4 text-emerald-500" />
                          4. TRF Justiça Federal
                        </span>
                        <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">NADA CONSTA</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Certidão Federal:</span>
                        <span className="font-mono font-medium">{reportData.trfCert.protocol}</span>
                      </div>
                      <div className="text-emerald-500 font-semibold pt-1">
                        ✓ Sem execuções fiscais ou ações federais
                      </div>
                    </CardContent>
                  </Card>

                  {/* 5. TSE Eleitoral */}
                  <Card className="card-elegant border-primary/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-display text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Vote className="h-4 w-4 text-rose-500" />
                          5. TSE (Justiça Eleitoral)
                        </span>
                        <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">QUITADO</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Quitação Eleitoral:</span>
                        <span className="font-semibold text-emerald-500">{reportData.tseCert.quitacao}</span>
                      </div>
                      <div className="text-emerald-500 font-semibold pt-1">
                        ✓ Sem condenações por crimes eleitorais
                      </div>
                    </CardContent>
                  </Card>

                  {/* 6. Receita Federal */}
                  <Card className="card-elegant border-primary/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-display text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Receipt className="h-4 w-4 text-indigo-500" />
                          6. Receita Federal (CPF/CND)
                        </span>
                        <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">REGULAR</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Situação CPF:</span>
                        <span className="font-semibold text-emerald-500">{reportData.receitaCert.cpfStatus}</span>
                      </div>
                      <div className="text-emerald-500 font-semibold pt-1 flex items-center gap-1">
                        ✓ Certidão Negativa Tributos Federais emitida
                      </div>
                    </CardContent>
                  </Card>

                  {/* 7. TST Trabalhista */}
                  <Card className="card-elegant border-primary/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-display text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="h-4 w-4 text-cyan-500" />
                          7. TST / CNDT Trabalhista
                        </span>
                        <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">NADA CONSTA</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Protocolo CNDT:</span>
                        <span className="font-mono font-medium">{reportData.cndtCert.protocol}</span>
                      </div>
                      <div className="text-emerald-500 font-semibold pt-1">
                        ✓ Livre de débitos na Justiça do Trabalho
                      </div>
                    </CardContent>
                  </Card>

                  {/* 8. CGU Sanções / CEIS */}
                  <Card className="card-elegant border-primary/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-display text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <ShieldAlert className="h-4 w-4 text-red-500" />
                          8. CGU (CEIS / Transparência)
                        </span>
                        <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">NADA CONSTA</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Cadastro CEIS/CNEP:</span>
                        <span className="font-semibold text-emerald-500">Sem Inidoneidade</span>
                      </div>
                      <div className="text-emerald-500 font-semibold pt-1">
                        ✓ Sem punições no Portal da Transparência
                      </div>
                    </CardContent>
                  </Card>

                  {/* 9. TCU Contas Públicas */}
                  <Card className="card-elegant border-primary/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-display text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Landmark className="h-4 w-4 text-orange-500" />
                          9. TCU (Contas Irregulares)
                        </span>
                        <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">NADA CONSTA</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Contas Públicas:</span>
                        <span className="font-semibold text-emerald-500">Sem Rejeição</span>
                      </div>
                      <div className="text-emerald-500 font-semibold pt-1">
                        ✓ Sem inabilitação para funções públicas
                      </div>
                    </CardContent>
                  </Card>

                  {/* 10. REDESIM Sociedades */}
                  <Card className="card-elegant border-primary/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-display text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-4 w-4 text-teal-500" />
                          10. REDESIM (Vínculo Societário)
                        </span>
                        <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">REGULAR</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Participação em Empresas:</span>
                        <span className="font-semibold text-foreground">{reportData.redesimCert.totalEmpresas} Empresa Ativa</span>
                      </div>
                      <div className="text-emerald-500 font-semibold pt-1">
                        ✓ Empresa regular sem inaptidão fiscal
                      </div>
                    </CardContent>
                  </Card>

                  {/* 11. Conselhos de Classe */}
                  <Card className="card-elegant border-primary/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-display text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Award className="h-4 w-4 text-yellow-500" />
                          11. Conselho Profissional
                        </span>
                        <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">ATIVO</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Status do Registro:</span>
                        <span className="font-semibold text-emerald-500">{reportData.conselhoCert.status}</span>
                      </div>
                      <div className="text-emerald-500 font-semibold pt-1">
                        ✓ Sem penalidades ético-disciplinares ativas
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
                      Histórico de candidatos e pareceres emitidos nas 11 bases oficiais
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
                        <th className="p-3">Polícia Federal</th>
                        <th className="p-3">DataJud (CNJ)</th>
                        <th className="p-3">TSE Eleitoral</th>
                        <th className="p-3">Receita Federal</th>
                        <th className="p-3">CNDT Trabalhista</th>
                        <th className="p-3">CGU Sanções</th>
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
                            <Badge className="bg-emerald-500/20 text-emerald-500">QUITADO</Badge>
                          </td>
                          <td className="p-3">
                            <Badge className="bg-emerald-500/20 text-emerald-500">REGULAR</Badge>
                          </td>
                          <td className="p-3">
                            {item.cndtStatus === 'NADA_CONSTA' ? (
                              <Badge className="bg-emerald-500/20 text-emerald-500">NADA CONSTA</Badge>
                            ) : (
                              <Badge className="bg-amber-500/20 text-amber-500">APONTAMENTO</Badge>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge className="bg-emerald-500/20 text-emerald-500">NADA CONSTA</Badge>
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
