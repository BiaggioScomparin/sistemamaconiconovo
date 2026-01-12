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

  const getDegreeAbbrev = (degree: string | null) => {
    switch (degree) {
      case 'Aprendiz': return 'Apr∴';
      case 'Companheiro': return 'Comp∴';
      case 'Mestre': return 'M∴M∴';
      default: return 'Apr∴';
    }
  };

  const lodgeName = profile.lodge?.name || '-';

  return (
    <div className="space-y-6">
      {/* Card preview */}
      <div
        ref={cardRef}
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
                    {lodgeName}
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
