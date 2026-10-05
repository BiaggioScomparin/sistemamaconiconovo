import { useState, useRef } from 'react';
import { Profile } from '@/lib/supabase-types';
import { Button } from '@/components/ui/button';
import { Download, Globe, Shield, Smartphone, Image as ImageIcon, Loader2, Sparkles, Layers } from 'lucide-react';
import logoGoib from '@/assets/logo-goib.png';
import logoSoglia from '@/assets/logo-soglia.png';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { downloadCardImageHD, downloadCombinedCardImageHD, downloadCardPDF } from '@/lib/cardExportUtils';
import { WalletPassDialog } from '@/components/member/WalletPassDialog';

interface SogliaMemberCardProps {
  profile: Profile;
}

export function SogliaMemberCard({ profile }: SogliaMemberCardProps) {
  const cardFrontRef = useRef<HTMLDivElement>(null);
  const cardBackRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const getDegreeAbbrevEN = (degree: string | null) => {
    switch (degree) {
      case 'Aprendiz': return 'Entered Apprentice (A∴)';
      case 'Companheiro': return 'Fellowcraft (F∴C∴)';
      case 'Mestre': return 'Master Mason (M∴M∴)';
      case 'Mestre Instalado': return 'Installed Master (M∴I∴)';
      default: return 'Master Mason (M∴M∴)';
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const lodge = (profile as any).lodges;
  const lodgeNameOnly = lodge ? lodge.name : '-';
  const orientCityOnly = lodge?.city || '-';
  const validationUrl = `${window.location.origin}/validar/${profile.id}`;
  const isActive = (profile as any).member_status === 'active';
  const safeFileName = profile.full_name.replace(/\s+/g, '-').toLowerCase();

  const handleExportPDF = async () => {
    setDownloading('pdf');
    try {
      await downloadCardPDF(cardFrontRef.current, cardBackRef.current, `soglia-card-${safeFileName}`);
      toast({ title: 'PDF baixado com sucesso!' });
    } catch (err: any) {
      toast({ title: 'Erro ao gerar PDF', description: err.message, variant: 'destructive' });
    } finally {
      setDownloading(null);
    }
  };

  const handleExportFrontHD = async () => {
    setDownloading('front');
    try {
      await downloadCardImageHD(cardFrontRef.current, `soglia-frente-${safeFileName}`);
      toast({ title: 'Imagem da Frente HD salva na galeria!' });
    } catch (err: any) {
      toast({ title: 'Erro ao gerar imagem HD', description: err.message, variant: 'destructive' });
    } finally {
      setDownloading(null);
    }
  };

  const handleExportBackHD = async () => {
    setDownloading('back');
    try {
      await downloadCardImageHD(cardBackRef.current, `soglia-verso-${safeFileName}`);
      toast({ title: 'Imagem do Verso HD salva na galeria!' });
    } catch (err: any) {
      toast({ title: 'Erro ao gerar imagem HD', description: err.message, variant: 'destructive' });
    } finally {
      setDownloading(null);
    }
  };

  const handleExportCombinedHD = async () => {
    setDownloading('combined');
    try {
      await downloadCombinedCardImageHD(cardFrontRef.current, cardBackRef.current, `soglia-carteira-${safeFileName}`);
      toast({ title: 'Carteirinha Completa HD salva na galeria!' });
    } catch (err: any) {
      toast({ title: 'Erro ao gerar imagem HD', description: err.message, variant: 'destructive' });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* FRONT OF SOGLIA CARD */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-center justify-between max-w-lg mx-auto mb-2">
          <p className="text-sm font-display text-amber-400 font-semibold flex items-center gap-1.5">
            <Globe className="h-4 w-4" /> Frente (Front Side - International SOGLIA)
          </p>
          <span className="text-xs text-muted-foreground">85.6mm x 53.98mm</span>
        </div>

        <div
          ref={cardFrontRef}
          className="min-w-[340px] w-full max-w-lg mx-auto rounded-xl overflow-hidden shadow-2xl relative border border-amber-500/40"
          style={{
            background: 'linear-gradient(135deg, #0b0f19 0%, #111827 50%, #030712 100%)',
            aspectRatio: '1.7 / 1',
          }}
        >
          {/* Watermark logo SOGLIA */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-15 pointer-events-none">
            <img 
              src={logoSoglia} 
              alt="" 
              className="h-28 sm:h-36 w-28 sm:w-36 object-contain"
            />
          </div>

          <div className="h-full flex flex-col justify-between p-3 sm:p-4 text-white relative z-10">
            {/* Header Logos & Subtitles */}
            <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
              {/* GOIB Logo */}
              <div className="flex items-center gap-2">
                <img src={logoGoib} alt="GOIB" className="h-7 sm:h-9 w-7 sm:w-9 object-contain" />
                <div>
                  <h1 className="font-display text-[10px] sm:text-xs font-bold tracking-wider text-amber-400 uppercase leading-none">
                    G.O.I.B.
                  </h1>
                  <p className="text-[7px] sm:text-[9px] text-slate-300 font-medium tracking-tight">
                    Grand Independent Orient of Brazil
                  </p>
                </div>
              </div>

              {/* SOGLIA Real Logo */}
              <div className="flex items-center gap-2 text-right">
                <div>
                  <h1 className="font-display text-[10px] sm:text-xs font-bold tracking-wider text-amber-400 uppercase leading-none">
                    SOGLIA
                  </h1>
                  <p className="text-[7px] sm:text-[8px] text-slate-300 tracking-tighter">
                    Society of Grand Lodges in Alliance
                  </p>
                </div>
                <img src={logoSoglia} alt="SOGLIA" className="h-7 sm:h-9 w-7 sm:w-9 object-contain drop-shadow" />
              </div>
            </div>

            {/* Title Banner */}
            <div className="text-center py-0.5 sm:py-1 bg-amber-500/10 border-y border-amber-500/20 my-1">
              <span className="text-[9px] sm:text-[11px] font-bold tracking-widest text-amber-300 uppercase font-display">
                INTERNATIONAL MASONIC IDENTITY CARD
              </span>
            </div>

            {/* Main Content: Photo & Member Details */}
            <div className="flex items-center gap-2.5 sm:gap-4 my-auto">
              {/* Photo & CIM */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-14 h-18 sm:w-20 sm:h-24 rounded-lg overflow-hidden bg-slate-900 border-2 border-amber-400/60 shadow-inner">
                  {profile.photo_url ? (
                    <img
                      src={profile.photo_url}
                      alt={profile.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-amber-400/60 font-display text-xl">
                      ?
                    </div>
                  )}
                </div>
                <p className="text-[8px] sm:text-[10px] font-mono text-amber-400 font-bold mt-1">
                  CIM: {profile.cim_number || '-'}
                </p>
              </div>

              {/* Fields Grid (English) */}
              <div className="flex-1 min-w-0 space-y-1 sm:space-y-1.5 text-xs">
                {/* Name */}
                <div>
                  <p className="text-[7px] sm:text-[8px] uppercase tracking-wider text-slate-400 font-medium">Full Name</p>
                  <p className="font-bold text-white text-xs sm:text-sm truncate border-b border-white/20 pb-0.5">
                    {profile.full_name}
                  </p>
                </div>

                {/* Rank & Country */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[7px] sm:text-[8px] uppercase tracking-wider text-slate-400 font-medium">Masonic Rank</p>
                    <p className="font-semibold text-amber-300 text-[10px] sm:text-xs truncate">
                      {getDegreeAbbrevEN(profile.degree)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[7px] sm:text-[8px] uppercase tracking-wider text-slate-400 font-medium">Country</p>
                    <p className="font-semibold text-slate-200 text-[10px] sm:text-xs truncate">
                      Brazil 🇧🇷
                    </p>
                  </div>
                </div>

                {/* Lodge Name */}
                <div>
                  <p className="text-[7px] sm:text-[8px] uppercase tracking-wider text-slate-400 font-medium">Masonic Lodge</p>
                  <p className="font-semibold text-slate-100 text-[10px] sm:text-xs truncate">
                    {lodgeNameOnly}
                  </p>
                </div>

                {/* Orient (City) */}
                <div>
                  <p className="text-[7px] sm:text-[8px] uppercase tracking-wider text-slate-400 font-medium">Orient (City)</p>
                  <p className="font-semibold text-amber-400/90 text-[10px] sm:text-xs truncate">
                    {orientCityOnly}
                  </p>
                </div>
              </div>
            </div>

            {/* Card Footer */}
            <div className="flex items-center justify-between text-[7px] sm:text-[8px] text-slate-400 border-t border-slate-800 pt-1">
              <span>Jurisdiction: <strong>BRA-GOIB-001</strong></span>
              <span className="text-amber-400 font-medium">Valid Worldwide</span>
            </div>
          </div>
        </div>
      </div>

      {/* BACK OF SOGLIA CARD */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-center justify-between max-w-lg mx-auto mb-2">
          <p className="text-sm font-display text-amber-400 font-semibold flex items-center gap-1.5">
            <Shield className="h-4 w-4" /> Verso (Back Side - Verification & Declaration)
          </p>
          <span className="text-xs text-muted-foreground">85.6mm x 53.98mm</span>
        </div>

        <div
          ref={cardBackRef}
          className="min-w-[340px] w-full max-w-lg mx-auto rounded-xl overflow-hidden shadow-2xl relative border border-amber-500/40"
          style={{
            background: 'linear-gradient(135deg, #0b0f19 0%, #111827 50%, #030712 100%)',
            aspectRatio: '1.7 / 1',
          }}
        >
          {/* Watermark logo */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
            <img 
              src={logoSoglia} 
              alt="" 
              className="h-36 w-36 sm:h-48 sm:w-48 object-contain"
            />
          </div>

          <div className="h-full flex flex-col justify-between p-3 sm:p-4 text-white relative z-10">
            {/* Top row - Dates */}
            <div className="grid grid-cols-3 gap-2 mb-1.5 sm:mb-2">
              <div className="bg-slate-900/80 border border-slate-800 rounded p-1">
                <p className="text-[7px] sm:text-[8px] text-slate-400 uppercase font-medium">Initiation Date</p>
                <p className="text-[10px] sm:text-xs font-bold text-white mt-0.5">{formatDate(profile.initiation_date)}</p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded p-1">
                <p className="text-[7px] sm:text-[8px] text-slate-400 uppercase font-medium">Date of Birth</p>
                <p className="text-[10px] sm:text-xs font-bold text-white mt-0.5">{formatDate(profile.birth_date)}</p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded p-1">
                <p className="text-[7px] sm:text-[8px] text-slate-400 uppercase font-medium">Status</p>
                <p className={`text-[9px] sm:text-[10px] font-bold mt-0.5 ${isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isActive ? 'Active Member' : 'Inactive'}
                </p>
              </div>
            </div>

            {/* Second row - Office & Orient */}
            <div className="grid grid-cols-2 gap-2 mb-1.5 sm:mb-2">
              <div className="bg-slate-900/80 border border-slate-800 rounded p-1.5">
                <p className="text-[7px] sm:text-[8px] text-slate-400 uppercase font-medium">Lodge Office / Position</p>
                <p className="text-[10px] sm:text-xs font-semibold text-amber-300 truncate mt-0.5">
                  {(profile as any).cargo || (profile as any).lodge_position || 'Master Mason'}
                </p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded p-1.5">
                <p className="text-[7px] sm:text-[8px] text-slate-400 uppercase font-medium">Grand Orient</p>
                <p className="text-[10px] sm:text-xs font-semibold text-slate-200 truncate mt-0.5">
                  G.O.I.B. (Brazil)
                </p>
              </div>
            </div>

            {/* Official International Declaration Statement */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded p-1.5 my-1">
              <p className="text-[7.5px] sm:text-[8.5px] text-slate-300 leading-tight italic">
                "The holder of this international card is recognized as a regular Master Mason in good standing under the jurisdiction of the Grand Independent Orient of Brazil (G.O.I.B.), an allied member of SOGLIA."
              </p>
            </div>

            {/* Bottom section - QR Code & Seal */}
            <div className="flex items-end justify-between border-t border-slate-800 pt-1.5 mt-auto">
              <div className="flex items-center gap-2">
                <div className="bg-white p-1 rounded">
                  <QRCodeSVG 
                    value={validationUrl} 
                    size={36}
                    level="M"
                    className="sm:w-[48px] sm:h-[48px]"
                  />
                </div>
                <div>
                  <p className="text-[7px] text-slate-400 uppercase font-semibold">Digital Verification</p>
                  <p className="text-[8px] text-amber-400 font-mono">Scan QR to verify credential</p>
                </div>
              </div>

              <div className="text-right flex items-center gap-2">
                <div>
                  <p className="text-[7px] text-slate-400">Confederation Seal</p>
                  <p className="text-[9px] sm:text-[10px] font-bold text-amber-400 uppercase tracking-widest font-display">
                    SOGLIA INTERNATIONAL
                  </p>
                </div>
                <img src={logoSoglia} alt="SOGLIA" className="h-6 w-6 object-contain" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Download & Wallet Actions Toolbar */}
      <div className="max-w-lg mx-auto space-y-3 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Download Front Image */}
          <Button
            variant="outline"
            onClick={handleExportFrontHD}
            disabled={downloading !== null}
            className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 gap-2 h-11 text-xs"
          >
            {downloading === 'front' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4 text-amber-400" />}
            Frente HD (Galeria PNG)
          </Button>

          {/* Download Back Image */}
          <Button
            variant="outline"
            onClick={handleExportBackHD}
            disabled={downloading !== null}
            className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 gap-2 h-11 text-xs"
          >
            {downloading === 'back' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4 text-amber-400" />}
            Verso HD (Galeria PNG)
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Download Combined Image */}
          <Button
            variant="outline"
            onClick={handleExportCombinedHD}
            disabled={downloading !== null}
            className="border-amber-500/40 text-slate-200 hover:bg-amber-500/10 gap-2 h-11 text-xs"
          >
            {downloading === 'combined' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4 text-amber-400" />}
            Frente + Verso HD (PNG)
          </Button>

          {/* Download PDF */}
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={downloading !== null}
            className="border-amber-500/40 text-slate-200 hover:bg-amber-500/10 gap-2 h-11 text-xs"
          >
            {downloading === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-amber-400" />}
            Documento PDF Oficial
          </Button>
        </div>

        {/* Apple & Google Wallet Button */}
        <Button
          onClick={() => setWalletDialogOpen(true)}
          className="w-full bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-bold font-display shadow-xl gap-2.5 h-12 text-sm"
        >
          <Smartphone className="h-5 w-5" />
          Adicionar ao Apple / Google Wallet (Passe Digital)
        </Button>
      </div>

      {/* Wallet Pass Modal */}
      <WalletPassDialog
        open={walletDialogOpen}
        onOpenChange={setWalletDialogOpen}
        profile={profile}
        cardType="soglia"
      />
    </div>
  );
}
