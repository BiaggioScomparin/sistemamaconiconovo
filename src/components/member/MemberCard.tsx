import { useRef } from 'react';
import { Profile } from '@/lib/supabase-types';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface MemberCardProps {
  profile: Profile;
}

export function MemberCard({ profile }: MemberCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;

    const canvas = await html2canvas(cardRef.current, {
      scale: 2,
      backgroundColor: null,
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
          background: 'linear-gradient(135deg, hsl(222 47% 15%) 0%, hsl(222 55% 10%) 100%)',
        }}
      >
        <div className="h-full flex flex-col p-6 text-white">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-lg tracking-wide text-amber-400">
                CARTEIRA DE IDENTIFICAÇÃO
              </h3>
              <p className="text-xs text-white/60 font-body">Grande Oriente</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
              <span className="font-display text-amber-400 text-xl">∴</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex gap-4">
            {/* Photo */}
            <div className="w-24 h-28 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
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

            {/* Info */}
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="font-display text-lg text-amber-300 leading-tight mb-2">
                {profile.full_name}
              </h2>
              
              <div className="space-y-1 text-sm font-body">
                <p className="text-white/70">
                  <span className="text-white/50">Loja: </span>
                  {profile.lodge?.name || '-'}
                </p>
                <p className="text-white/70">
                  <span className="text-white/50">Iniciação: </span>
                  {formatDate(profile.initiation_date)}
                </p>
                {profile.cim_number && (
                  <p className="text-white/70">
                    <span className="text-white/50">CIM: </span>
                    {profile.cim_number}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <span key={i} className="text-amber-400">∴</span>
              ))}
            </div>
            <p className="text-xs text-white/40 font-body">
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
