import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useSignMinute, useMinuteSignatures, SessionMinute } from '@/hooks/useSessionMinutes';
import { useProfile } from '@/hooks/useProfile';
import { useLodges } from '@/hooks/useLodges';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import { generateMinutePdf } from '@/lib/generateMinutePdf';
import { toast } from 'sonner';
import { Loader2, Check, Clock, PenLine, Shield, Cloud } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MinuteSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  minute: SessionMinute;
}

const requiredPositions = [
  { position: 'veneravel_mestre', label: 'Venerável Mestre' },
  { position: 'orador', label: 'Orador' },
  { position: 'secretario', label: 'Secretário' },
];

export function MinuteSignatureDialog({ open, onOpenChange, minute }: MinuteSignatureDialogProps) {
  const { data: profile } = useProfile();
  const { data: lodges } = useLodges();
  const { data: signatures, isLoading: loadingSignatures, refetch: refetchSignatures } = useMinuteSignatures(minute.id);
  const signMutation = useSignMinute();
  const { status: driveStatus, uploadBackup } = useGoogleDrive();
  const [agreed, setAgreed] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const lodgeName = lodges?.find(l => l.id === minute.lodge_id)?.name || '';

  const canSign = profile?.lodge_position && 
    requiredPositions.some(p => p.position === profile.lodge_position) &&
    !signatures?.some(s => s.signer_id === profile.id);

  const hasAlreadySigned = signatures?.some(s => s.signer_id === profile?.id);

  const performAutoBackup = useCallback(async () => {
    if (!driveStatus.connected) return;
    
    setIsBackingUp(true);
    try {
      // Refetch signatures to get the latest
      const { data: updatedSignatures } = await refetchSignatures();
      
      const pdfContent = await generateMinutePdf({
        minute,
        signatures: updatedSignatures || [],
        lodgeName,
        returnBase64: true
      });
      
      const sessionDate = format(new Date(minute.session_date + 'T12:00:00'), 'dd-MM-yyyy', { locale: ptBR });
      const sessionType = minute.session_type === 'ordinaria' ? 'Ordinaria' : 'Magna';
      const fileName = `Ata_${sessionType}_${sessionDate}_N${minute.session_number || 'X'}_Assinada.pdf`;

      const result = await uploadBackup(minute.id, fileName, pdfContent, 'application/pdf');
      
      if (result.success) {
        toast.success('Backup automático salvo no Google Drive!', {
          description: 'A ata assinada foi salva automaticamente.',
          icon: <Cloud className="h-4 w-4" />,
        });
      }
    } catch (error) {
      console.error('Auto backup error:', error);
    } finally {
      setIsBackingUp(false);
    }
  }, [driveStatus.connected, minute, lodgeName, refetchSignatures, uploadBackup]);

  const handleSign = async () => {
    if (!profile || !canSign || !agreed) return;

    try {
      const result = await signMutation.mutateAsync({
        minuteId: minute.id,
        signerId: profile.id,
        signerName: profile.full_name,
        signerPosition: profile.lodge_position || '',
      });
      
      toast.success('Ata assinada com sucesso!');
      setAgreed(false);

      // If all signatures are complete, trigger auto backup
      if (result.allSigned) {
        toast.info('Todas as assinaturas coletadas! Ata concluída.', {
          description: driveStatus.connected 
            ? 'Fazendo backup automático no Google Drive...' 
            : 'Conecte o Google Drive para backup automático.',
        });
        
        if (driveStatus.connected) {
          // Small delay to ensure DB is updated
          setTimeout(() => performAutoBackup(), 1000);
        }
      }
    } catch (error: any) {
      if (error?.code === '23505') {
        toast.error('Você já assinou esta ata');
      } else {
        toast.error('Erro ao assinar ata');
      }
      console.error(error);
    }
  };

  const getSignatureForPosition = (position: string) => {
    return signatures?.find(s => s.signer_position === position);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5" />
            Assinaturas da Ata
          </DialogTitle>
          <DialogDescription>
            Sessão {minute.session_type === 'ordinaria' ? 'Ordinária' : 'Magna'} de{' '}
            {format(new Date(minute.session_date + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge variant={minute.status === 'signed' ? 'default' : 'secondary'}>
              {minute.status === 'draft' && 'Rascunho'}
              {minute.status === 'completed' && 'Aguardando Assinaturas'}
              {minute.status === 'signed' && 'Assinada'}
            </Badge>
          </div>

          {/* Required Signatures */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Assinaturas Necessárias</h4>
            
            {loadingSignatures ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {requiredPositions.map(({ position, label }) => {
                  const signature = getSignatureForPosition(position);
                  return (
                    <div
                      key={position}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        signature ? 'bg-green-500/10 border-green-500/30' : 'bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {signature ? (
                          <Check className="h-5 w-5 text-green-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{label}</p>
                          {signature && (
                            <p className="text-xs text-muted-foreground">
                              {signature.signer_name} - {format(new Date(signature.signed_at), "dd/MM/yyyy 'às' HH:mm")}
                            </p>
                          )}
                        </div>
                      </div>
                      {signature && (
                        <Shield className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sign Section */}
          {minute.status === 'completed' && canSign && !hasAlreadySigned && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="agree"
                  checked={agreed}
                  onCheckedChange={(checked) => setAgreed(checked === true)}
                />
                <Label htmlFor="agree" className="text-sm leading-relaxed cursor-pointer">
                  Declaro que li e estou de acordo com o conteúdo desta ata, e autorizo o registro 
                  da minha assinatura digital como {profile?.lodge_position}.
                </Label>
              </div>

              <Button
                className="w-full"
                onClick={handleSign}
                disabled={!agreed || signMutation.isPending}
              >
                {signMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assinando...
                  </>
                ) : (
                  <>
                    <PenLine className="mr-2 h-4 w-4" />
                    Assinar como {profile?.lodge_position}
                  </>
                )}
              </Button>
            </div>
          )}

          {hasAlreadySigned && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <Check className="h-5 w-5 text-green-500" />
              <span className="text-sm text-green-700 dark:text-green-400">
                Você já assinou esta ata
              </span>
            </div>
          )}

          {minute.status === 'draft' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <Clock className="h-5 w-5 text-amber-500" />
              <span className="text-sm text-amber-700 dark:text-amber-400">
                A ata precisa ser concluída antes de poder ser assinada
              </span>
            </div>
          )}

          {/* Backup status */}
          {isBackingUp && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              <span className="text-sm text-blue-700 dark:text-blue-400">
                Salvando backup automático no Google Drive...
              </span>
            </div>
          )}

          {/* Google Drive status info */}
          {minute.status === 'completed' && driveStatus.connected && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
              <Cloud className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">
                Backup automático ativado ({driveStatus.email})
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
