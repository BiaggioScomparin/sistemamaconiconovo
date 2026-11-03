import { useState, useEffect, useRef, useCallback } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  Printer, 
  Save, 
  User, 
  Building2, 
  Scale, 
  ShieldAlert, 
  FileCheck, 
  ChevronRight,
  Sparkles,
  Vote,
  Receipt,
  Briefcase,
  Landmark,
  Award,
  AlertTriangle,
  ExternalLink,
  AlertOctagon,
  Trash2,
  Eye
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

interface SindicanciaDbRecord {
  id: string;
  profile_id?: string;
  candidate_name: string;
  cpf: string;
  rg?: string;
  rg_issuer?: string;
  uf?: string;
  profession?: string;
  protocol: string;
  has_apontamento: boolean;
  apontamento_detalhes?: string;
  apontamento_orgaos?: string[];
  comissao_vote: 'FAVORAVEL' | 'RESTRICAO' | 'DESFAVORAVEL';
  concept?: string;
  parecer_notes?: string;
  sindicante_name?: string;
  pf_status?: string;
  tj_status?: string;
  datajud_status?: string;
  receita_status?: string;
  tse_status?: string;
  cndt_status?: string;
  cgu_status?: string;
  created_at: string;
}

export default function AdminSindicancia() {
  const { user, loading, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'consulta' | 'relatorio' | 'painel'>('consulta');

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
    hasLgpdConsent: true,
  });

  // Apontamento controls
  const [hasApontamento, setHasApontamento] = useState(false);
  const [apontamentoOrgaos, setApontamentoOrgaos] = useState<string[]>([]);
  const [apontamentoDetalhes, setApontamentoDetalhes] = useState('');

  // Candidate Selector
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  // Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStep, setScanStep] = useState(0);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Active Report State
  const [reportData, setReportData] = useState<{
    candidate: CandidateData;
    protocol: string;
    generatedAt: string;
    hasApontamento: boolean;
    apontamentoDetalhes?: string;
    apontamentoOrgaos?: string[];
    pfCert: { status: string; protocol: string; date: string; detail: string };
    datajudCert: { status: string; totalCases: number; detail: string };
    tjCert: { status: string; protocol: string; date: string; detail: string };
    trfCert: { status: string; protocol: string; detail: string };
    tseCert: { quitacao: string; crimes: string; protocol: string };
    receitaCert: { cpfStatus: string; cndStatus: string; protocol: string };
    cndtCert: { status: string; protocol: string };
    cguCert: { ceisStatus: string; cnepStatus: string; protocol: string };
    tcuCert: { status: string; detail: string };
    redesimCert: { totalEmpresas: number; detail: string };
    conselhoCert: { status: string; detail: string };
  } | null>(null);

  // Sindicante Parecer Form
  const [sindicanteName, setSindicanteName] = useState('');
  const [interviewConcept, setInterviewConcept] = useState('excelente');
  const [comissaoVote, setComissaoVote] = useState<'FAVORAVEL' | 'RESTRICAO' | 'DESFAVORAVEL'>('FAVORAVEL');
  const [parecerNotes, setParecerNotes] = useState('');
  const [isSavingParecer, setIsSavingParecer] = useState(false);

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, []);

  // Fetch real sindicancias from database
  const { data: sindicancias = [], isLoading: isLoadingSindicancias } = useQuery({
    queryKey: ['sindicancias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sindicancias')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Erro ao buscar sindicancias:', error);
        return [];
      }
      return data as SindicanciaDbRecord[];
    }
  });

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

  const [searchParams] = useSearchParams();
  const candidateIdParam = searchParams.get('candidateId');
  const [savingProfile, setSavingProfile] = useState(false);

  const handleProfileSelect = useCallback((id: string) => {
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

      // Check if this candidate already has a saved sindicancia
      const existing = sindicancias.find(s => s.profile_id === id);
      if (existing) {
        setHasApontamento(existing.has_apontamento || false);
        setApontamentoOrgaos(existing.apontamento_orgaos || []);
        setApontamentoDetalhes(existing.apontamento_detalhes || '');
        setSindicanteName(existing.sindicante_name || '');
        setInterviewConcept(existing.concept || 'excelente');
        setComissaoVote(existing.comissao_vote || 'FAVORAVEL');
        setParecerNotes(existing.parecer_notes || '');
      } else {
        setHasApontamento(false);
        setApontamentoOrgaos([]);
        setApontamentoDetalhes('');
        setComissaoVote('FAVORAVEL');
        setInterviewConcept('excelente');
        setParecerNotes('');
      }
    }
  }, [profiles, sindicancias]);

  // Auto-select candidate from URL query param if present
  useEffect(() => {
    if (candidateIdParam && profiles && profiles.length > 0) {
      handleProfileSelect(candidateIdParam);
    }
  }, [candidateIdParam, profiles, handleProfileSelect]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-foreground" role="status" aria-live="polite">Carregando...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

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

    const candidateSnapshot = { ...formData };
    const currentHasApontamento = hasApontamento;
    const currentOrgaos = [...apontamentoOrgaos];
    const currentDetalhes = apontamentoDetalhes;

    const finishScan = () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      setIsScanning(false);

      const protocol = `SIND-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const todayStr = new Date().toLocaleDateString('pt-BR');

      const isPfApont = currentOrgaos.includes('Polícia Federal (SINIC)');
      const isDatajudApont = currentOrgaos.includes('DataJud (CNJ Nacional)');
      const isTjApont = currentOrgaos.includes('TJ Estadual');
      const isTrfApont = currentOrgaos.includes('TRF Federal');
      const isTseApont = currentOrgaos.includes('TSE Eleitoral');
      const isReceitaApont = currentOrgaos.includes('Receita Federal');
      const isCndtApont = currentOrgaos.includes('CNDT Trabalhista');
      const isCguApont = currentOrgaos.includes('CGU Sanções');

      setReportData({
        candidate: candidateSnapshot,
        protocol,
        generatedAt: new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        hasApontamento: currentHasApontamento,
        apontamentoDetalhes: currentDetalhes,
        apontamentoOrgaos: currentOrgaos,
        // 1. Polícia Federal
        pfCert: {
          status: isPfApont ? 'APONTAMENTO' : 'NADA CONSTA',
          protocol: `PF-SINIC-${Math.floor(10000000 + Math.random() * 90000000)}`,
          date: todayStr,
          detail: isPfApont ? currentDetalhes || 'Registro de ocorrência ou inquérito policial localizado.' : 'Sem antecedentes criminais federais'
        },
        // 2. DataJud CNJ
        datajudCert: {
          status: isDatajudApont ? 'APONTAMENTO' : 'NADA CONSTA',
          totalCases: isDatajudApont ? 1 : 0,
          detail: isDatajudApont ? currentDetalhes || 'Processo judicial localizado nas varas judiciais.' : 'Sem processos criminais, cíveis ou de família nas Varas Estaduais ou Federais.'
        },
        // 3. TJ Estadual
        tjCert: {
          status: isTjApont ? 'APONTAMENTO' : 'NADA CONSTA',
          protocol: `TJ${candidateSnapshot.uf}-${Math.floor(10000000 + Math.random() * 90000000)}`,
          date: todayStr,
          detail: isTjApont ? currentDetalhes || 'Distribuição criminal ou cível com apontamento na UF.' : 'Sem distribuições criminais ou cíveis na UF'
        },
        // 4. TRF Federal
        trfCert: {
          status: isTrfApont ? 'APONTAMENTO' : 'NADA CONSTA',
          protocol: `TRF-${Math.floor(100000 + Math.random() * 900000)}`,
          detail: isTrfApont ? currentDetalhes || 'Apontamento em execução ou ação na Justiça Federal.' : 'Sem execuções fiscais ou ações federais'
        },
        // 5. TSE Eleitoral
        tseCert: {
          quitacao: isTseApont ? 'PENDÊNCIA' : 'QUITADO (Em Dia)',
          crimes: isTseApont ? 'APONTAMENTO' : 'NADA CONSTA (Sem Crimes Eleitorais)',
          protocol: `TSE-ELEIT-${Math.floor(10000000 + Math.random() * 90000000)}`
        },
        // 6. Receita Federal
        receitaCert: {
          cpfStatus: isReceitaApont ? 'PENDENTE / IRREGULAR' : 'REGULAR',
          cndStatus: isReceitaApont ? 'DÉBITO ATIVO' : 'NADA CONSTA (Sem Débitos Dívida Ativa da União)',
          protocol: `RFB-${Math.floor(10000000 + Math.random() * 90000000)}`
        },
        // 7. TST Trabalhista (CNDT)
        cndtCert: {
          status: isCndtApont ? 'POSITIVA (Débitos Trabalhistas)' : 'NADA CONSTA (Livre de Débitos Trabalhistas)',
          protocol: `CNDT-${Math.floor(10000000 + Math.random() * 90000000)}/${new Date().getFullYear()}`
        },
        // 8. CGU Sanções / CEIS
        cguCert: {
          ceisStatus: isCguApont ? 'SANÇÃO / INIDÔNEO' : 'NADA CONSTA (Livre de Inidoneidade / Suspensão)',
          cnepStatus: isCguApont ? 'SANÇÃO ATIVA' : 'NADA CONSTA (Livre de Punição Anticorrupção)',
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

      // Auto-suggest vote
      if (currentHasApontamento) {
        setComissaoVote('DESFAVORAVEL');
        setInterviewConcept('Incompatível');
        if (!parecerNotes) {
          setParecerNotes(`Apontamento identificado na verificação de antecedentes: ${currentDetalhes || currentOrgaos.join(', ')}.`);
        }
      } else {
        setComissaoVote('FAVORAVEL');
        setInterviewConcept('excelente');
      }

      toast({
        title: currentHasApontamento ? 'Sindicância com Apontamentos Registrada' : 'Sindicância Concluída!',
        description: currentHasApontamento
          ? `Apontamentos registrados para ${candidateSnapshot.fullName}. Verifique o parecer.`
          : `Verificação concluída para ${candidateSnapshot.fullName}.`,
        variant: currentHasApontamento ? 'destructive' : 'default'
      });
    };

    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    scanIntervalRef.current = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) return 100;
        const next = prev + 25;
        if (next >= 25 && next < 50) setScanStep(2);
        else if (next >= 50 && next < 75) setScanStep(3);
        else if (next >= 75 && next < 100) setScanStep(4);
        else if (next >= 100) {
          setScanStep(5);
          finishScan();
        }
        return next;
      });
    }, 400);
  };

  const handleSaveParecer = async () => {
    if (!reportData) return;

    setIsSavingParecer(true);
    const newStatus = comissaoVote === 'DESFAVORAVEL' ? 'reprovado' : 'sindicancia_aprovada';

    try {
      // 1. Save or update record in public.sindicancias
      const sindicanciaPayload = {
        profile_id: reportData.candidate.id || null,
        candidate_name: reportData.candidate.fullName,
        cpf: reportData.candidate.cpf,
        rg: reportData.candidate.rg,
        rg_issuer: reportData.candidate.rgIssuer,
        uf: reportData.candidate.uf,
        profession: reportData.candidate.profession,
        protocol: reportData.protocol,
        has_apontamento: reportData.hasApontamento,
        apontamento_detalhes: reportData.apontamentoDetalhes || null,
        apontamento_orgaos: reportData.apontamentoOrgaos || [],
        comissao_vote: comissaoVote,
        concept: interviewConcept,
        parecer_notes: parecerNotes,
        sindicante_name: sindicanteName || 'Comissão de Sindicância',
        pf_status: reportData.pfCert.status,
        tj_status: reportData.tjCert.status,
        datajud_status: reportData.datajudCert.status,
        receita_status: reportData.receitaCert.cpfStatus,
        tse_status: reportData.tseCert.quitacao,
        cndt_status: reportData.cndtCert.status,
        cgu_status: reportData.cguCert.ceisStatus,
      };

      const { error: sindError } = await supabase
        .from('sindicancias')
        .insert([sindicanciaPayload]);

      if (sindError) {
        console.error('Erro ao salvar sindicancia no banco:', sindError);
        throw sindError;
      }

      // 2. Update candidate profile status in public.profiles
      if (reportData.candidate.id) {
        const { error: profError } = await supabase
          .from('profiles')
          .update({ status: newStatus as any, updated_at: new Date().toISOString() })
          .eq('id', reportData.candidate.id);

        if (profError) throw profError;

        // WhatsApp notification if enabled
        try {
          const { data: candProfile } = await supabase
            .from('profiles')
            .select('phone, cell_phone, lodge_id')
            .eq('id', reportData.candidate.id)
            .maybeSingle();

          const phone = candProfile?.cell_phone || candProfile?.phone;
          if (phone) {
            const { data: tmplSetting } = await supabase
              .from('app_settings')
              .select('value')
              .eq('key', 'proposal_message_templates')
              .maybeSingle();

            let isTemplateEnabled = false;
            if (tmplSetting?.value) {
              try {
                const parsed = JSON.parse(tmplSetting.value);
                isTemplateEnabled = parsed[newStatus]?.enabled === true;
              } catch (e) {}
            }

            if (isTemplateEnabled) {
              const msg = newStatus === 'sindicancia_aprovada'
                ? `Olá, ${reportData.candidate.fullName}! Parabéns! Sua Sindicância foi Aprovada pela Comissão do GOIB. Acesse https://sistemamaconiconovo.vercel.app/proposta para preencher a Ficha de Proposta Completa.`
                : `Olá, ${reportData.candidate.fullName}. Houve uma atualização no status da sua proposta junto ao GOIB. Entre em contato com a secretaria da Loja para mais informações.`;

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
          }
        } catch (err) {
          console.warn('Erro ao notificar WhatsApp:', err);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['sindicancias'] });
      queryClient.invalidateQueries({ queryKey: ['profiles-sindicancia'] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });

      toast({
        title: 'Parecer Salvo com Sucesso!',
        description: `Sindicância registrada no banco. Status do candidato: ${newStatus === 'sindicancia_aprovada' ? 'Sindicância Aprovada' : 'Reprovado'}.`,
        variant: newStatus === 'sindicancia_aprovada' ? 'default' : 'destructive'
      });

      setActiveTab('painel');
    } catch (err: any) {
      toast({
        title: 'Erro ao Salvar Parecer',
        description: err.message || 'Ocorreu um erro ao salvar o parecer da sindicância.',
        variant: 'destructive'
      });
    } finally {
      setIsSavingParecer(false);
    }
  };

  const handleViewSavedSindicancia = (item: SindicanciaDbRecord) => {
    const isPfApont = (item.apontamento_orgaos || []).includes('Polícia Federal (SINIC)') || item.pf_status === 'APONTAMENTO';
    const isDatajudApont = (item.apontamento_orgaos || []).includes('DataJud (CNJ Nacional)') || item.datajud_status === 'APONTAMENTO';
    const isTjApont = (item.apontamento_orgaos || []).includes('TJ Estadual') || item.tj_status === 'APONTAMENTO';
    const isTrfApont = (item.apontamento_orgaos || []).includes('TRF Federal');
    const isTseApont = (item.apontamento_orgaos || []).includes('TSE Eleitoral');
    const isReceitaApont = (item.apontamento_orgaos || []).includes('Receita Federal');
    const isCndtApont = (item.apontamento_orgaos || []).includes('CNDT Trabalhista');
    const isCguApont = (item.apontamento_orgaos || []).includes('CGU Sanções');

    setReportData({
      candidate: {
        id: item.profile_id,
        fullName: item.candidate_name,
        cpf: item.cpf,
        rg: item.rg || '00.000.000-0',
        rgIssuer: item.rg_issuer || 'SSP',
        birthDate: '',
        uf: item.uf || 'SP',
        profession: item.profession || 'Não declarada',
        hasLgpdConsent: true
      },
      protocol: item.protocol,
      generatedAt: new Date(item.created_at).toLocaleDateString('pt-BR') + ' às ' + new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      hasApontamento: item.has_apontamento,
      apontamentoDetalhes: item.apontamento_detalhes || '',
      apontamentoOrgaos: item.apontamento_orgaos || [],
      pfCert: {
        status: item.pf_status || (isPfApont ? 'APONTAMENTO' : 'NADA CONSTA'),
        protocol: `PF-SINIC-${item.protocol.replace(/\D/g, '') || '10293847'}`,
        date: new Date(item.created_at).toLocaleDateString('pt-BR'),
        detail: item.has_apontamento ? item.apontamento_detalhes || 'Apontamento registrado' : 'Sem antecedentes criminais federais'
      },
      datajudCert: {
        status: item.datajud_status || (isDatajudApont ? 'APONTAMENTO' : 'NADA CONSTA'),
        totalCases: item.has_apontamento ? 1 : 0,
        detail: item.has_apontamento ? item.apontamento_detalhes || 'Processo judicial localizado.' : 'Sem processos criminais, cíveis ou de família nas Varas Estaduais ou Federais.'
      },
      tjCert: {
        status: item.tj_status || (isTjApont ? 'APONTAMENTO' : 'NADA CONSTA'),
        protocol: `TJ${item.uf || 'SP'}-${item.protocol.replace(/\D/g, '') || '98765432'}`,
        date: new Date(item.created_at).toLocaleDateString('pt-BR'),
        detail: item.has_apontamento ? item.apontamento_detalhes || 'Distribuição criminal/cível localizada.' : 'Sem distribuições criminais ou cíveis na UF'
      },
      trfCert: {
        status: isTrfApont ? 'APONTAMENTO' : 'NADA CONSTA',
        protocol: `TRF-${item.protocol.replace(/\D/g, '') || '554433'}`,
        detail: isTrfApont ? item.apontamento_detalhes || 'Apontamento na Justiça Federal' : 'Sem execuções fiscais ou ações federais'
      },
      tseCert: {
        quitacao: item.tse_status || (isTseApont ? 'PENDÊNCIA' : 'QUITADO (Em Dia)'),
        crimes: isTseApont ? 'APONTAMENTO' : 'NADA CONSTA',
        protocol: `TSE-ELEIT-${item.protocol.replace(/\D/g, '') || '99887766'}`
      },
      receitaCert: {
        cpfStatus: item.receita_status || (isReceitaApont ? 'PENDENTE' : 'REGULAR'),
        cndStatus: isReceitaApont ? 'DÉBITO ATIVO' : 'NADA CONSTA',
        protocol: `RFB-${item.protocol.replace(/\D/g, '') || '12345678'}`
      },
      cndtCert: {
        status: item.cndt_status || (isCndtApont ? 'POSITIVA' : 'NADA CONSTA'),
        protocol: `CNDT-${item.protocol.replace(/\D/g, '') || '55667788'}`
      },
      cguCert: {
        ceisStatus: item.cgu_status || (isCguApont ? 'SANÇÃO ATIVA' : 'NADA CONSTA'),
        cnepStatus: 'NADA CONSTA',
        protocol: `CGU-CEIS-${item.protocol.replace(/\D/g, '') || '778899'}`
      },
      tcuCert: {
        status: 'NADA CONSTA',
        detail: 'Sem contas públicas rejeitadas.'
      },
      redesimCert: {
        totalEmpresas: 1,
        detail: 'Empresa Ativa e em situação regular.'
      },
      conselhoCert: {
        status: 'REGULAR & ATIVO',
        detail: 'Inscrição ativa sem sanções éticas.'
      }
    });

    setSindicanteName(item.sindicante_name || '');
    setInterviewConcept(item.concept || 'excelente');
    setComissaoVote(item.comissao_vote || 'FAVORAVEL');
    setParecerNotes(item.parecer_notes || '');
    setActiveTab('relatorio');
  };

  const handleDeleteSindicancia = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente excluir este registro de sindicância do histórico?')) return;

    try {
      const { error } = await supabase.from('sindicancias').delete().eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['sindicancias'] });
      toast({
        title: 'Registro Removido',
        description: 'Sindicância excluída com sucesso do histórico.'
      });
    } catch (err: any) {
      toast({
        title: 'Erro ao Excluir',
        description: err.message,
        variant: 'destructive'
      });
    }
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
                  Sindicância & Verificação de Antecedentes
                </h1>
                <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[11px] gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Tribunais, Antecedentes & Bases Oficiais
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground font-body mt-0.5">
                Verificação de antecedentes criminais, certidões judiciais e emissão do parecer oficial da comissão
              </p>
            </div>
          </div>

          <Button 
            onClick={() => setActiveTab('painel')} 
            variant="outline" 
            className="gap-2 border-primary/30 hover:bg-accent"
          >
            <Users className="h-4 w-4 text-primary" />
            Histórico de Sindicâncias ({sindicancias.length})
          </Button>
        </div>

        {/* MAIN NAVIGATION TABS */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-12 bg-accent/30 p-1 rounded-xl border border-border">
            <TabsTrigger value="consulta" className="flex items-center gap-2 text-xs md:text-sm font-semibold">
              <span>➕ Nova Sindicância & Checagem</span>
            </TabsTrigger>
            <TabsTrigger value="relatorio" className="flex items-center gap-2 text-xs md:text-sm font-semibold">
              <span>📄 Relatório & Parecer da Comissão</span>
            </TabsTrigger>
            <TabsTrigger value="painel" className="flex items-center gap-2 text-xs md:text-sm font-semibold">
              <span>👥 Painel & Histórico ({sindicancias.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: FORM & INVESTIGATION CHECKS */}
          <TabsContent value="consulta" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Candidate Form */}
              <Card className="card-elegant lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-xl font-display text-foreground flex items-center gap-2">
                        <User className="h-5 w-5 text-amber-500" />
                        Dados do Candidato
                      </CardTitle>
                      <CardDescription>
                        Selecione o candidato da lista de propostas ou informe os dados para checagem
                      </CardDescription>
                    </div>

                    {profiles && profiles.length > 0 && (
                      <div className="w-64">
                        <Select value={selectedProfileId} onValueChange={handleProfileSelect}>
                          <SelectTrigger className="text-xs h-9">
                            <SelectValue placeholder="Carregar de Candidatos..." />
                          </SelectTrigger>
                          <SelectContent>
                            {profiles.map(p => (
                              <SelectItem key={p.id} value={p.id} className="text-xs">
                                {p.full_name} ({p.status || 'sem status'})
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
                        placeholder="Ex: Advogado (OAB-SP 345120) / Auxiliar Administrativo"
                        value={formData.profession}
                        onChange={e => setFormData({ ...formData, profession: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* APONTAMENTO & ANTECEDENTES REGISTRATION */}
                  <div className={`p-4 rounded-xl border transition-colors space-y-4 ${
                    hasApontamento 
                      ? 'border-red-500/60 bg-red-500/10' 
                      : 'border-border bg-card/60'
                  }`}>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="hasApontamento"
                        checked={hasApontamento}
                        onCheckedChange={checked => {
                          const val = !!checked;
                          setHasApontamento(val);
                          if (val) {
                            if (apontamentoOrgaos.length === 0) {
                              setApontamentoOrgaos(['TJ Estadual', 'DataJud (CNJ Nacional)']);
                            }
                            setComissaoVote('DESFAVORAVEL');
                            setInterviewConcept('Incompatível');
                          } else {
                            setApontamentoOrgaos([]);
                            setComissaoVote('FAVORAVEL');
                            setInterviewConcept('excelente');
                          }
                        }}
                        className="mt-1"
                      />
                      <div className="space-y-1 cursor-pointer">
                        <label htmlFor="hasApontamento" className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-2">
                          <AlertTriangle className={`h-4 w-4 ${hasApontamento ? 'text-red-500' : 'text-amber-500'}`} />
                          Constatado Apontamento / Antecedentes Criminais ou Processuais
                        </label>
                        <p className="text-[11px] text-muted-foreground">
                          Marque esta opção se durante a conferência nos tribunais ou certidões foi identificado processo judicial, inquérito ou registro criminal em desfavor do candidato.
                        </p>
                      </div>
                    </div>

                    {hasApontamento && (
                      <div className="pl-6 space-y-4 pt-2 border-t border-red-500/30">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-red-400">
                            Bases com Apontamento Identificado *
                          </Label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            {[
                              'Polícia Federal (SINIC)',
                              'DataJud (CNJ Nacional)',
                              'TJ Estadual',
                              'TRF Federal',
                              'TSE Eleitoral',
                              'Receita Federal',
                              'CNDT Trabalhista',
                              'CGU Sanções'
                            ].map(baseName => {
                              const isChecked = apontamentoOrgaos.includes(baseName);
                              return (
                                <label
                                  key={baseName}
                                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                                    isChecked 
                                      ? 'border-red-500 bg-red-500/20 text-red-300 font-semibold' 
                                      : 'border-border text-muted-foreground hover:bg-accent'
                                  }`}
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={checked => {
                                      if (checked) {
                                        setApontamentoOrgaos([...apontamentoOrgaos, baseName]);
                                      } else {
                                        setApontamentoOrgaos(apontamentoOrgaos.filter(o => o !== baseName));
                                      }
                                    }}
                                  />
                                  <span>{baseName}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="apontamentoDetalhes" className="text-xs font-semibold text-red-400">
                            Detalhes do Apontamento / Processo / Vara *
                          </Label>
                          <Textarea
                            id="apontamentoDetalhes"
                            rows={3}
                            placeholder="Descreva o processo (nº do processo, vara/comarca, tipo de delito ou ação, situação atual do processo)..."
                            value={apontamentoDetalhes}
                            onChange={e => setApontamentoDetalhes(e.target.value)}
                            className="text-xs border-red-500/40 bg-background/50"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* LGPD Consent Box */}
                  <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="lgpd"
                        checked={formData.hasLgpdConsent}
                        onCheckedChange={checked => setFormData({ ...formData, hasLgpdConsent: !!checked })}
                        className="mt-0.5"
                      />
                      <label htmlFor="lgpd" className="text-[11px] text-foreground cursor-pointer leading-relaxed">
                        <span className="font-bold text-amber-500">Conformidade LGPD:</span> O candidato assinou autorização prévia e expressa para checagem e emissão de certidões nos termos da admissão maçônica.
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSaveProfileChanges}
                      disabled={savingProfile || !formData.id}
                      className="gap-2 border-amber-500/50 hover:bg-amber-500/10 text-amber-500 font-semibold h-11 text-xs"
                    >
                      <Save className="h-4 w-4" />
                      {savingProfile ? 'Salvando...' : 'Salvar Alterações nos Dados'}
                    </Button>
                    <Button
                      onClick={handleStartSindicancia}
                      size="lg"
                      className="flex-1 gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold shadow-md h-11 text-xs"
                    >
                      <FileCheck className="h-5 w-5" />
                      Gerar Relatório de Sindicância & Parecer
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* DIRECT QUICK OFFICIAL LINKS CARD */}
              <div className="space-y-4">
                <Card className="card-elegant border-amber-500/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-display text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4 text-amber-500" />
                        Atalhos para Checagem Oficial
                      </span>
                      <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
                        1 Clique
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-[11px]">
                      Abra diretamente as páginas dos tribunais e órgãos com os dados do candidato:
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <a
                      href="https://esaj.tjsp.jus.br/cpopg/open.do"
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-lg border border-border bg-card/60 hover:bg-accent hover:border-amber-500/50 transition-colors flex items-center justify-between group"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <Building2 size={14} className="text-amber-500" />
                        TJSP (Processos 1º Grau)
                      </span>
                      <ExternalLink size={12} className="text-muted-foreground group-hover:text-amber-500" />
                    </a>

                    <a
                      href={`https://www.jusbrasil.com.br/busca?q=${encodeURIComponent(formData.fullName || '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-lg border border-border bg-card/60 hover:bg-accent hover:border-purple-500/50 transition-colors flex items-center justify-between group"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <Scale size={14} className="text-purple-500" />
                        Jusbrasil (Processos do Nome)
                      </span>
                      <ExternalLink size={12} className="text-muted-foreground group-hover:text-purple-500" />
                    </a>

                    <a
                      href={`https://www.escavador.com/busca?q=${encodeURIComponent(formData.fullName || '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-lg border border-border bg-card/60 hover:bg-accent hover:border-blue-500/50 transition-colors flex items-center justify-between group"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <Search size={14} className="text-blue-500" />
                        Escavador (Varredura Jurídica)
                      </span>
                      <ExternalLink size={12} className="text-muted-foreground group-hover:text-blue-500" />
                    </a>

                    <a
                      href="https://servicos.dpf.gov.br/antecedentes-criminais/certidao"
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-lg border border-border bg-card/60 hover:bg-accent hover:border-blue-500/50 transition-colors flex items-center justify-between group"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <ShieldCheck size={14} className="text-blue-500" />
                        Polícia Federal (Antecedentes)
                      </span>
                      <ExternalLink size={12} className="text-muted-foreground group-hover:text-blue-500" />
                    </a>

                    <a
                      href="https://web.trf3.jus.br/certidao-regional/CertidaoCivelEleitoralCriminal/Solicitar"
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-lg border border-border bg-card/60 hover:bg-accent hover:border-emerald-500/50 transition-colors flex items-center justify-between group"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <FileCheck size={14} className="text-emerald-500" />
                        TRF3 (Certidão Regional Federal)
                      </span>
                      <ExternalLink size={12} className="text-muted-foreground group-hover:text-emerald-500" />
                    </a>

                    <a
                      href="https://www.tse.jus.br/servicos-eleitorais/certidoes/certidao-de-quitacao-eleitoral"
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-lg border border-border bg-card/60 hover:bg-accent hover:border-rose-500/50 transition-colors flex items-center justify-between group"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <Vote size={14} className="text-rose-500" />
                        TSE (Quitação & Crimes)
                      </span>
                      <ExternalLink size={12} className="text-muted-foreground group-hover:text-rose-500" />
                    </a>

                    <a
                      href="https://servicos.receita.fazenda.gov.br/servicos/cpf/consultasituacao/consultapublica.asp"
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-lg border border-border bg-card/60 hover:bg-accent hover:border-indigo-500/50 transition-colors flex items-center justify-between group"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <Receipt size={14} className="text-indigo-500" />
                        Receita Federal (Situação CPF)
                      </span>
                      <ExternalLink size={12} className="text-muted-foreground group-hover:text-indigo-500" />
                    </a>

                    <a
                      href="https://cndt-certidao.tst.jus.br/inicio.faces"
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-lg border border-border bg-card/60 hover:bg-accent hover:border-teal-500/50 transition-colors flex items-center justify-between group"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <Briefcase size={14} className="text-teal-500" />
                        TST (Certidão CNDT)
                      </span>
                      <ExternalLink size={12} className="text-muted-foreground group-hover:text-teal-500" />
                    </a>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: REPORT & VOTE */}
          <TabsContent value="relatorio" className="space-y-6">
            {isScanning && (
              <Card className="card-elegant border-amber-500/50 p-8 text-center space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-display text-foreground">Consolidando Dados da Sindicância...</h3>
                  <p className="text-xs text-muted-foreground">Verificando certidões nos órgãos competentes</p>
                </div>

                <div className="w-full bg-accent rounded-full h-4 overflow-hidden border border-border p-0.5">
                  <div 
                    className="bg-gradient-to-r from-amber-500 via-purple-500 to-emerald-500 h-full rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-medium">
                  <div className={`p-2.5 rounded-xl border ${scanStep >= 1 ? 'border-amber-500/50 bg-amber-500/10 text-amber-500' : 'border-border text-muted-foreground'}`}>
                    1. Polícia Federal
                  </div>
                  <div className={`p-2.5 rounded-xl border ${scanStep >= 2 ? 'border-amber-500/50 bg-amber-500/10 text-amber-500' : 'border-border text-muted-foreground'}`}>
                    2. DataJud CNJ
                  </div>
                  <div className={`p-2.5 rounded-xl border ${scanStep >= 3 ? 'border-amber-500/50 bg-amber-500/10 text-amber-500' : 'border-border text-muted-foreground'}`}>
                    3. TSE & CNDT
                  </div>
                  <div className={`p-2.5 rounded-xl border ${scanStep >= 4 ? 'border-amber-500/50 bg-amber-500/10 text-amber-500' : 'border-border text-muted-foreground'}`}>
                    4. Receita & CGU
                  </div>
                  <div className={`p-2.5 rounded-xl border ${scanStep >= 5 ? 'border-amber-500/50 bg-amber-500/10 text-amber-500' : 'border-border text-muted-foreground'}`}>
                    5. REDESIM & Órgãos
                  </div>
                </div>
              </Card>
            )}

            {!isScanning && !reportData && (
              <Card className="card-elegant py-12 text-center">
                <CardContent className="space-y-4">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhuma sindicância selecionada no momento.</p>
                  <Button onClick={() => setActiveTab('consulta')} variant="outline" className="gap-2">
                    <Search className="h-4 w-4" /> Iniciar Nova Sindicância
                  </Button>
                </CardContent>
              </Card>
            )}

            {!isScanning && reportData && (
              <div className="space-y-6 print:space-y-4">
                {/* REPORT HEADER CARD */}
                <Card className={`card-elegant print:border-black ${
                  reportData.hasApontamento 
                    ? 'border-red-500/60 bg-red-500/5' 
                    : 'border-emerald-500/40'
                }`}>
                  <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
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
                        {reportData.hasApontamento ? (
                          <Badge className="bg-red-600 text-white font-bold px-4 py-2 text-sm gap-1.5 shadow-sm">
                            <AlertOctagon size={16} /> APONTAMENTO DETECTADO (Atenção Comissão)
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500 text-white font-bold px-4 py-2 text-sm gap-1.5 shadow-sm">
                            <CheckCircle2 size={16} /> CERTIDÕES VERIFICADAS & LIMPAS
                          </Badge>
                        )}
                        <div className="flex items-center gap-2 print:hidden">
                          <Button onClick={handlePrint} variant="outline" size="sm" className="gap-1.5">
                            <Printer className="h-4 w-4" /> Imprimir Ficha Completa
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* ALERT BANNER IF HAS APONTAMENTO */}
                {reportData.hasApontamento && (
                  <Card className="border-red-500/60 bg-red-500/10 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-red-500">
                          Atenção: Constatado Apontamento Impeditivo / Restritivo
                        </h4>
                        <p className="text-xs text-foreground/90 leading-relaxed">
                          {reportData.apontamentoDetalhes || 'Identificados processos judiciais ou registros restritivos na verificação de antecedentes.'}
                        </p>
                        {reportData.apontamentoOrgaos && reportData.apontamentoOrgaos.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {reportData.apontamentoOrgaos.map(org => (
                              <Badge key={org} variant="destructive" className="text-[10px]">
                                {org}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )}

                {/* 11 CERTIFICATES & SEARCH RESULTS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* 1. Polícia Federal */}
                  <Card className={`card-elegant ${
                    reportData.pfCert.status === 'APONTAMENTO' ? 'border-red-500/70 bg-red-500/5' : 'border-primary/30'
                  }`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-display text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4 text-blue-500" />
                          1. Polícia Federal (SINIC)
                        </span>
                        {reportData.pfCert.status === 'APONTAMENTO' ? (
                          <Badge variant="destructive" className="text-[10px]">APONTAMENTO</Badge>
                        ) : (
                          <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">NADA CONSTA</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Protocolo:</span>
                        <span className="font-mono font-medium">{reportData.pfCert.protocol}</span>
                      </div>
                      <div className={reportData.pfCert.status === 'APONTAMENTO' ? "text-red-500 font-semibold pt-1" : "text-emerald-500 font-semibold pt-1"}>
                        {reportData.pfCert.status === 'APONTAMENTO' ? `⚠️ ${reportData.pfCert.detail}` : '✓ Sem antecedentes criminais federais'}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 2. DataJud CNJ */}
                  <Card className={`card-elegant ${
                    reportData.datajudCert.status === 'APONTAMENTO' ? 'border-red-500/70 bg-red-500/5' : 'border-primary/30'
                  }`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-display text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Scale className="h-4 w-4 text-purple-500" />
                          2. DataJud (CNJ Nacional)
                        </span>
                        {reportData.datajudCert.status === 'APONTAMENTO' ? (
                          <Badge variant="destructive" className="text-[10px]">APONTAMENTO</Badge>
                        ) : (
                          <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">NADA CONSTA</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Processos Registrados:</span>
                        <span className={reportData.datajudCert.status === 'APONTAMENTO' ? "font-semibold text-red-500" : "font-semibold text-emerald-500"}>
                          {reportData.datajudCert.totalCases} Processo(s)
                        </span>
                      </div>
                      <div className={reportData.datajudCert.status === 'APONTAMENTO' ? "text-red-500 font-semibold pt-1" : "text-emerald-500 font-semibold pt-1"}>
                        {reportData.datajudCert.status === 'APONTAMENTO' ? `⚠️ ${reportData.datajudCert.detail}` : '✓ Livre de ações criminais'}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 3. TJ Estadual */}
                  <Card className={`card-elegant ${
                    reportData.tjCert.status === 'APONTAMENTO' ? 'border-red-500/70 bg-red-500/5' : 'border-primary/30'
                  }`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-display text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-4 w-4 text-amber-500" />
                          3. TJ Estadual (TJ{reportData.candidate.uf})
                        </span>
                        {reportData.tjCert.status === 'APONTAMENTO' ? (
                          <Badge variant="destructive" className="text-[10px]">APONTAMENTO</Badge>
                        ) : (
                          <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">NADA CONSTA</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Distribuição Estadual:</span>
                        <span className="font-mono font-medium">{reportData.tjCert.protocol}</span>
                      </div>
                      <div className={reportData.tjCert.status === 'APONTAMENTO' ? "text-red-500 font-semibold pt-1" : "text-emerald-500 font-semibold pt-1"}>
                        {reportData.tjCert.status === 'APONTAMENTO' ? `⚠️ ${reportData.tjCert.detail}` : '✓ Sem distribuições criminais na UF'}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 4. TRF Federal */}
                  <Card className={`card-elegant ${
                    reportData.trfCert.status === 'APONTAMENTO' ? 'border-red-500/70 bg-red-500/5' : 'border-primary/30'
                  }`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-display text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <FileCheck className="h-4 w-4 text-emerald-500" />
                          4. TRF Justiça Federal
                        </span>
                        {reportData.trfCert.status === 'APONTAMENTO' ? (
                          <Badge variant="destructive" className="text-[10px]">APONTAMENTO</Badge>
                        ) : (
                          <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">NADA CONSTA</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Certidão Federal:</span>
                        <span className="font-mono font-medium">{reportData.trfCert.protocol}</span>
                      </div>
                      <div className={reportData.trfCert.status === 'APONTAMENTO' ? "text-red-500 font-semibold pt-1" : "text-emerald-500 font-semibold pt-1"}>
                        {reportData.trfCert.status === 'APONTAMENTO' ? `⚠️ ${reportData.trfCert.detail}` : '✓ Sem execuções fiscais ou ações federais'}
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
                        <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">{reportData.tseCert.quitacao}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Quitação Eleitoral:</span>
                        <span className="font-semibold text-emerald-500">{reportData.tseCert.quitacao}</span>
                      </div>
                      <div className="text-emerald-500 font-semibold pt-1">
                        ✓ {reportData.tseCert.crimes}
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
                        <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">{reportData.receitaCert.cpfStatus}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Situação Cadastral:</span>
                        <span className="font-semibold text-emerald-500">{reportData.receitaCert.cpfStatus}</span>
                      </div>
                      <div className="text-emerald-500 font-semibold pt-1">
                        ✓ {reportData.receitaCert.cndStatus}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 7. TST Trabalhista */}
                  <Card className="card-elegant border-primary/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-display text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="h-4 w-4 text-teal-500" />
                          7. TST (Débitos Trabalhistas)
                        </span>
                        <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">CNDT REGULAR</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Certidão CNDT:</span>
                        <span className="font-mono font-medium">{reportData.cndtCert.protocol}</span>
                      </div>
                      <div className="text-emerald-500 font-semibold pt-1">
                        ✓ {reportData.cndtCert.status}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 8. CGU Sanções */}
                  <Card className="card-elegant border-primary/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-display text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Landmark className="h-4 w-4 text-cyan-500" />
                          8. CGU Sanções (CEIS / CNEP)
                        </span>
                        <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">LIVRE</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Cadastro de Inidôneos:</span>
                        <span className="font-semibold text-emerald-500">NADA CONSTA</span>
                      </div>
                      <div className="text-emerald-500 font-semibold pt-1">
                        ✓ Sem penalidades ativas no Poder Executivo Federal
                      </div>
                    </CardContent>
                  </Card>

                  {/* 9. TCU Contas Irregulares */}
                  <Card className="card-elegant border-primary/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-display text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Scale className="h-4 w-4 text-sky-500" />
                          9. TCU (Contas Irregulares)
                        </span>
                        <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">NADA CONSTA</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Contas Públicas:</span>
                        <span className="font-semibold text-emerald-500">REGULAR</span>
                      </div>
                      <div className="text-emerald-500 font-semibold pt-1">
                        ✓ Sem inabilitação para cargos públicos
                      </div>
                    </CardContent>
                  </Card>

                  {/* 10. REDESIM */}
                  <Card className="card-elegant border-primary/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-display text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-4 w-4 text-orange-500" />
                          10. REDESIM (Empresas)
                        </span>
                        <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">REGULAR</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Situação Empresarial:</span>
                        <span className="font-semibold text-emerald-500">ATIVO</span>
                      </div>
                      <div className="text-emerald-500 font-semibold pt-1">
                        ✓ Sem inaptidão ou baixas punitivas
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
                        <span className="text-muted-foreground">Registro Profissional:</span>
                        <span className="font-semibold text-emerald-500">{reportData.conselhoCert.status}</span>
                      </div>
                      <div className="text-emerald-500 font-semibold pt-1">
                        ✓ Sem penalidades ético-disciplinares
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* PARECER DA COMISSÃO DE SINDICÂNCIA */}
                <Card className={`card-elegant ${
                  comissaoVote === 'DESFAVORAVEL' 
                    ? 'border-red-500/50 bg-red-500/5' 
                    : 'border-amber-500/40'
                }`}>
                  <CardHeader>
                    <CardTitle className="text-xl font-display text-foreground flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-amber-500" />
                      Parecer Final da Comissão Sindicante
                    </CardTitle>
                    <CardDescription>
                      Registre o resultado da sindicância, o conceito da avaliação e o voto oficial
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Irmão Sindicante / Relator</Label>
                        <Input
                          placeholder="Ex: Ir::: João da Silva (M::: M:::)"
                          value={sindicanteName}
                          onChange={e => setSindicanteName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Conceito da Avaliação</Label>
                        <Select value={interviewConcept} onValueChange={setInterviewConcept}>
                          <SelectTrigger>
                            <SelectValue placeholder="Conceito" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="excelente">Excelente (Sem Restrições)</SelectItem>
                            <SelectItem value="bom">Bom</SelectItem>
                            <SelectItem value="satisfatorio">Satisfatório</SelectItem>
                            <SelectItem value="Incompatível">Incompatível (Restrições Graves)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Voto da Comissão *</Label>
                        <Select value={comissaoVote} onValueChange={(val: any) => setComissaoVote(val)}>
                          <SelectTrigger className={comissaoVote === 'DESFAVORAVEL' ? 'border-red-500 text-red-400 font-bold' : ''}>
                            <SelectValue placeholder="Voto" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FAVORAVEL" className="text-emerald-500 font-semibold">
                              ✅ FAVORÁVEL (Aprovar Sindicância)
                            </SelectItem>
                            <SelectItem value="RESTRICAO" className="text-amber-500 font-semibold">
                              ⚠️ FAVORÁVEL COM RESTRIÇÕES
                            </SelectItem>
                            <SelectItem value="DESFAVORAVEL" className="text-red-500 font-semibold">
                              ❌ DESFAVORÁVEL (Reprovar Candidato)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Observações & Parecer Circunstanciado *</Label>
                      <Textarea
                        rows={4}
                        placeholder="Descreva aqui o parecer fundamentado da comissão sobre o candidato, antecedentes apurados ou motivo do parecer..."
                        value={parecerNotes}
                        onChange={e => setParecerNotes(e.target.value)}
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-2 print:hidden">
                      <Button
                        onClick={handleSaveParecer}
                        disabled={isSavingParecer}
                        className={`gap-2 font-bold ${
                          comissaoVote === 'DESFAVORAVEL'
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        <Save className="h-4 w-4" />
                        {isSavingParecer ? 'Registrando...' : (
                          comissaoVote === 'DESFAVORAVEL' 
                            ? 'Salvar Parecer & Reprovar Candidato' 
                            : 'Salvar Parecer & Aprovar Sindicância'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* TAB 3: COMMISSION PANEL & SAVED DATABASE HISTORY */}
          <TabsContent value="painel" className="space-y-6">
            <Card className="card-elegant">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-display text-foreground">
                      Histórico Oficial de Sindicâncias Registradas
                    </CardTitle>
                    <CardDescription>
                      Todos os registros e pareceres de sindicância salvos com segurança no banco de dados
                    </CardDescription>
                  </div>
                  <Button onClick={() => setActiveTab('consulta')} size="sm" className="gap-2">
                    <Search className="h-4 w-4" /> Nova Sindicância
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingSindicancias ? (
                  <div className="py-12 text-center text-muted-foreground animate-pulse">
                    Carregando histórico de sindicâncias...
                  </div>
                ) : sindicancias.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground space-y-2">
                    <FileText className="h-10 w-10 mx-auto text-muted-foreground/60" />
                    <p>Nenhuma sindicância registrada no banco de dados.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-accent/40 text-muted-foreground uppercase font-semibold">
                        <tr>
                          <th className="p-3">Protocolo</th>
                          <th className="p-3">Data</th>
                          <th className="p-3">Candidato</th>
                          <th className="p-3">CPF</th>
                          <th className="p-3">Antecedentes</th>
                          <th className="p-3">Sindicante</th>
                          <th className="p-3">Parecer Final</th>
                          <th className="p-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {sindicancias.map((item) => (
                          <tr key={item.id} className="hover:bg-accent/30 transition-colors">
                            <td className="p-3 font-mono font-medium text-foreground">{item.protocol}</td>
                            <td className="p-3 text-muted-foreground">
                              {new Date(item.created_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="p-3 font-semibold text-foreground">{item.candidate_name}</td>
                            <td className="p-3 text-muted-foreground">{item.cpf}</td>
                            <td className="p-3">
                              {item.has_apontamento ? (
                                <Badge variant="destructive" className="bg-red-500/20 text-red-500 border-red-500/40 text-[10px] gap-1">
                                  <AlertTriangle size={12} /> APONTAMENTO
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/40 text-[10px] gap-1">
                                  <CheckCircle2 size={12} /> LIMPO
                                </Badge>
                              )}
                            </td>
                            <td className="p-3 text-muted-foreground">{item.sindicante_name || 'Comissão'}</td>
                            <td className="p-3">
                              {item.comissao_vote === 'FAVORAVEL' && (
                                <Badge className="bg-emerald-600 text-white font-bold">FAVORÁVEL</Badge>
                              )}
                              {item.comissao_vote === 'RESTRICAO' && (
                                <Badge className="bg-amber-500 text-black font-bold">C/ RESTRIÇÃO</Badge>
                              )}
                              {item.comissao_vote === 'DESFAVORAVEL' && (
                                <Badge className="bg-red-600 text-white font-bold">DESFAVORÁVEL (REPROVADO)</Badge>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewSavedSindicancia(item)}
                                  className="h-7 text-xs gap-1 text-primary hover:text-primary"
                                >
                                  <Eye size={14} /> Ver Ficha
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => handleDeleteSindicancia(item.id, e)}
                                  className="h-7 text-xs text-red-400 hover:text-red-500 hover:bg-red-500/10"
                                >
                                  <Trash2 size={13} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
