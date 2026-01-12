import { useRef } from 'react';
import { Profile } from '@/lib/supabase-types';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import logoGoib from '@/assets/logo-goib.png';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MemberCardProps {
  profile: Profile;
}

export function MemberCard({ profile }: MemberCardProps) {
  const cardFrontRef = useRef<HTMLDivElement>(null);
  const cardBackRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!cardFrontRef.current || !cardBackRef.current) return;

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85.6, 53.98], // Credit card size
    });

    // Capture front
    const canvasFront = await html2canvas(cardFrontRef.current, {
      scale: 3,
      backgroundColor: null,
      useCORS: true,
    });
    const imgFront = canvasFront.toDataURL('image/png');
    pdf.addImage(imgFront, 'PNG', 0, 0, 85.6, 53.98);

    // Add second page for back
    pdf.addPage([85.6, 53.98], 'landscape');
    const canvasBack = await html2canvas(cardBackRef.current, {
      scale: 3,
      backgroundColor: null,
      useCORS: true,
    });
    const imgBack = canvasBack.toDataURL('image/png');
    pdf.addImage(imgBack, 'PNG', 0, 0, 85.6, 53.98);

    pdf.save(`carteirinha-${profile.full_name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  };

  const getDegreeAbbrev = (degree: string | null) => {
    switch (degree) {
      case 'Aprendiz': return 'Apr∴';
      case 'Companheiro': return 'Comp∴';
      case 'Mestre': return 'M∴M∴';
      default: return 'Apr∴';
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  // Access lodge data - Supabase returns as 'lodges' from the join
  const lodge = (profile as any).lodges;
  const lodgeInfo = lodge 
    ? `${lodge.name}${lodge.city ? ` - ${lodge.city}` : ''}${lodge.state ? `/${lodge.state}` : ''}`
    : '-';

  const orienteInfo = lodge?.city && lodge?.state 
    ? `${lodge.city} - ${lodge.state}` 
    : '-';

  // QR Code URL for validation - links to a public validation page
  const validationUrl = `${window.location.origin}/validar/${profile.id}`;

  const isActive = (profile as any).member_status === 'active';

  return (
    <div className="space-y-6">
      {/* FRONT OF CARD */}
      <div>
        <p className="text-center text-sm text-muted-foreground mb-2 font-display">Frente</p>
        <div
          ref={cardFrontRef}
          className="w-full max-w-lg mx-auto aspect-[1.7/1] rounded-xl overflow-hidden shadow-2xl relative"
          style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
          }}
        >
          {/* Watermark logo */}
          <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
            <img 
              src={logoGoib} 
              alt="" 
              className="h-32 w-32 object-contain"
            />
          </div>

          <div className="h-full flex p-4 text-white relative z-10">
            {/* Left content */}
            <div className="flex-1 flex flex-col pr-4">
              {/* Header */}
              <div className="mb-4">
                <h1 className="font-display text-base tracking-wide text-amber-400 uppercase font-bold">
                  Cédula de Identidade Maçônica
                </h1>
                <p className="text-xs text-amber-300/80 font-display tracking-widest">
                  G.O.I.B
                </p>
              </div>

              {/* Fields */}
              <div className="flex-1 space-y-3">
                {/* Nome completo */}
                <div>
                  <p className="text-[10px] text-white/50 uppercase mb-0.5">Nome completo</p>
                  <div className="border-b border-white/30 pb-1">
                    <p className="font-body text-sm text-white">
                      {profile.full_name}
                    </p>
                  </div>
                </div>

                {/* Loja Maçônica */}
                <div>
                  <p className="text-[10px] text-white/50 uppercase mb-0.5">Loja Maçônica</p>
                  <div className="border-b border-white/30 pb-1">
                    <p className="font-body text-sm text-white">
                      {lodgeInfo}
                    </p>
                  </div>
                </div>

                {/* Grau */}
                <div>
                  <p className="text-[10px] text-white/50 uppercase mb-0.5">Grau</p>
                  <div className="border-b border-white/30 pb-1">
                    <p className="font-display text-sm text-amber-300">
                      {getDegreeAbbrev(profile.degree)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-auto pt-2">
                <p className="text-[8px] text-white/40 font-body leading-tight">
                  Este cartão é seu documento pessoal para inscrição<br/>
                  nas programações do Oriente.
                </p>
              </div>
            </div>

            {/* Right side - Photo and CIM */}
            <div className="flex flex-col items-center justify-center w-28">
              {/* Photo */}
              <div className="w-24 h-28 rounded-md overflow-hidden bg-white/10 border border-white/20 mb-2">
                {profile.photo_url ? (
                  <img
                    src={profile.photo_url}
                    alt={profile.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/40 font-display text-2xl">
                    ?
                  </div>
                )}
              </div>

              {/* CIM */}
              <div className="text-center">
                <p className="text-[10px] text-white/50 uppercase">CIM</p>
                <p className="font-display text-lg text-amber-400 font-bold">
                  {profile.cim_number || '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BACK OF CARD */}
      <div>
        <p className="text-center text-sm text-muted-foreground mb-2 font-display">Verso</p>
        <div
          ref={cardBackRef}
          className="w-full max-w-lg mx-auto aspect-[1.7/1] rounded-xl overflow-hidden shadow-2xl relative"
          style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
          }}
        >
          {/* Watermark logo */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
            <img 
              src={logoGoib} 
              alt="" 
              className="h-40 w-40 object-contain"
            />
          </div>

          <div className="h-full flex flex-col p-4 text-white relative z-10">
            {/* Top row - Dates */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {/* Data de Iniciação */}
              <div>
                <p className="text-[10px] text-white/50 uppercase mb-0.5">Data de Iniciação</p>
                <div className="bg-white rounded px-2 py-1">
                  <p className="font-body text-xs text-black">
                    {formatDate(profile.initiation_date)}
                  </p>
                </div>
              </div>

              {/* Data de Nascimento */}
              <div>
                <p className="text-[10px] text-white/50 uppercase mb-0.5">Data de nascimento</p>
                <div className="bg-white rounded px-2 py-1">
                  <p className="font-body text-xs text-black">
                    {formatDate(profile.birth_date)}
                  </p>
                </div>
              </div>

              {/* Validade */}
              <div>
                <p className="text-[10px] text-white/50 uppercase mb-0.5">Validade</p>
                <div className="bg-white rounded px-2 py-1">
                  <p className="font-body text-[9px] text-black leading-tight">
                    Válido enquanto<br/>membro ativo
                  </p>
                </div>
              </div>
            </div>

            {/* Second row - Cargo and Oriente */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Cargo */}
              <div>
                <p className="text-[10px] text-white/50 uppercase mb-0.5">Cargo</p>
                <div className="bg-white rounded px-2 py-1 min-h-[28px] flex items-center">
                  <p className="font-body text-xs text-black">
                    {(profile as any).cargo || '-'}
                  </p>
                </div>
              </div>

              {/* Oriente */}
              <div>
                <p className="text-[10px] text-white/50 uppercase mb-0.5">Oriente</p>
                <div className="bg-white rounded px-2 py-1 min-h-[28px] flex items-center">
                  <p className="font-body text-xs text-black">
                    {orienteInfo}
                  </p>
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="text-center flex-1 flex flex-col justify-center">
              <h2 className="font-display text-lg text-amber-400 font-bold tracking-wide">
                Grande Oriente Independente do Brasil
              </h2>
            </div>

            {/* Bottom section - QR Code and Status */}
            <div className="flex items-end justify-between mt-auto">
              {/* QR Code */}
              <div className="flex items-center gap-3">
                <div className="bg-white p-1 rounded">
                  <QRCodeSVG 
                    value={validationUrl} 
                    size={50}
                    level="M"
                  />
                </div>
                <div>
                  <p className="text-[8px] text-white/50 uppercase">Validação</p>
                  <p className="text-[10px] text-white/70">Escaneie para verificar</p>
                </div>
              </div>

              {/* Status indicator */}
              <div className="text-right">
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded ${isActive ? 'bg-green-600' : 'bg-red-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-300' : 'bg-red-300'} animate-pulse`} />
                  <span className="text-[10px] font-display text-white uppercase">
                    {isActive ? 'Membro Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Download button */}
      <div className="flex justify-center">
        <Button
          onClick={handleDownload}
          className="bg-secondary hover:bg-gold-dark text-secondary-foreground font-display"
        >
          <Download className="mr-2 h-4 w-4" />
          Baixar Carteirinha (PDF)
        </Button>
      </div>
    </div>
  );
}
