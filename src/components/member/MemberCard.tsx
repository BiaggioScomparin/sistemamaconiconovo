import { useRef } from 'react';
import { Profile } from '@/lib/supabase-types';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import logoGoib from '@/assets/logo-goib.png';

interface MemberCardProps {
  profile: Profile;
}

export function MemberCard({ profile }: MemberCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!cardRef.current) return;

    const canvas = await html2canvas(cardRef.current, {
      scale: 3,
      backgroundColor: null,
      useCORS: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85.6, 53.98], // Credit card size
    });

    pdf.addImage(imgData, 'PNG', 0, 0, 85.6, 53.98);
    pdf.save(`carteirinha-${profile.full_name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  };

  const lodgeFullName = profile.lodge 
    ? `${profile.lodge.name}${profile.lodge.city ? ` - ${profile.lodge.city}` : ''}${profile.lodge.state ? `/${profile.lodge.state}` : ''}`
    : '-';

  return (
    <div className="space-y-6">
      {/* Card preview */}
      <div
        ref={cardRef}
        className="w-full max-w-md mx-auto aspect-[1.586/1] rounded-xl overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, hsl(222 47% 15%) 0%, hsl(222 55% 8%) 100%)',
        }}
      >
        <div className="h-full flex flex-col p-4 text-white">
          {/* Header with Logo and Photo */}
          <div className="flex items-start justify-between mb-2">
            {/* Logo */}
            <div className="flex flex-col items-center">
              <img 
                src={logoGoib} 
                alt="GOIB Logo" 
                className="h-14 w-14 object-contain"
              />
              <p className="text-[7px] text-white/60 font-body text-center mt-1 leading-tight">
                Grande Oriente<br/>Independente do Brasil
              </p>
            </div>

            {/* Title */}
            <div className="flex-1 text-center px-2">
              <h3 className="font-display text-xs tracking-widest text-amber-400 uppercase">
                Carteira de Identificação
              </h3>
            </div>

            {/* Photo */}
            <div className="w-16 h-20 rounded-md overflow-hidden bg-white/10 flex-shrink-0 border border-white/20">
              {profile.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt={profile.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/40 font-display text-xl">
                  ?
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-1.5">
            {/* Full Name */}
            <div className="text-center">
              <p className="text-[8px] text-white/50 uppercase tracking-wide">Nome</p>
              <h2 className="font-display text-sm text-amber-300 leading-tight">
                {profile.full_name}
              </h2>
            </div>

            {/* Lodge with black background */}
            <div className="bg-black/60 rounded-md py-1.5 px-2 text-center">
              <p className="text-[8px] text-white/50 uppercase tracking-wide">Loja Maçônica</p>
              <p className="font-body text-xs text-white/90 leading-tight">
                {lodgeFullName}
              </p>
            </div>

            {/* Degree and CIM */}
            <div className="flex justify-center gap-6">
              <div className="text-center">
                <p className="text-[8px] text-white/50 uppercase tracking-wide">Grau</p>
                <p className="font-display text-xs text-amber-300">
                  {profile.degree || 'Aprendiz'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[8px] text-white/50 uppercase tracking-wide">CIM</p>
                <p className="font-display text-xs text-amber-300">
                  {profile.cim_number || '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center pt-1.5 border-t border-white/10">
            <p className="text-[8px] text-white/40 font-body">
              Válido enquanto membro ativo
            </p>
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
