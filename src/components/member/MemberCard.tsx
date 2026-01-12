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
        <div className="h-full flex flex-col p-5 text-white">
          {/* Header with Logo */}
          <div className="flex items-center justify-center mb-3">
            <img 
              src={logoGoib} 
              alt="GOIB Logo" 
              className="h-16 w-16 object-contain"
            />
          </div>

          {/* Title */}
          <div className="text-center mb-3">
            <h3 className="font-display text-sm tracking-widest text-amber-400 uppercase">
              Carteira de Identificação
            </h3>
            <p className="text-[10px] text-white/60 font-body">
              Grande Oriente Independente do Brasil
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-2">
            {/* Full Name */}
            <div className="text-center">
              <p className="text-[10px] text-white/50 uppercase tracking-wide">Nome</p>
              <h2 className="font-display text-base text-amber-300 leading-tight">
                {profile.full_name}
              </h2>
            </div>

            {/* Lodge */}
            <div className="text-center">
              <p className="text-[10px] text-white/50 uppercase tracking-wide">Loja</p>
              <p className="font-body text-sm text-white/90">
                {profile.lodge?.name || '-'}
              </p>
            </div>

            {/* Degree and CIM */}
            <div className="flex justify-center gap-8">
              <div className="text-center">
                <p className="text-[10px] text-white/50 uppercase tracking-wide">Grau</p>
                <p className="font-display text-sm text-amber-300">
                  {profile.degree || 'Aprendiz'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-white/50 uppercase tracking-wide">CIM</p>
                <p className="font-display text-sm text-amber-300">
                  {profile.cim_number || '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center mt-2 pt-2 border-t border-white/10">
            <p className="text-[9px] text-white/40 font-body">
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
