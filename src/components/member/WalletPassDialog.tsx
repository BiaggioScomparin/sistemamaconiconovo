import { useState, useRef } from 'react';
import { Profile } from '@/lib/supabase-types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '@/hooks/use-toast';
import { Smartphone, Download, CheckCircle2, Globe, Shield, Sparkles, Image, ExternalLink } from 'lucide-react';
import logoGoib from '@/assets/logo-goib.png';
import logoSoglia from '@/assets/logo-soglia.png';
import { downloadCardImageHD } from '@/lib/cardExportUtils';

interface WalletPassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  cardType?: 'soglia' | 'goib';
}

export function WalletPassDialog({ open, onOpenChange, profile, cardType = 'soglia' }: WalletPassDialogProps) {
  const { toast } = useToast();
  const passRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const validationUrl = `${window.location.origin}/validar/${profile.id}`;
  const lodge = (profile as any).lodges;
  const lodgeName = lodge?.name || 'Grand Oriente';
  const orientCity = lodge?.city || 'São Paulo';
  const isActive = (profile as any).member_status === 'active';

  const handleDownloadPassImage = async () => {
    if (!passRef.current) return;
    try {
      setDownloading(true);
      await downloadCardImageHD(
        passRef.current,
        `wallet-pass-${cardType}-${profile.full_name.replace(/\s+/g, '-').toLowerCase()}`
      );
      toast({
        title: 'Passe Digital Salvo!',
        description: 'Imagem HD salva com sucesso na galeria do celular.',
      });
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar passe',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleAppleWalletExport = () => {
    // Generate Passbook JSON / PKPASS payload
    const passData = {
      formatVersion: 1,
      passTypeIdentifier: "pass.org.goib.masonic.credential",
      serialNumber: profile.id,
      teamIdentifier: "GOIBSOGLIA",
      organizationName: cardType === 'soglia' ? "SOGLIA International" : "Grande Oriente Independente do Brasil",
      description: "Cédula de Identidade Maçônica Digital",
      logoText: cardType === 'soglia' ? "SOGLIA INTERNATIONAL" : "GOIB BRASIL",
      foregroundColor: "rgb(255, 215, 0)",
      backgroundColor: "rgb(15, 23, 42)",
      barcode: {
        message: validationUrl,
        format: "PKBarcodeFormatQR",
        messageEncoding: "iso-8859-1"
      },
      primaryFields: [
        { key: "member", label: "MEMBER NAME", value: profile.full_name.toUpperCase() }
      ],
      secondaryFields: [
        { key: "cim", label: "CIM NUMBER", value: profile.cim_number || "-" },
        { key: "rank", label: "MASONIC RANK", value: profile.degree || "Master Mason" }
      ],
      auxiliaryFields: [
        { key: "lodge", label: "LODGE", value: lodgeName },
        { key: "orient", label: "ORIENT", value: orientCity }
      ]
    };

    const jsonStr = JSON.stringify(passData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carteira-${profile.full_name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();

    toast({
      title: 'Passe de Carteira Exportado!',
      description: 'O passe digital foi baixado. Abra no seu aplicativo de Carteira (Apple Wallet / Pass2U / Smart Wallet).',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2 text-xl">
            <Smartphone className="h-6 w-6 text-amber-500" />
            Adicionar à Carteira (Mobile Wallet)
          </DialogTitle>
          <DialogDescription>
            Passe digital oficial formatado para **Apple Wallet** e **Google Wallet**.
          </DialogDescription>
        </DialogHeader>

        {/* Mobile Wallet Pass Card Preview */}
        <div className="py-2 space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span className="flex items-center gap-1 font-semibold text-amber-500">
              <Sparkles className="h-3.5 w-3.5" /> Pré-visualização do Passe
            </span>
            <span>📱 iOS & Android Compatible</span>
          </div>

          {/* Pass Container */}
          <div
            ref={passRef}
            className="w-full rounded-2xl overflow-hidden shadow-2xl border border-amber-500/40 relative text-white"
            style={{
              background: cardType === 'soglia'
                ? 'linear-gradient(135deg, #090d16 0%, #111827 50%, #030712 100%)'
                : 'linear-gradient(135deg, #18181b 0%, #09090b 100%)',
            }}
          >
            {/* Top Pass Header */}
            <div className="p-4 border-b border-amber-500/30 flex items-center justify-between bg-amber-500/10">
              <div className="flex items-center gap-2.5">
                <img
                  src={cardType === 'soglia' ? logoSoglia : logoGoib}
                  alt="Logo"
                  className="h-8 w-8 object-contain drop-shadow"
                />
                <div>
                  <h3 className="font-display text-xs font-bold text-amber-400 tracking-wider uppercase leading-none">
                    {cardType === 'soglia' ? 'SOGLIA INTERNATIONAL' : 'GOIB — BRASIL'}
                  </h3>
                  <p className="text-[9px] text-slate-300 font-medium tracking-tight mt-0.5">
                    {cardType === 'soglia' ? 'Society of Grand Lodges in Alliance' : 'Grande Oriente Independente do Brasil'}
                  </p>
                </div>
              </div>
              <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px] px-2 py-0.5">
                MEMBER PASS
              </Badge>
            </div>

            {/* Pass Body Content */}
            <div className="p-4 space-y-3">
              {/* Member Name */}
              <div>
                <p className="text-[9px] text-slate-400 uppercase font-semibold tracking-wider">Nome do Membro / Member Name</p>
                <p className="font-display text-base font-bold text-white leading-tight truncate">
                  {profile.full_name}
                </p>
              </div>

              {/* Grid Details */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800">
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-semibold tracking-wider">CIM / Member ID</p>
                  <p className="font-mono text-xs font-bold text-amber-400">
                    {profile.cim_number || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-semibold tracking-wider">Grau / Rank</p>
                  <p className="text-xs font-semibold text-amber-300 truncate">
                    {profile.degree || 'Master Mason'}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-semibold tracking-wider">Loja / Lodge</p>
                  <p className="text-xs font-semibold text-slate-200 truncate">
                    {lodgeName}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-semibold tracking-wider">Oriente / City</p>
                  <p className="text-xs font-semibold text-slate-200 truncate">
                    {orientCity}
                  </p>
                </div>
              </div>

              {/* Status Badge Line */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                <span className="text-[10px] text-slate-400">Situação Cadastral:</span>
                <span className={`font-bold flex items-center gap-1 ${isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                  <CheckCircle2 size={12} />
                  {isActive ? 'Regular & Ativo' : 'Inativo'}
                </span>
              </div>

              {/* QR Code Validation Section */}
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
                <div className="bg-white p-1.5 rounded-lg shrink-0">
                  <QRCodeSVG value={validationUrl} size={52} level="M" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <p className="text-[10px] font-bold text-amber-400 uppercase font-display">Validação Digital</p>
                  <p className="text-[9px] text-slate-300 leading-tight">
                    QR Code criptografado para conferência instantânea na portaria.
                  </p>
                </div>
              </div>
            </div>

            {/* Pass Footer */}
            <div className="p-2.5 bg-slate-950 text-center border-t border-slate-800 text-[8px] text-slate-400 tracking-wider">
              VALID WORLDWIDE — GOIB & SOGLIA JURISDICTION
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <DialogFooter className="flex-col sm:flex-col gap-2 pt-2">
          <Button
            onClick={handleAppleWalletExport}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold gap-2 border border-slate-700 h-11"
          >
            <Smartphone className="h-5 w-5 text-amber-400" />
            Adicionar ao Apple / Google Wallet
          </Button>

          <Button
            onClick={handleDownloadPassImage}
            disabled={downloading}
            variant="outline"
            className="w-full gap-2 border-amber-500/40 text-amber-500 hover:bg-amber-500/10 h-11"
          >
            <Image className="h-5 w-5" />
            {downloading ? 'Gerando Imagem HD...' : 'Salvar Passe em Alta Definição (Galeria)'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
