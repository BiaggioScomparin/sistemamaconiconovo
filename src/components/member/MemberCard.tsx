import { useState, useRef } from 'react';
import { Profile } from '@/lib/supabase-types';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, Image as ImageIcon, Loader2, Layers, CreditCard } from 'lucide-react';
import logoGoib from '@/assets/logo-goib.png';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { downloadCardImageHD, downloadCombinedCardImageHD, downloadCardPDF } from '@/lib/cardExportUtils';
import { WalletPassDialog } from '@/components/member/WalletPassDialog';

interface MemberCardProps {
  profile: Profile;
}

export function MemberCard({ profile }: MemberCardProps) {
  const cardFrontRef = useRef<HTMLDivElement>(null);
  const cardBackRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const getDegreeAbbrev = (degree: string | null) => {
    switch (degree) {
      case 'Aprendiz': return 'Apr∴';
      case 'Companheiro': return 'Comp∴';
      case 'Mestre': return 'M∴M∴';
      case 'Mestre Instalado': return 'M∴I∴';
      default: return 'Apr∴';
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
  const lodgeInfo = lodge ? lodge.name : '-';
  const orienteInfo = lodge?.city && lodge?.state ? `${lodge.city} - ${lodge.state}` : '-';
  const validationUrl = `${window.location.origin}/validar/${profile.id}`;
  const isActive = (profile as any).member_status === 'active';
  const safeFileName = profile.full_name.replace(/\s+/g, '-').toLowerCase();

  const handleExportPDF = async () => {
    setDownloading('pdf');
    try {
      await downloadCardPDF(cardFrontRef.current, cardBackRef.current, `carteirinha-goib-${safeFileName}`);
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
      await downloadCardImageHD(cardFrontRef.current, `goib-frente-${safeFileName}`);
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
      await downloadCardImageHD(cardBackRef.current, `goib-verso-${safeFileName}`);
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
      await downloadCombinedCardImageHD(cardFrontRef.current, cardBackRef.current, `goib-carteira-${safeFileName}`);
      toast({ title: 'Carteirinha Completa HD salva na galeria!' });
    } catch (err: any) {
      toast({ title: 'Erro ao gerar imagem HD', description: err.message, variant: 'destructive' });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* FRONT OF CARD */}
      <div className="overflow-x-auto pb-2">
        <p className="text-center text-sm text-muted-foreground mb-2 font-display">Frente (Nacional GOIB)</p>
        <div
          ref={cardFrontRef}
          className="min-w-[340px] w-full max-w-lg mx-auto rounded-xl overflow-hidden shadow-2xl relative border border-white/10"
          style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
            aspectRatio: '1.7 / 1',
          }}
        >
          {/* Watermark logo */}
          <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
            <img 
              src={logoGoib} 
              alt="" 
              className="h-24 sm:h-32 w-24 sm:w-32 object-contain"
            />
          </div>

          <div className="h-full flex p-3 sm:p-4 text-white relative z-10">
            {/* Left content */}
            <div className="flex-1 flex flex-col pr-2 sm:pr-4 min-w-0">
              {/* Header */}
              <div className="mb-2 sm:mb-4">
                <h1 className="font-display text-xs sm:text-base tracking-wide text-amber-400 uppercase font-bold leading-tight">
                  Cédula de Identidade Maçônica
                </h1>
                <p className="text-[10px] sm:text-xs text-amber-300/80 font-display tracking-widest">
                  G.O.I.B
                </p>
              </div>

              {/* Fields */}
              <div className="flex-1 space-y-1.5 sm:space-y-3">
                {/* Nome completo */}
                <div>
                  <p className="text-[8px] sm:text-[10px] text-white/50 uppercase mb-0.5">Nome completo</p>
                  <div className="border-b border-white/30 pb-0.5 sm:pb-1">
                    <p className="font-body text-xs sm:text-sm text-white truncate">
                      {profile.full_name}
                    </p>
                  </div>
                </div>

                {/* Loja Maçônica */}
                <div>
                  <p className="text-[8px] sm:text-[10px] text-white/50 uppercase mb-0.5">Loja Maçônica</p>
                  <div className="border-b border-white/30 pb-0.5 sm:pb-1">
                    <p className="font-body text-xs sm:text-sm text-white truncate">
                      {lodgeInfo}
                    </p>
                  </div>
                </div>

                {/* Grau */}
                <div>
                  <p className="text-[8px] sm:text-[10px] text-white/50 uppercase mb-0.5">Grau</p>
                  <div className="border-b border-white/30 pb-0.5 sm:pb-1">
                    <p className="font-display text-xs sm:text-sm text-amber-300">
                      {getDegreeAbbrev(profile.degree)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-auto pt-1 sm:pt-2">
                <p className="text-[7px] sm:text-[8px] text-white/40 font-body leading-tight">
                  Este cartão é seu documento pessoal para inscrição<br/>
                  nas programações do Oriente.
                </p>
              </div>
            </div>

            {/* Right side - Photo and CIM */}
            <div className="flex flex-col items-center justify-center w-20 sm:w-28 flex-shrink-0">
              {/* Photo */}
              <div className="w-16 h-20 sm:w-24 sm:h-28 rounded-md overflow-hidden bg-white/10 border border-white/20 mb-1 sm:mb-2">
                {profile.photo_url ? (
                  <img
                    src={profile.photo_url}
                    alt={profile.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/40 font-display text-xl sm:text-2xl">
                    ?
                  </div>
                )}
              </div>

              {/* CIM */}
              <div className="text-center">
                <p className="text-[8px] sm:text-[10px] text-white/50 uppercase">CIM</p>
                <p className="font-display text-sm sm:text-lg text-amber-400 font-bold">
                  {profile.cim_number || '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BACK OF CARD */}
      <div className="overflow-x-auto pb-2">
        <p className="text-center text-sm text-muted-foreground mb-2 font-display">Verso</p>
        <div
          ref={cardBackRef}
          className="min-w-[340px] w-full max-w-lg mx-auto rounded-xl overflow-hidden shadow-2xl relative border border-white/10"
          style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
            aspectRatio: '1.7 / 1',
          }}
        >
          {/* Watermark logo */}
          <div className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
            <img 
              src={logoGoib} 
              alt="" 
              className="h-28 w-28 sm:h-40 sm:w-40 object-contain"
            />
          </div>

          <div className="h-full flex flex-col p-3 sm:p-4 text-white relative z-10">
            {/* Top row - Dates */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-3 mb-2 sm:mb-4">
              {/* Data de Iniciação */}
              <div>
                <p className="text-[8px] sm:text-[10px] text-white/50 uppercase mb-0.5">Iniciação</p>
                <div className="bg-white rounded px-1.5 sm:px-2 py-0.5 sm:py-1">
                  <p className="font-body text-[10px] sm:text-xs text-black">
                    {formatDate(profile.initiation_date)}
                  </p>
                </div>
              </div>

              {/* Data de Nascimento */}
              <div>
                <p className="text-[8px] sm:text-[10px] text-white/50 uppercase mb-0.5">Nascimento</p>
                <div className="bg-white rounded px-1.5 sm:px-2 py-0.5 sm:py-1">
                  <p className="font-body text-[10px] sm:text-xs text-black">
                    {formatDate(profile.birth_date)}
                  </p>
                </div>
              </div>

              {/* Validade */}
              <div>
                <p className="text-[8px] sm:text-[10px] text-white/50 uppercase mb-0.5">Validade</p>
                <div className="bg-white rounded px-1.5 sm:px-2 py-0.5 sm:py-1">
                  <p className="font-body text-[8px] sm:text-[9px] text-black leading-tight">
                    Membro ativo
                  </p>
                </div>
              </div>
            </div>

            {/* Second row - Cargo and Oriente */}
            <div className="grid grid-cols-2 gap-1.5 sm:gap-3 mb-2 sm:mb-4">
              {/* Cargo */}
              <div>
                <p className="text-[8px] sm:text-[10px] text-white/50 uppercase mb-0.5">Cargo</p>
                <div className="border-b border-white/30 pb-0.5 sm:pb-1">
                  <p className="font-body text-xs sm:text-sm text-white truncate">
                    {(profile as any).cargo || (profile as any).lodge_position || 'Membro'}
                  </p>
                </div>
              </div>

              {/* Oriente */}
              <div>
                <p className="text-[8px] sm:text-[10px] text-white/50 uppercase mb-0.5">Oriente</p>
                <div className="border-b border-white/30 pb-0.5 sm:pb-1">
                  <p className="font-body text-xs sm:text-sm text-white truncate">
                    {orienteInfo}
                  </p>
                </div>
              </div>
            </div>

            {/* QR Code and status footer */}
            <div className="mt-auto flex items-end justify-between pt-1 sm:pt-2 border-t border-white/20">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="bg-white p-0.5 sm:p-1 rounded">
                  <QRCodeSVG 
                    value={validationUrl} 
                    size={36}
                    level="M"
                    className="sm:w-[50px] sm:h-[50px]"
                  />
                </div>
                <div className="hidden sm:block">
                  <p className="text-[8px] text-white/50 uppercase">Validação</p>
                  <p className="text-[10px] text-white/70">Escaneie para verificar</p>
                </div>
              </div>

              {/* Status indicator */}
              <div className="text-right">
                <div className={`inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${isActive ? 'bg-green-600' : 'bg-red-600'}`}>
                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isActive ? 'bg-green-300' : 'bg-red-300'} animate-pulse`} />
                  <span className="text-[8px] sm:text-[10px] font-display text-white uppercase">
                    {isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
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
        cardType="goib"
      />
    </div>
  );
}
