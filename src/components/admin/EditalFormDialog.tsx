import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Printer, Upload, Camera, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const RITOS = ['R.E.A', 'REEA', 'MODERNO', 'YORK', 'BRASILEIRO'];

const TIME_OPTIONS = [
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
];

export interface EditalFormData {
  oriente: string;
  endereco: string;
  sessaoHora: string;
  rito: string;
  lodgeNumber: string;
  photoUrl?: string | null;
}

interface EditalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId?: string;
  profileName: string;
  photoUrl?: string | null;
  lodgeName?: string;
  lodgeCity?: string;
  lodgeState?: string;
  onGenerate: (formData: EditalFormData) => void;
  onPhotoUpdated?: (newUrl: string) => void;
  isGenerating: boolean;
}

export function EditalFormDialog({
  open,
  onOpenChange,
  profileId,
  profileName,
  photoUrl,
  lodgeName,
  lodgeCity,
  lodgeState,
  onGenerate,
  onPhotoUpdated,
  isGenerating,
}: EditalFormDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(photoUrl || null);

  const [formData, setFormData] = useState<EditalFormData>({
    oriente: lodgeCity || 'São Paulo',
    endereco: 'Rua Paru 175 - TUCURUVI-SP',
    sessaoHora: '20:00',
    rito: 'R.E.A',
    lodgeNumber: '001',
  });

  useEffect(() => {
    if (open) {
      setCurrentPhoto(photoUrl || null);
      setFormData({
        oriente: (lodgeCity && !lodgeCity.toLowerCase().startsWith('rua') ? lodgeCity : '') || 'São Paulo',
        endereco: 'Rua Paru 175 - TUCURUVI-SP',
        sessaoHora: '20:00',
        rito: 'R.E.A',
        lodgeNumber: '001',
      });
    }
  }, [open, lodgeCity, photoUrl]);

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Formato Inválido',
        description: 'Selecione um arquivo de imagem (JPEG ou PNG).',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Arquivo Muito Grande',
        description: 'A imagem deve ter no máximo 10MB.',
        variant: 'destructive',
      });
      return;
    }

    // Leitura local imediata para garantia total da foto no Edital baixado
    const reader = new FileReader();
    reader.onload = (re) => {
      const localDataUrl = re.target?.result as string;
      if (localDataUrl) {
        setCurrentPhoto(localDataUrl);
        onPhotoUpdated?.(localDataUrl);
      }
    };
    reader.readAsDataURL(file);

    setUploadingPhoto(true);
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `proposals/${Date.now()}-${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

      const newPhotoUrl = urlData.publicUrl;

      // Persiste no banco de dados para o perfil
      if (profileId) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ photo_url: newPhotoUrl } as any)
          .eq('id', profileId);

        if (updateError) {
          console.warn('Aviso ao atualizar photo_url no perfil:', updateError);
        }
      }

      setCurrentPhoto(newPhotoUrl);
      onPhotoUpdated?.(newPhotoUrl);

      toast({
        title: 'Foto 3x4 Anexada!',
        description: 'A foto foi salva e será impressa no Edital.',
      });
    } catch (err: any) {
      console.error('Erro no upload da foto do edital:', err);
      toast({
        title: 'Erro ao Enviar Foto',
        description: err.message || 'Não foi possível enviar a foto.',
        variant: 'destructive',
      });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = () => {
    onGenerate({
      ...formData,
      photoUrl: currentPhoto || photoUrl || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Gerar Edital</DialogTitle>
          <DialogDescription>
            Preencha os dados da Loja e confirme a foto para gerar o edital de {profileName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* FOTO DO CANDIDATO PARA O EDITAL */}
          <div className="p-3.5 rounded-xl border border-border bg-card/60 space-y-3">
            <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Foto 3x4 do Candidato no Edital</span>
              {currentPhoto ? (
                <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px] gap-1 font-semibold">
                  <CheckCircle2 size={12} /> Foto Vinculada
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-500/50 text-amber-500 text-[10px] gap-1 font-semibold">
                  <AlertTriangle size={12} /> Sem Foto Cadastrada
                </Badge>
              )}
            </Label>

            <div className="flex items-center gap-4">
              <div className="relative w-20 h-24 rounded-lg overflow-hidden border-2 border-border bg-accent flex items-center justify-center shrink-0 shadow-sm">
                {currentPhoto ? (
                  <img
                    src={currentPhoto}
                    alt={profileName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-[10px] text-muted-foreground text-center p-1 font-medium">
                    <Camera size={20} className="mb-1 text-muted-foreground/60" />
                    <span>FOTO 3x4</span>
                  </div>
                )}
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white">
                    <Loader2 size={18} className="animate-spin" />
                  </div>
                )}
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {currentPhoto 
                    ? 'Esta foto oficial será inserida no quadro do Edital impresso.' 
                    : 'O candidato não possui foto cadastrada. Você pode anexar uma foto 3x4 agora para sair no Edital.'}
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="h-8 text-xs gap-1.5 border-primary/40 hover:bg-primary/10"
                  >
                    <Upload size={13} />
                    {currentPhoto ? 'Trocar Foto' : 'Anexar Foto 3x4 Agora'}
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  className="hidden"
                  onChange={handleUploadPhoto}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lodgeNumber">Nº da Loja</Label>
              <Input
                id="lodgeNumber"
                value={formData.lodgeNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, lodgeNumber: e.target.value }))}
                placeholder="Ex: 001"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="oriente">Oriente (Cidade)</Label>
              <Input
                id="oriente"
                value={formData.oriente}
                onChange={(e) => setFormData(prev => ({ ...prev, oriente: e.target.value }))}
                placeholder="Ex: São Paulo"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço da Loja</Label>
            <Input
              id="endereco"
              value={formData.endereco}
              onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
              placeholder="Ex: Rua Paru 175 - TUCURUVI-SP"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sessaoHora">Sessões às</Label>
              <Select
                value={formData.sessaoHora}
                onValueChange={(value) => setFormData(prev => ({ ...prev, sessaoHora: value }))}
              >
                <SelectTrigger id="sessaoHora">
                  <SelectValue placeholder="Selecione o horário" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}H
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rito">Rito</Label>
              <Select
                value={formData.rito}
                onValueChange={(value) => setFormData(prev => ({ ...prev, rito: value }))}
              >
                <SelectTrigger id="rito">
                  <SelectValue placeholder="Selecione o rito" />
                </SelectTrigger>
                <SelectContent>
                  {RITOS.map((rito) => (
                    <SelectItem key={rito} value={rito}>
                      {rito}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {lodgeName && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Loja:</strong> {lodgeName}
              </p>
              {(lodgeCity || lodgeState) && (
                <p className="text-sm text-muted-foreground">
                  <strong>Localização:</strong> {[lodgeCity, lodgeState].filter(Boolean).join(' - ')}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isGenerating}>
            <Printer className="mr-2 h-4 w-4" />
            {isGenerating ? 'Gerando...' : 'Gerar PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
