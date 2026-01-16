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
import { useLodgeMembers } from '@/hooks/useLodgeMembers';
import { MemberSelectField } from '@/components/admin/MemberSelectField';
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
  { value: 'instalacao_posse', label: 'Sessão Magna de Instalação e Posse', hasNames: true, nameLabel: 'Oficiais a serem empossados' },
  { value: 'publica', label: 'Sessão Pública', hasNames: false },
  { value: 'branca', label: 'Sessão Branca', hasNames: false },
  { value: 'funebre', label: 'Sessão Fúnebre', hasNames: false },
];

const INVITE_TEMPLATES = [
  { value: 'moderno', label: 'Modelo Moderno', description: 'Design contemporâneo com gradiente azul' },
  { value: 'classico', label: 'Modelo Clássico (Vertical)', description: 'Design tradicional vertical' },
  { value: 'classico_horizontal', label: 'Modelo Clássico (Horizontal)', description: 'Design tradicional horizontal com colunas' },
  { value: 'instalacao', label: 'Convite Maçônico Tradicional', description: 'Template tradicional com colunas e piso mosaico' },
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
  const [template, setTemplate] = useState('moderno');
  const [veneravelMestre, setVeneravelMestre] = useState('');
  const inviteRef = useRef<HTMLDivElement>(null);

  const selectedLodge = lodges?.find(l => l.id === lodgeId);
  const selectedSessionType = SESSION_TYPES.find(t => t.value === sessionType);
  const { data: lodgeMembers = [] } = useLodgeMembers(lodgeId);

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

  const getDayOfWeek = () => {
    if (!date) return '';
    return format(date, 'EEEE', { locale: ptBR });
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

  const renderModernoTemplate = () => (
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
        {veneravelMestre && (
          <p className="text-white text-sm font-semibold mb-2">
            {veneravelMestre}
            <span className="text-[#c9a227] text-xs block">Venerável Mestre</span>
          </p>
        )}
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
  );

  const renderClassicoTemplate = () => (
    <div 
      ref={inviteRef}
      className="w-[450px] relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #87CEEB 0%, #B0E0E6 50%, #87CEEB 100%)',
      }}
    >
      {/* Golden border frame */}
      <div className="absolute inset-2 border-4 border-[#DAA520] rounded-lg pointer-events-none" 
        style={{ 
          boxShadow: 'inset 0 0 0 2px #B8860B, 0 0 0 2px #DAA520',
        }} 
      />
      
      {/* Inner decorative frame */}
      <div className="absolute inset-6 border-2 border-[#DAA520]/50 rounded pointer-events-none" />

      {/* Top banner - A.G.D.G.A.D.U */}
      <div className="relative pt-4 px-8">
        <div className="flex justify-center mb-2">
          <div className="bg-gradient-to-r from-[#DAA520] via-[#FFD700] to-[#DAA520] px-6 py-1 rounded-full">
            <p className="text-[#1a365d] text-xs font-bold tracking-widest">
              A∴G∴D∴G∴A∴D∴U∴
            </p>
          </div>
        </div>

        {/* Logos row */}
        <div className="flex items-center justify-center gap-3 py-2">
          <div className="w-12 h-12 rounded-full bg-[#1a365d] flex items-center justify-center border-2 border-[#DAA520]">
            <span className="text-[#DAA520] text-lg">☽</span>
          </div>
          <img 
            src="/images/logo-goib-edital.png" 
            alt="Logo GOIB" 
            className="h-16"
          />
          {(selectedLodge as any)?.logo_url && (
            <img 
              src={(selectedLodge as any).logo_url} 
              alt={`Logo ${selectedLodge?.name}`}
              className="h-14 object-contain"
            />
          )}
          <div className="w-12 h-12 rounded-full bg-[#FFD700] flex items-center justify-center border-2 border-[#DAA520]">
            <span className="text-[#1a365d] text-lg">☀</span>
          </div>
        </div>
      </div>

      {/* Main content area with columns */}
      <div className="relative flex">
        {/* Left Column */}
        <div className="w-14 flex flex-col items-center justify-end pb-0">
          <div 
            className="w-8 flex-1 mx-auto rounded-t-lg"
            style={{
              background: 'linear-gradient(180deg, #DAA520 0%, #B8860B 50%, #8B6914 100%)',
              boxShadow: '2px 0 4px rgba(0,0,0,0.3)',
            }}
          />
          <div 
            className="w-10 h-6"
            style={{
              background: 'linear-gradient(180deg, #DAA520, #B8860B)',
            }}
          />
        </div>

        {/* Center content */}
        <div className="flex-1 px-4 py-4 text-center">
          {/* Title */}
          <h1 
            className="text-3xl font-serif mb-4"
            style={{ 
              fontFamily: 'Georgia, serif',
              color: '#1a365d',
              textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
            }}
          >
            Convite
          </h1>

          {/* Main invitation text */}
          <div className="bg-[#FCF8E3]/80 rounded-lg p-4 border border-[#DAA520]/40">
            <p className="text-[#1a365d] text-xs leading-relaxed mb-3">
              A Aug∴ e Resp∴ Loj∴ Simb∴ <strong>{selectedLodge?.name}</strong>, 
              tem a honra e a satisfação de convidar a todos os IIr∴ para iluminar 
              e abrilhantar nossos trabalhos com vossa ilustre presença na
            </p>

            <h2 
              className="text-lg font-bold mb-2"
              style={{ 
                fontFamily: 'Georgia, serif',
                color: '#1a365d',
              }}
            >
              {getSessionTypeLabel()}
            </h2>

            {/* Names section */}
            {selectedSessionType?.hasNames && getNamesArray().length > 0 && (
              <div className="my-3">
                <p className="text-[#8B4513] text-xs mb-1">{selectedSessionType.nameLabel}:</p>
                {getNamesArray().map((name, index) => (
                  <p 
                    key={index} 
                    className="text-base font-bold"
                    style={{ 
                      fontFamily: 'Georgia, serif',
                      color: '#8B4513',
                    }}
                  >
                    {name}
                  </p>
                ))}
              </div>
            )}

            <p className="text-[#1a365d] text-xs mt-3">
              a se realizar às <strong>{time}h</strong> do dia{' '}
              <strong className="capitalize">{formatDateFull()}</strong>,
              no Sagrado Templo da Loja.
            </p>

            <p className="text-[#1a365d] text-xs mt-3 italic">
              {LODGE_ADDRESS}
            </p>

            <p className="text-[#1a365d] text-xs mt-4 font-semibold">
              Certos da presença de todos, transmitimos nosso T∴F∴A∴
            </p>

            {veneravelMestre && (
              <div className="mt-4 pt-3 border-t border-[#DAA520]/30 text-center">
                <p 
                  className="text-base font-bold"
                  style={{ 
                    fontFamily: 'Georgia, serif',
                    color: '#1a365d',
                  }}
                >
                  {veneravelMestre}
                </p>
                <p className="text-[10px] text-[#8B4513] mt-1">Venerável Mestre</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="w-14 flex flex-col items-center justify-end pb-0">
          <div 
            className="w-8 flex-1 mx-auto rounded-t-lg"
            style={{
              background: 'linear-gradient(180deg, #DAA520 0%, #B8860B 50%, #8B6914 100%)',
              boxShadow: '-2px 0 4px rgba(0,0,0,0.3)',
            }}
          />
          <div 
            className="w-10 h-6"
            style={{
              background: 'linear-gradient(180deg, #DAA520, #B8860B)',
            }}
          />
        </div>
      </div>

      {/* Checkered floor */}
      <div className="h-10 flex overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div 
            key={i}
            className="flex-1 h-full"
            style={{
              background: i % 2 === 0 ? '#000' : '#fff',
              transform: 'perspective(100px) rotateX(30deg)',
              transformOrigin: 'top',
            }}
          />
        ))}
      </div>

      {/* Bottom footer */}
      <div className="bg-[#1a365d] py-2 text-center">
        <p className="text-[#DAA520] text-xs tracking-wider">
          ✧ LIBERDADE • IGUALDADE • FRATERNIDADE ✧
        </p>
      </div>
    </div>
  );

  const renderClassicoHorizontalTemplate = () => (
    <div 
      ref={inviteRef}
      className="w-[650px] h-[420px] relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #5DADE2 0%, #85C1E9 30%, #AED6F1 50%, #85C1E9 70%, #5DADE2 100%)',
      }}
    >
      {/* Outer golden decorative border with curve effect */}
      <div 
        className="absolute inset-2 rounded-lg pointer-events-none"
        style={{ 
          border: '5px solid #B8860B',
          boxShadow: 'inset 0 0 0 3px #DAA520, 0 0 10px rgba(218,165,32,0.5)',
        }} 
      />

      {/* Inner golden curved frame */}
      <div 
        className="absolute inset-5 rounded-lg pointer-events-none"
        style={{ 
          border: '2px solid #DAA520',
        }} 
      />

      {/* Top curved banner - A.G.D.G.A.D.U */}
      <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-20">
        <div 
          className="px-10 py-1.5"
          style={{
            background: 'linear-gradient(180deg, #DEB887 0%, #D2B48C 50%, #C4A06B 100%)',
            border: '2px solid #8B4513',
            borderRadius: '0 0 50px 50px',
            boxShadow: '0 3px 6px rgba(0,0,0,0.3)',
          }}
        >
          <p className="text-[#8B0000] text-[11px] font-bold tracking-[0.25em]">
            A∴G∴D∴G∴A∴D∴U∴
          </p>
        </div>
      </div>

      {/* Top logos row */}
      <div className="relative pt-8 px-16 flex items-center justify-center gap-4">
        {/* Moon/globe - left */}
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 40%, #1a365d 100%)',
            border: '3px solid #DAA520',
            boxShadow: '0 3px 6px rgba(0,0,0,0.3)',
          }}
        >
          <span className="text-[#B0E0E6] text-xl">☽</span>
        </div>

        {/* Left emblem - pink with star */}
        <div 
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle, #FFB6C1 20%, #FF69B4 80%)',
            border: '3px solid #DAA520',
            boxShadow: '0 3px 6px rgba(0,0,0,0.3)',
          }}
        >
          <span className="text-[#1a365d] text-base">✡</span>
        </div>

        {/* GOIB Logo - center */}
        <img 
          src="/images/logo-goib-edital.png" 
          alt="Logo GOIB" 
          className="h-16 mx-1"
        />

        {/* Lodge logo if available */}
        {(selectedLodge as any)?.logo_url && (
          <img 
            src={(selectedLodge as any).logo_url} 
            alt={`Logo ${selectedLodge?.name}`}
            className="h-14 object-contain"
          />
        )}

        {/* Right emblem - blue globe */}
        <div 
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle, #87CEEB 20%, #4682B4 80%)',
            border: '3px solid #DAA520',
            boxShadow: '0 3px 6px rgba(0,0,0,0.3)',
          }}
        >
          <span className="text-white text-base">🌐</span>
        </div>

        {/* Sun globe - right */}
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle, #FFD700 20%, #FFA500 80%)',
            border: '3px solid #DAA520',
            boxShadow: '0 3px 6px rgba(0,0,0,0.3)',
          }}
        >
          <span className="text-[#8B4513] text-xl">☀</span>
        </div>
      </div>

      {/* Main content with columns */}
      <div className="flex h-[240px] relative mt-1">
        {/* Left Column with ornate capital */}
        <div className="w-16 flex flex-col items-center pt-0 ml-4">
          {/* Column capital (top ornament) */}
          <div 
            className="w-14 h-8 flex items-end justify-center"
            style={{
              background: 'linear-gradient(180deg, #DAA520 0%, #B8860B 100%)',
              borderRadius: '8px 8px 0 0',
              borderTop: '3px solid #FFD700',
              boxShadow: '0 -2px 4px rgba(0,0,0,0.2)',
            }}
          >
            <div className="w-6 h-6 rounded-full bg-[#1a365d] border-2 border-[#DAA520] flex items-center justify-center mb-1">
              <span className="text-[#87CEEB] text-xs">★</span>
            </div>
          </div>
          {/* Column shaft */}
          <div 
            className="w-10 flex-1"
            style={{
              background: 'linear-gradient(90deg, #8B6914 0%, #CD853F 20%, #DEB887 35%, #F5DEB3 50%, #DEB887 65%, #CD853F 80%, #8B6914 100%)',
              boxShadow: '3px 0 8px rgba(0,0,0,0.4), -3px 0 8px rgba(0,0,0,0.2)',
            }}
          />
          {/* Column base */}
          <div 
            className="w-14 h-5"
            style={{
              background: 'linear-gradient(180deg, #CD853F 0%, #8B6914 100%)',
              borderRadius: '0 0 4px 4px',
            }}
          />
        </div>

        {/* Center content area */}
        <div className="flex-1 px-6 py-2 flex flex-col items-center justify-center">
          {/* Inner golden frame with cream/parchment background */}
          <div 
            className="w-full h-full rounded-lg px-5 py-3 relative"
            style={{
              background: 'linear-gradient(180deg, #FCF8E3 0%, #F5DEB3 30%, #EEE8AA 60%, #F5DEB3 100%)',
              border: '4px solid #DAA520',
              boxShadow: 'inset 0 0 15px rgba(218,165,32,0.3), 0 0 10px rgba(0,0,0,0.2)',
            }}
          >
            {/* Title */}
            <h1 
              className="text-3xl text-center mb-2"
              style={{ 
                fontFamily: '"Brush Script MT", "Segoe Script", Georgia, serif',
                color: '#1a365d',
                textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
              }}
            >
              Convite
            </h1>

            {/* Main invitation text */}
            <p 
              className="text-[11px] leading-relaxed text-center mb-2"
              style={{ color: '#1a365d' }}
            >
              A Aug∴ e Resp∴ Loj∴ Simb∴ <strong>{selectedLodge?.name}</strong>, 
              na pessoa de seu Ven∴ M∴ Ir∴{veneravelMestre ? <strong> {veneravelMestre}</strong> : ''}, tem a honra e a satisfação de convidar a 
              todos os IIr∴ para iluminar e abrilhantar nossos trabalhos com vossa 
              ilustre presença na
            </p>

            {/* Session type */}
            <h2 
              className="text-lg font-bold text-center mb-1"
              style={{ 
                fontFamily: '"Brush Script MT", "Segoe Script", Georgia, serif',
                color: '#1a365d',
              }}
            >
              {getSessionTypeLabel()}
            </h2>

            {/* Names section */}
            {selectedSessionType?.hasNames && getNamesArray().length > 0 && (
              <div className="text-center mb-1">
                {getNamesArray().map((name, index) => (
                  <p 
                    key={index} 
                    className="text-base font-bold"
                    style={{ 
                      fontFamily: '"Brush Script MT", "Segoe Script", Georgia, serif',
                      color: '#8B4513',
                    }}
                  >
                    {name}
                  </p>
                ))}
              </div>
            )}

            {/* Date and time */}
            <p 
              className="text-[11px] text-center mb-1"
              style={{ color: '#1a365d' }}
            >
              a se realizar às <strong>{time}h</strong> do dia{' '}
              <strong>{date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : ''}</strong>
              {' '}(<span className="capitalize">{getDayOfWeek()}</span>), no Sagrado 
              Templo da Aug∴ e Resp∴ Loj∴ Simb∴
            </p>

            {/* Address */}
            <p 
              className="text-[10px] text-center mb-1"
              style={{ color: '#1a365d' }}
            >
              situada na {LODGE_ADDRESS}
            </p>

            {/* Closing */}
            <p 
              className="text-[11px] text-center font-semibold"
              style={{ color: '#1a365d' }}
            >
              Certos da presença de todos, transmitimos nosso T∴F∴A∴
            </p>

            {/* Small decorative symbols at bottom right */}
            <div className="absolute bottom-2 right-3 flex gap-2 items-center">
              <span className="text-[#1a365d] text-sm">☐</span>
              <span className="text-[#CD5C5C] text-sm">📍</span>
            </div>
          </div>
        </div>

        {/* Right Column with ornate capital */}
        <div className="w-16 flex flex-col items-center pt-0 mr-4">
          {/* Column capital (top ornament) */}
          <div 
            className="w-14 h-8 flex items-end justify-center"
            style={{
              background: 'linear-gradient(180deg, #DAA520 0%, #B8860B 100%)',
              borderRadius: '8px 8px 0 0',
              borderTop: '3px solid #FFD700',
              boxShadow: '0 -2px 4px rgba(0,0,0,0.2)',
            }}
          >
            <div className="w-6 h-6 rounded-full bg-[#1a365d] border-2 border-[#DAA520] flex items-center justify-center mb-1">
              <span className="text-[#87CEEB] text-xs">✧</span>
            </div>
          </div>
          {/* Column shaft */}
          <div 
            className="w-10 flex-1"
            style={{
              background: 'linear-gradient(90deg, #8B6914 0%, #CD853F 20%, #DEB887 35%, #F5DEB3 50%, #DEB887 65%, #CD853F 80%, #8B6914 100%)',
              boxShadow: '3px 0 8px rgba(0,0,0,0.4), -3px 0 8px rgba(0,0,0,0.2)',
            }}
          />
          {/* Column base */}
          <div 
            className="w-14 h-5"
            style={{
              background: 'linear-gradient(180deg, #CD853F 0%, #8B6914 100%)',
              borderRadius: '0 0 4px 4px',
            }}
          />
        </div>
      </div>

      {/* Checkered mosaic floor with perspective */}
      <div 
        className="h-12 mx-4 overflow-hidden"
        style={{
          perspective: '200px',
          perspectiveOrigin: 'center bottom',
        }}
      >
        <div 
          className="w-full h-full grid"
          style={{
            gridTemplateColumns: 'repeat(25, 1fr)',
            gridTemplateRows: 'repeat(3, 1fr)',
            transform: 'rotateX(50deg)',
            transformOrigin: 'center top',
          }}
        >
          {Array.from({ length: 75 }).map((_, i) => {
            const row = Math.floor(i / 25);
            const col = i % 25;
            const isBlack = (row + col) % 2 === 0;
            return (
              <div 
                key={i}
                style={{
                  background: isBlack ? '#1a1a1a' : '#f5f5f5',
                  border: '0.5px solid rgba(0,0,0,0.1)',
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderInstalacaoTemplate = () => {
    // Extract gestao period from names field - expecting format like "2026-2028"
    const gestaoMatch = names.match(/(\d{4})\s*[-–]\s*(\d{4})/);
    const gestao = gestaoMatch ? `${gestaoMatch[1]}-${gestaoMatch[2]}` : '';
    
    // Get the main name (first line without gestao info)
    const nameLines = getNamesArray().filter(line => !line.match(/^\d{4}\s*[-–]\s*\d{4}$/));
    const mainName = nameLines[0] || '';
    
    return (
      <div 
        ref={inviteRef}
        className="w-[1024px] h-[724px] relative overflow-hidden"
        style={{
          backgroundImage: 'url(/images/invite-template-instalacao-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Text overlay container - positioned in the white area */}
        <div 
          className="absolute flex flex-col items-center justify-center"
          style={{
            top: '180px',
            left: '150px',
            right: '150px',
            bottom: '160px',
          }}
        >
          {/* Main invitation text */}
          <p 
            className="text-center leading-[1.6] px-6"
            style={{ 
              fontFamily: 'Georgia, "Times New Roman", serif',
              color: '#1a365d',
              fontSize: '19px',
            }}
          >
            A Aug∴ e Resp∴ Loj∴ Simb∴ <strong>{selectedLodge?.name || 'Lealdade e Justiça'}</strong>, nº 001, na
            {' '}pessoa de seu Ven∴ M∴ Ir∴ <strong>{veneravelMestre || 'Nome do Venerável'}</strong>, tem a honra e a
            {' '}satisfação de convidar a todos os IIr∴ para iluminar e abrilhantar
            {' '}nossos trabalhos com vossa ilustre presença na
          </p>

          {/* Session type */}
          <h2 
            className="text-center mt-4 font-bold"
            style={{ 
              fontFamily: 'Georgia, "Times New Roman", serif',
              color: '#1a365d',
              fontSize: '28px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
            }}
          >
            {getSessionTypeLabel() || 'SESSÃO MAGNA DE INSTALAÇÃO E POSSE'}
          </h2>

          {/* Subtitle for gestao */}
          {gestao && (
            <p 
              className="text-center mt-1"
              style={{ 
                fontFamily: 'Georgia, "Times New Roman", serif',
                color: '#1a365d',
                fontSize: '16px',
              }}
            >
              Do novo Venerável Mestre para a gestão de {gestao}
            </p>
          )}

          {/* Main name */}
          {mainName && (
            <h3 
              className="text-center mt-2 font-bold"
              style={{ 
                fontFamily: 'Georgia, "Times New Roman", serif',
                color: '#1a365d',
                fontSize: '30px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              {mainName}
            </h3>
          )}

          {/* Date and time */}
          <p 
            className="text-center mt-4"
            style={{ 
              fontFamily: 'Georgia, "Times New Roman", serif',
              color: '#1a365d',
              fontSize: '19px',
            }}
          >
            a se realizar às <strong>{time || '19:00'}</strong> do dia <strong>{date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : '19 de Janeiro de 2026'}</strong>, no templo
            {' '}do Tucuruvi {LODGE_ADDRESS.replace('Rua ', '')}
          </p>

          {/* Closing message */}
          <p 
            className="text-center mt-4 font-bold"
            style={{ 
              fontFamily: 'Georgia, "Times New Roman", serif',
              color: '#1a365d',
              fontSize: '19px',
            }}
          >
            Certos da presença de todos, transmitimos nosso T∴F∴A∴
          </p>
        </div>
      </div>
    );
  };

  const renderTemplate = () => {
    switch (template) {
      case 'moderno':
        return renderModernoTemplate();
      case 'classico':
        return renderClassicoTemplate();
      case 'classico_horizontal':
        return renderClassicoHorizontalTemplate();
      case 'instalacao':
        return renderInstalacaoTemplate();
      default:
        return renderModernoTemplate();
    }
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

        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Dados do Convite</CardTitle>
              <CardDescription>Preencha as informações para gerar o convite</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Template selector */}
              <div className="space-y-2">
                <Label>Modelo do Convite</Label>
                <Select value={template} onValueChange={setTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {INVITE_TEMPLATES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex flex-col">
                          <span>{t.label}</span>
                          <span className="text-xs text-muted-foreground">{t.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Loja</Label>
                <Select value={lodgeId} onValueChange={(value) => {
                  setLodgeId(value);
                  setVeneravelMestre(''); // Reset when lodge changes
                }}>
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

              {lodgeId && (
                <MemberSelectField
                  id="veneravel-mestre"
                  label="Venerável Mestre"
                  value={veneravelMestre}
                  onChange={setVeneravelMestre}
                  members={lodgeMembers}
                  placeholder="Selecione o Venerável Mestre"
                />
              )}

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
                <div className="flex justify-center overflow-auto py-4">
                  {renderTemplate()}
                </div>
              ) : (
                <div className="h-[450px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
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
