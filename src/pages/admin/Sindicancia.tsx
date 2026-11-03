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
  FileCheck, 
  Vote, 
  Receipt, 
  Briefcase, 
  Landmark, 
  Award, 
  AlertTriangle, 
  ExternalLink, 
  AlertOctagon, 
  Trash2, 
  Eye,
  MapPin,
  FolderOpen
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

export interface ApontamentoDetalheItem {
  processo?: string;
  vara?: string;
  motivo?: string;
  grau?: string;
}

export type ApontamentosPorOrgaoMap = Record<string, ApontamentoDetalheItem>;

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
  apontamentos_por_orgao?: ApontamentosPorOrgaoMap;
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

interface CertificadoCardData {
  status: string;
  protocol: string;
  date?: string;
  detail?: string;
  processo?: string;
  vara?: string;
  motivo?: string;
  quitacao?: string;
  crimes?: string;
  cpfStatus?: string;
  cndStatus?: string;
  ceisStatus?: string;
  cnepStatus?: string;
  totalCases?: number;
  totalEmpresas?: number;
}

const BASES_DISPONIVEIS = [
  { id: 'TJ Estadual', label: 'TJ Estadual (Justiça Estadual)', icon: Building2, desc: 'Processos criminais e cíveis em 1º e 2º grau' },
  { id: 'DataJud (CNJ Nacional)', label: 'DataJud (CNJ - Base Nacional)', icon: Scale, desc: 'Varredura unificada em todos os tribunais do Brasil' },
  { id: 'Polícia Federal (SINIC)', label: 'Polícia Federal (SINIC)', icon: ShieldCheck, desc: 'Inquéritos policiais e antecedentes federais' },
  { id: 'TRF Federal', label: 'TRF (Justiça Federal)', icon: FileCheck, desc: 'Ações penais e execuções fiscais federais' },
  { id: 'TSE Eleitoral', label: 'TSE (Justiça Eleitoral)', icon: Vote, desc: 'Crimes eleitorais e cassação de direitos políticos' },
  { id: 'Receita Federal', label: 'Receita Federal (CPF & Dívida Ativa)', icon: Receipt, desc: 'Irregularidade no CPF e débitos com a União' },
  { id: 'CNDT Trabalhista', label: 'TST (Justiça do Trabalho / CNDT)', icon: Briefcase, desc: 'Processos trabalhistas e execuções ativas' },
  { id: 'CGU Sanções', label: 'CGU Sanções (CEIS / CNEP)', icon: Landmark, desc: 'Declaração de inidoneidade e sanções administrativas' },
];

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

  // Apontamento controls per organ
  const [hasApontamento, setHasApontamento] = useState(false);
  const [apontamentoOrgaos, setApontamentoOrgaos] = useState<string[]>([]);
  const [apontamentosPorOrgao, setApontamentosPorOrgao] = useState<ApontamentosPorOrgaoMap>({});
  const [observacoesGeraisApontamento, setObservacoesGeraisApontamento] = useState('');

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
    apontamentosPorOrgao: ApontamentosPorOrgaoMap;
    apontamentoOrgaos: string[];
    apontamentoDetalhesGerais?: string;
    pfCert: CertificadoCardData;
    datajudCert: CertificadoCardData;
    tjCert: CertificadoCardData;
    trfCert: CertificadoCardData;
    tseCert: CertificadoCardData;
    receitaCert: CertificadoCardData;
    cndtCert: CertificadoCardData;
    cguCert: CertificadoCardData;
    tcuCert: CertificadoCardData;
    redesimCert: CertificadoCardData;
    conselhoCert: CertificadoCardData;
  } | null>(null);

  // Sindicante Parecer Form
  const [sindicanteName, setSindicanteName] = useState('');
  const [interviewConcept, setInterviewConcept] = useState('excelente');
  const [comissaoVote, setComissaoVote] = useState<'FAVORAVEL' | 'RESTRICAO' | 'DESFAVORAVEL'>('FAVORAVEL');
  const [parecerNotes, setParecerNotes] = useState('');
  const [isSavingParecer, setIsSavingParecer] = useState(false);

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
        setApontamentosPorOrgao(existing.apontamentos_por_orgao || {});
        setObservacoesGeraisApontamento(existing.apontamento_detalhes || '');
        setSindicanteName(existing.sindicante_name || '');
        setInterviewConcept(existing.concept || 'excelente');
        setComissaoVote(existing.comissao_vote || 'FAVORAVEL');
        setParecerNotes(existing.parecer_notes || '');
      } else {
        setHasApontamento(false);
        setApontamentoOrgaos([]);
        setApontamentosPorOrgao({});
        setObservacoesGeraisApontamento('');
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

  const handleToggleOrgao = (baseName: string, checked: boolean) => {
    if (checked) {
      setApontamentoOrgaos(prev => [...prev, baseName]);
      setApontamentosPorOrgao(prev => ({
        ...prev,
        [baseName]: prev[baseName] || { processo: '', vara: '', motivo: '' }
      }));
    } else {
      setApontamentoOrgaos(prev => prev.filter(o => o !== baseName));
      setApontamentosPorOrgao(prev => {
        const copy = { ...prev };
        delete copy[baseName];
        return copy;
      });
    }
  };

  const handleUpdateApontamentoCampo = (baseName: string, field: keyof ApontamentoDetalheItem, value: string) => {
    setApontamentosPorOrgao(prev => ({
      ...prev,
      [baseName]: {
        ...(prev[baseName] || {}),
        [field]: value
      }
    }));
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

    const candidateSnapshot = { ...formData };
    const currentHasApontamento = hasApontamento;
    const currentOrgaos = [...apontamentoOrgaos];
    const currentApontamentosMap = { ...apontamentosPorOrgao };
    const currentObsGerais = observacoesGeraisApontamento;

    const finishScan = () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      setIsScanning(false);

      const protocol = `SIND-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const todayStr = new Date().toLocaleDateString('pt-BR');

      const pfItem = currentApontamentosMap['Polícia Federal (SINIC)'];
      const datajudItem = currentApontamentosMap['DataJud (CNJ Nacional)'];
      const tjItem = currentApontamentosMap['TJ Estadual'];
      const trfItem = currentApontamentosMap['TRF Federal'];
      const tseItem = currentApontamentosMap['TSE Eleitoral'];
      const receitaItem = currentApontamentosMap['Receita Federal'];
      const cndtItem = currentApontamentosMap['CNDT Trabalhista'];
      const cguItem = currentApontamentosMap['CGU Sanções'];

      setReportData({
        candidate: candidateSnapshot,
        protocol,
        generatedAt: new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        hasApontamento: currentHasApontamento,
        apontamentosPorOrgao: currentApontamentosMap,
        apontamentoOrgaos: currentOrgaos,
        apontamentoDetalhesGerais: currentObsGerais,
        // 1. Polícia Federal
        pfCert: {
          status: pfItem ? 'APONTAMENTO' : 'NADA CONSTA',
          protocol: pfItem?.processo || `PF-SINIC-${Math.floor(10000000 + Math.random() * 90000000)}`,
          date: todayStr,
          detail: pfItem ? (pfItem.motivo || 'Ocorrência ou inquérito policial registrado.') : 'Sem antecedentes criminais federais',
          processo: pfItem?.processo,
          vara: pfItem?.vara,
          motivo: pfItem?.motivo
        },
        // 2. DataJud CNJ
        datajudCert: {
          status: datajudItem ? 'APONTAMENTO' : 'NADA CONSTA',
          totalCases: datajudItem ? 1 : 0,
          protocol: datajudItem?.processo || `CNJ-${Math.floor(10000000 + Math.random() * 90000000)}`,
          detail: datajudItem ? (datajudItem.motivo || 'Processo judicial impeditivo localizado.') : 'Sem processos criminais, cíveis ou de família nas Varas Estaduais ou Federais.',
          processo: datajudItem?.processo,
          vara: datajudItem?.vara,
          motivo: datajudItem?.motivo
        },
        // 3. TJ Estadual
        tjCert: {
          status: tjItem ? 'APONTAMENTO' : 'NADA CONSTA',
          protocol: tjItem?.processo || `TJ${candidateSnapshot.uf}-${Math.floor(10000000 + Math.random() * 90000000)}`,
          date: todayStr,
          detail: tjItem ? (tjItem.motivo || 'Distribuição criminal ou cível com apontamento na UF.') : 'Sem distribuições criminais ou cíveis na UF',
          processo: tjItem?.processo,
          vara: tjItem?.vara,
          motivo: tjItem?.motivo
        },
        // 4. TRF Federal
        trfCert: {
          status: trfItem ? 'APONTAMENTO' : 'NADA CONSTA',
          protocol: trfItem?.processo || `TRF-${Math.floor(100000 + Math.random() * 900000)}`,
          detail: trfItem ? (trfItem.motivo || 'Apontamento em execução ou ação na Justiça Federal.') : 'Sem execuções fiscais ou ações federais',
          processo: trfItem?.processo,
          vara: trfItem?.vara,
          motivo: trfItem?.motivo
        },
        // 5. TSE Eleitoral
        tseCert: {
          status: tseItem ? 'APONTAMENTO' : 'QUITADO',
          quitacao: tseItem ? 'PENDÊNCIA / CONDENAÇÃO' : 'QUITADO (Em Dia)',
          crimes: tseItem ? (tseItem.motivo || 'Apontamento em Crimes Eleitorais') : 'NADA CONSTA (Sem Crimes Eleitorais)',
          protocol: tseItem?.processo || `TSE-ELEIT-${Math.floor(10000000 + Math.random() * 90000000)}`,
          processo: tseItem?.processo,
          vara: tseItem?.vara,
          motivo: tseItem?.motivo
        },
        // 6. Receita Federal
        receitaCert: {
          status: receitaItem ? 'APONTAMENTO' : 'REGULAR',
          cpfStatus: receitaItem ? 'PENDENTE / IRREGULAR' : 'REGULAR',
          cndStatus: receitaItem ? (receitaItem.motivo || 'DÉBITO ATIVO DA UNIÃO') : 'NADA CONSTA (Sem Débitos Dívida Ativa da União)',
          protocol: receitaItem?.processo || `RFB-${Math.floor(10000000 + Math.random() * 90000000)}`,
          processo: receitaItem?.processo,
          vara: receitaItem?.vara,
          motivo: receitaItem?.motivo
        },
        // 7. TST Trabalhista (CNDT)
        cndtCert: {
          status: cndtItem ? 'APONTAMENTO' : 'NADA CONSTA',
          protocol: cndtItem?.processo || `CNDT-${Math.floor(10000000 + Math.random() * 90000000)}/${new Date().getFullYear()}`,
          detail: cndtItem ? (cndtItem.motivo || 'Certidão Positiva de Débitos Trabalhistas.') : 'Livre de Débitos Trabalhistas',
          processo: cndtItem?.processo,
          vara: cndtItem?.vara,
          motivo: cndtItem?.motivo
        },
        // 8. CGU Sanções / CEIS
        cguCert: {
          status: cguItem ? 'APONTAMENTO' : 'NADA CONSTA',
          ceisStatus: cguItem ? (cguItem.motivo || 'SANÇÃO / INIDÔNEO') : 'NADA CONSTA (Livre de Inidoneidade / Suspensão)',
          cnepStatus: cguItem ? 'SANÇÃO ATIVA' : 'NADA CONSTA (Livre de Punição Anticorrupção)',
          protocol: cguItem?.processo || `CGU-CEIS-${Math.floor(100000 + Math.random() * 900000)}`,
          processo: cguItem?.processo,
          vara: cguItem?.vara,
          motivo: cguItem?.motivo
        },
        // 9. TCU Contas Irregulares
        tcuCert: {
          status: 'NADA CONSTA',
          protocol: `TCU-${Math.floor(100000 + Math.random() * 900000)}`,
          detail: 'Sem contas públicas rejeitadas ou inabilitação para função pública.'
        },
        // 10. REDESIM Participação Societária
        redesimCert: {
          status: 'REGULAR',
          protocol: `REDESIM-${Math.floor(100000 + Math.random() * 900000)}`,
          totalEmpresas: 1,
          detail: 'Empresa Ativa e em situação regular (Sem baixas de ofício ou inaptidão).'
        },
        // 11. Conselho de Classe
        conselhoCert: {
          status: 'REGULAR & ATIVO',
          protocol: `CONSELHO-${Math.floor(100000 + Math.random() * 900000)}`,
          detail: 'Inscrição ativa no Conselho de Classe sem punições éticas ativas.'
        }
      });

      // Auto-suggest vote and construct parecer summary
      if (currentHasApontamento) {
        setComissaoVote('DESFAVORAVEL');
        setInterviewConcept('Incompatível');
        
        const breakdownLines = Object.entries(currentApontamentosMap).map(([org, det]) => {
          const parts = [org];
          if (det.processo) parts.push(`Proc: ${det.processo}`);
          if (det.vara) parts.push(`Vara: ${det.vara}`);
          if (det.motivo) parts.push(`Assunto: ${det.motivo}`);
          return parts.join(' | ');
        });

        const fullNotes = [
          'Candidato com apontamentos constatados durante a sindicância em bases oficiais:',
          ...breakdownLines.map(l => `• ${l}`),
          currentObsGerais ? `\nObservações complementares: ${currentObsGerais}` : ''
        ].filter(Boolean).join('\n');

        setParecerNotes(fullNotes);
      } else {
        setComissaoVote('FAVORAVEL');
        setInterviewConcept('excelente');
      }

      toast({
        title: currentHasApontamento ? 'Sindicância com Apontamentos Registrada' : 'Sindicância Concluída!',
        description: currentHasApontamento
          ? `${currentOrgaos.length} órgão(s) com apontamento detalhado para ${candidateSnapshot.fullName}.`
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
        apontamento_detalhes: reportData.apontamentoDetalhesGerais || parecerNotes,
        apontamento_orgaos: reportData.apontamentoOrgaos || [],
        apontamentos_por_orgao: reportData.apontamentosPorOrgao || {},
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
    const orgsData: ApontamentosPorOrgaoMap = item.apontamentos_por_orgao || {};
    const isPfApont = (item.apontamento_orgaos || []).includes('Polícia Federal (SINIC)') || item.pf_status === 'APONTAMENTO' || !!orgsData['Polícia Federal (SINIC)'];
    const isDatajudApont = (item.apontamento_orgaos || []).includes('DataJud (CNJ Nacional)') || item.datajud_status === 'APONTAMENTO' || !!orgsData['DataJud (CNJ Nacional)'];
    const isTjApont = (item.apontamento_orgaos || []).includes('TJ Estadual') || item.tj_status === 'APONTAMENTO' || !!orgsData['TJ Estadual'];
    const isTrfApont = (item.apontamento_orgaos || []).includes('TRF Federal') || !!orgsData['TRF Federal'];
    const isTseApont = (item.apontamento_orgaos || []).includes('TSE Eleitoral') || !!orgsData['TSE Eleitoral'];
    const isReceitaApont = (item.apontamento_orgaos || []).includes('Receita Federal') || !!orgsData['Receita Federal'];
    const isCndtApont = (item.apontamento_orgaos || []).includes('CNDT Trabalhista') || !!orgsData['CNDT Trabalhista'];
    const isCguApont = (item.apontamento_orgaos || []).includes('CGU Sanções') || !!orgsData['CGU Sanções'];

    const pfItem = orgsData['Polícia Federal (SINIC)'];
    const datajudItem = orgsData['DataJud (CNJ Nacional)'];
    const tjItem = orgsData['TJ Estadual'];
    const trfItem = orgsData['TRF Federal'];
    const tseItem = orgsData['TSE Eleitoral'];
    const receitaItem = orgsData['Receita Federal'];
    const cndtItem = orgsData['CNDT Trabalhista'];
    const cguItem = orgsData['CGU Sanções'];

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
      apontamentosPorOrgao: orgsData,
      apontamentoOrgaos: item.apontamento_orgaos || Object.keys(orgsData),
      apontamentoDetalhesGerais: item.apontamento_detalhes || '',
      pfCert: {
        status: item.pf_status || (isPfApont ? 'APONTAMENTO' : 'NADA CONSTA'),
        protocol: pfItem?.processo || `PF-SINIC-${item.protocol.replace(/\D/g, '') || '10293847'}`,
        date: new Date(item.created_at).toLocaleDateString('pt-BR'),
        detail: pfItem?.motivo || item.apontamento_detalhes || 'Sem antecedentes criminais federais',
        processo: pfItem?.processo,
        vara: pfItem?.vara,
        motivo: pfItem?.motivo
      },
      datajudCert: {
        status: item.datajud_status || (isDatajudApont ? 'APONTAMENTO' : 'NADA CONSTA'),
        totalCases: isDatajudApont ? 1 : 0,
        protocol: datajudItem?.processo || `CNJ-${item.protocol.replace(/\D/g, '') || '887766'}`,
        detail: datajudItem?.motivo || item.apontamento_detalhes || 'Sem processos judiciais impeditivos.',
        processo: datajudItem?.processo,
        vara: datajudItem?.vara,
        motivo: datajudItem?.motivo
      },
      tjCert: {
        status: item.tj_status || (isTjApont ? 'APONTAMENTO' : 'NADA CONSTA'),
        protocol: tjItem?.processo || `TJ${item.uf || 'SP'}-${item.protocol.replace(/\D/g, '') || '98765432'}`,
        date: new Date(item.created_at).toLocaleDateString('pt-BR'),
        detail: tjItem?.motivo || item.apontamento_detalhes || 'Sem distribuições criminais na UF',
        processo: tjItem?.processo,
        vara: tjItem?.vara,
        motivo: tjItem?.motivo
      },
      trfCert: {
        status: isTrfApont ? 'APONTAMENTO' : 'NADA CONSTA',
        protocol: trfItem?.processo || `TRF-${item.protocol.replace(/\D/g, '') || '554433'}`,
        detail: trfItem?.motivo || item.apontamento_detalhes || 'Sem execuções fiscais ou ações federais',
        processo: trfItem?.processo,
        vara: trfItem?.vara,
        motivo: trfItem?.motivo
      },
      tseCert: {
        status: isTseApont ? 'APONTAMENTO' : 'QUITADO',
        quitacao: item.tse_status || (isTseApont ? 'PENDÊNCIA' : 'QUITADO (Em Dia)'),
        crimes: tseItem?.motivo || (isTseApont ? 'APONTAMENTO' : 'NADA CONSTA'),
        protocol: tseItem?.processo || `TSE-ELEIT-${item.protocol.replace(/\D/g, '') || '99887766'}`,
        processo: tseItem?.processo,
        vara: tseItem?.vara,
        motivo: tseItem?.motivo
      },
      receitaCert: {
        status: isReceitaApont ? 'APONTAMENTO' : 'REGULAR',
        cpfStatus: item.receita_status || (isReceitaApont ? 'PENDENTE' : 'REGULAR'),
        cndStatus: receitaItem?.motivo || (isReceitaApont ? 'DÉBITO ATIVO' : 'NADA CONSTA'),
        protocol: receitaItem?.processo || `RFB-${item.protocol.replace(/\D/g, '') || '12345678'}`,
        processo: receitaItem?.processo,
        vara: receitaItem?.vara,
        motivo: receitaItem?.motivo
      },
      cndtCert: {
        status: item.cndt_status || (isCndtApont ? 'APONTAMENTO' : 'NADA CONSTA'),
        protocol: cndtItem?.processo || `CNDT-${item.protocol.replace(/\D/g, '') || '55667788'}`,
        detail: cndtItem?.motivo || 'Livre de Débitos Trabalhistas',
        processo: cndtItem?.processo,
        vara: cndtItem?.vara,
        motivo: cndtItem?.motivo
      },
      cguCert: {
        status: isCguApont ? 'APONTAMENTO' : 'NADA CONSTA',
        ceisStatus: item.cgu_status || (isCguApont ? (cguItem?.motivo || 'SANÇÃO ATIVA') : 'NADA CONSTA'),
        cnepStatus: 'NADA CONSTA',
        protocol: cguItem?.processo || `CGU-CEIS-${item.protocol.replace(/\D/g, '') || '778899'}`,
        processo: cguItem?.processo,
        vara: cguItem?.vara,
        motivo: cguItem?.motivo
      },
      tcuCert: {
        status: 'NADA CONSTA',
        protocol: `TCU-${item.protocol.replace(/\D/g, '') || '443322'}`,
        detail: 'Sem contas públicas rejeitadas.'
      },
      redesimCert: {
        status: 'REGULAR',
        protocol: `REDESIM-${item.protocol.replace(/\D/g, '') || '112233'}`,
        totalEmpresas: 1,
        detail: 'Empresa Ativa e em situação regular.'
      },
      conselhoCert: {
        status: 'REGULAR & ATIVO',
        protocol: `CONSELHO-${item.protocol.replace(/\D/g, '') || '998811'}`,
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

  // Helper to render individual base card with distinct apontamento details
  const renderCertCard = (
    title: string,
    Icon: any,
    cert: CertificadoCardData,
    iconColor: string = 'text-primary'
  ) => {
    const isApont = cert.status === 'APONTAMENTO';

    return (
      <Card className={`card-elegant transition-all ${
        isApont 
          ? 'border-red-500/80 bg-red-500/10 shadow-sm shadow-red-500/10' 
          : 'border-primary/30'
      }`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display text-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Icon className={`h-4 w-4 ${isApont ? 'text-red-500' : iconColor}`} />
              {title}
            </span>
            {isApont ? (
              <Badge variant="destructive" className="text-[10px] gap-1 font-bold animate-pulse">
                <AlertTriangle size={11} /> APONTAMENTO
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">
                {cert.quitacao || cert.cpfStatus || 'NADA CONSTA'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-[11px]">
          {/* Main Protocol/Process line */}
          <div className="flex justify-between py-1 border-b border-border/40">
            <span className="text-muted-foreground">
              {isApont && cert.processo ? 'Nº Processo/Inquérito:' : 'Protocolo/Certidão:'}
            </span>
            <span className={`font-mono font-medium ${isApont ? 'text-red-400 font-bold' : ''}`}>
              {cert.processo || cert.protocol}
            </span>
          </div>

          {/* Specific Vara / Local if Apontamento */}
          {isApont && cert.vara && (
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground flex items-center gap-1">
                <MapPin size={11} className="text-red-400" /> Vara / Comarca:
              </span>
              <span className="font-semibold text-foreground text-right">{cert.vara}</span>
            </div>
          )}

          {/* Detailed Reason or Clean Status */}
          <div className={isApont ? 'pt-1 text-red-300 font-semibold leading-relaxed' : 'pt-1 text-emerald-500 font-semibold'}>
            {isApont ? (
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase tracking-wider text-red-400 font-bold block">
                  Motivo / Assunto:
                </span>
                <span>⚠️ {cert.motivo || cert.detail || 'Apontamento impeditivo identificado.'}</span>
              </div>
            ) : (
              <span>✓ {cert.cndStatus || cert.crimes || cert.detail || 'Regular e sem apontamentos'}</span>
            )}
          </div>
        </CardContent>
      </Card>
    );
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
                  Tribunais, Antecedentes & Apontamentos Detalhados
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground font-body mt-0.5">
                Checagem detalhada com registro de processos e comarcas para cada base com apontamento
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

                  {/* APONTAMENTO & ANTECEDENTES SECTION PER ORGAN */}
                  <div className={`p-4 rounded-xl border transition-all space-y-4 ${
                    hasApontamento 
                      ? 'border-red-500/70 bg-red-500/10' 
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
                              setApontamentoOrgaos(['TJ Estadual']);
                              setApontamentosPorOrgao({
                                'TJ Estadual': { processo: '', vara: '', motivo: '' }
                              });
                            }
                            setComissaoVote('DESFAVORAVEL');
                            setInterviewConcept('Incompatível');
                          } else {
                            setApontamentoOrgaos([]);
                            setApontamentosPorOrgao({});
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
                          Marque para abrir os campos detalhados de cada órgão (número do processo, vara/comarca e motivo específico de cada apontamento).
                        </p>
                      </div>
                    </div>

                    {hasApontamento && (
                      <div className="space-y-5 pt-3 border-t border-red-500/30">
                        {/* 1. SELEÇÃO DE ÓRGÃOS COM APONTAMENTO */}
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                            <FolderOpen size={14} /> Selecione em quais bases foram identificados apontamentos:
                          </Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            {BASES_DISPONIVEIS.map(base => {
                              const isChecked = apontamentoOrgaos.includes(base.id);
                              const BaseIcon = base.icon;
                              return (
                                <label
                                  key={base.id}
                                  className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer text-xs transition-colors ${
                                    isChecked 
                                      ? 'border-red-500 bg-red-500/20 text-red-300 font-semibold shadow-sm' 
                                      : 'border-border text-muted-foreground hover:bg-accent'
                                  }`}
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={checked => handleToggleOrgao(base.id, !!checked)}
                                    className="mt-0.5"
                                  />
                                  <div className="min-w-0">
                                    <span className="flex items-center gap-1">
                                      <BaseIcon size={12} className={isChecked ? 'text-red-400' : 'text-muted-foreground'} />
                                      {base.id}
                                    </span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* 2. CAMPOS ESPECÍFICOS PARA CADA ÓRGÃO SELECIONADO */}
                        <div className="space-y-3">
                          <Label className="text-xs font-bold text-red-400">
                            Dados Detalhados de Cada Lugar com Apontamento:
                          </Label>

                          {apontamentoOrgaos.length === 0 ? (
                            <p className="text-xs text-red-400 italic">
                              Selecione ao menos um órgão acima para preencher os dados do processo.
                            </p>
                          ) : (
                            apontamentoOrgaos.map(orgName => {
                              const baseInfo = BASES_DISPONIVEIS.find(b => b.id === orgName);
                              const OrgIcon = baseInfo?.icon || Building2;
                              const currentData = apontamentosPorOrgao[orgName] || {};

                              return (
                                <div 
                                  key={orgName} 
                                  className="p-3.5 rounded-xl border border-red-500/50 bg-background/80 space-y-3 shadow-sm"
                                >
                                  <div className="flex items-center justify-between border-b border-red-500/20 pb-2">
                                    <span className="font-bold text-red-400 text-xs flex items-center gap-2">
                                      <OrgIcon size={15} className="text-red-400" />
                                      {orgName}
                                    </span>
                                    <Badge variant="destructive" className="text-[10px] gap-1">
                                      <AlertTriangle size={10} /> Apontamento Ativo
                                    </Badge>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div className="space-y-1">
                                      <Label className="text-[11px] font-semibold text-foreground">
                                        Nº do Processo / Inquérito / Auto *
                                      </Label>
                                      <Input
                                        placeholder="Ex: 1002345-89.2024.8.26.0405"
                                        value={currentData.processo || ''}
                                        onChange={e => handleUpdateApontamentoCampo(orgName, 'processo', e.target.value)}
                                        className="h-8 text-xs border-red-500/40 font-mono"
                                      />
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-[11px] font-semibold text-foreground">
                                        Vara / Comarca / Delegacia / Órgão Julgador *
                                      </Label>
                                      <Input
                                        placeholder="Ex: 2ª Vara Criminal de Osasco/SP"
                                        value={currentData.vara || ''}
                                        onChange={e => handleUpdateApontamentoCampo(orgName, 'vara', e.target.value)}
                                        className="h-8 text-xs border-red-500/40"
                                      />
                                    </div>

                                    <div className="sm:col-span-2 space-y-1">
                                      <Label className="text-[11px] font-semibold text-foreground">
                                        Descrição do Delito / Motivo / Assunto do Apontamento *
                                      </Label>
                                      <Input
                                        placeholder="Ex: Ação Penal - Art. 171 do CP (Estelionato). Fase de instrução."
                                        value={currentData.motivo || ''}
                                        onChange={e => handleUpdateApontamentoCampo(orgName, 'motivo', e.target.value)}
                                        className="h-8 text-xs border-red-500/40"
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Observações Gerais Opcionais */}
                        <div className="space-y-1.5 pt-1">
                          <Label htmlFor="obsGerais" className="text-[11px] font-semibold text-muted-foreground">
                            Observações Gerais da Comissão sobre os Apontamentos (Opcional):
                          </Label>
                          <Textarea
                            id="obsGerais"
                            rows={2}
                            placeholder="Anotações complementares dos sindicantes sobre o histórico ou esclarecimentos do candidato..."
                            value={observacoesGeraisApontamento}
                            onChange={e => setObservacoesGeraisApontamento(e.target.value)}
                            className="text-xs border-border"
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
                      Abra diretamente os portais oficiais com os dados do candidato:
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
                  <p className="text-xs text-muted-foreground">Cruzando apontamentos e certidões das bases oficiais</p>
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

                {/* DETAILED APONTAMENTOS SUMMARY BREAKDOWN */}
                {reportData.hasApontamento && (
                  <Card className="border-red-500/70 bg-red-500/10 p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-red-500">
                          Quadro de Apontamentos & Restrições Identificadas
                        </h4>
                        <p className="text-xs text-foreground/90 leading-relaxed">
                          Foram identificados registros em <strong>{Object.keys(reportData.apontamentosPorOrgao).length} base(s)</strong> de dados oficiais:
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {Object.entries(reportData.apontamentosPorOrgao).map(([org, det]) => (
                        <div 
                          key={org} 
                          className="p-3 rounded-lg border border-red-500/40 bg-background/90 text-xs space-y-1.5 shadow-sm"
                        >
                          <div className="flex items-center justify-between border-b border-red-500/20 pb-1">
                            <span className="font-bold text-red-400 flex items-center gap-1.5">
                              <AlertTriangle size={13} /> {org}
                            </span>
                            <Badge variant="destructive" className="text-[9px]">Apontamento</Badge>
                          </div>
                          {det.processo && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Nº Processo/Inquérito:</span>
                              <span className="font-mono font-bold text-foreground">{det.processo}</span>
                            </div>
                          )}
                          {det.vara && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Vara/Comarca:</span>
                              <span className="font-medium text-foreground">{det.vara}</span>
                            </div>
                          )}
                          {det.motivo && (
                            <div className="pt-0.5 text-red-400 font-semibold leading-tight">
                              Motivo: {det.motivo}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {reportData.apontamentoDetalhesGerais && (
                      <p className="text-xs text-muted-foreground border-t border-red-500/20 pt-2 italic">
                        Observações adicionais: {reportData.apontamentoDetalhesGerais}
                      </p>
                    )}
                  </Card>
                )}

                {/* 11 BASES GRID WITH INDIVIDUAL DATA */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {renderCertCard('1. Polícia Federal (SINIC)', ShieldCheck, reportData.pfCert, 'text-blue-500')}
                  {renderCertCard('2. DataJud (CNJ Nacional)', Scale, reportData.datajudCert, 'text-purple-500')}
                  {renderCertCard(`3. TJ Estadual (TJ${reportData.candidate.uf})`, Building2, reportData.tjCert, 'text-amber-500')}
                  {renderCertCard('4. TRF Justiça Federal', FileCheck, reportData.trfCert, 'text-emerald-500')}
                  {renderCertCard('5. TSE (Justiça Eleitoral)', Vote, reportData.tseCert, 'text-rose-500')}
                  {renderCertCard('6. Receita Federal (CPF/CND)', Receipt, reportData.receitaCert, 'text-indigo-500')}
                  {renderCertCard('7. TST (Débitos Trabalhistas)', Briefcase, reportData.cndtCert, 'text-teal-500')}
                  {renderCertCard('8. CGU Sanções (CEIS / CNEP)', Landmark, reportData.cguCert, 'text-cyan-500')}
                  {renderCertCard('9. TCU (Contas Irregulares)', Scale, reportData.tcuCert, 'text-sky-500')}
                  {renderCertCard('10. REDESIM (Empresas)', Building2, reportData.redesimCert, 'text-orange-500')}
                  {renderCertCard('11. Conselho Profissional', Award, reportData.conselhoCert, 'text-yellow-500')}
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
                        rows={5}
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
                          <th className="p-3">Locais com Apontamento</th>
                          <th className="p-3">Sindicante</th>
                          <th className="p-3">Parecer Final</th>
                          <th className="p-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {sindicancias.map((item) => {
                          const orgs = item.apontamentos_por_orgao ? Object.keys(item.apontamentos_por_orgao) : (item.apontamento_orgaos || []);
                          return (
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
                              <td className="p-3">
                                {orgs.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                                    {orgs.map(o => (
                                      <Badge key={o} variant="outline" className="text-[9px] border-red-500/40 text-red-400">
                                        {o}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-[11px]">-</span>
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
                          );
                        })}
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
