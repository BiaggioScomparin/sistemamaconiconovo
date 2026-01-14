import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useSignMinute, useMinuteSignatures, SessionMinute } from '@/hooks/useSessionMinutes';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { Loader2, Check, Clock, PenLine, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MinuteSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  minute: SessionMinute;
}

const requiredPositions = [
  { position: 'Venerável Mestre', label: 'Venerável Mestre' },
  { position: 'Orador', label: 'Orador' },
  { position: 'Secretário', label: 'Secretário' },
];

export function MinuteSignatureDialog({ open, onOpenChange, minute }: MinuteSignatureDialogProps) {
  const { data: profile } = useProfile();
  const { data: signatures, isLoading: loadingSignatures } = useMinuteSignatures(minute.id);
  const signMutation = useSignMinute();
  const [agreed, setAgreed] = useState(false);

  const canSign = profile?.lodge_position && 
    requiredPositions.some(p => p.position === profile.lodge_position) &&
    !signatures?.some(s => s.signer_id === profile.id);

  const hasAlreadySigned = signatures?.some(s => s.signer_id === profile?.id);

  const handleSign = async () => {
    if (!profile || !canSign || !agreed) return;

    try {
      await signMutation.mutateAsync({
        minuteId: minute.id,
        signerId: profile.id,
        signerName: profile.full_name,
        signerPosition: profile.lodge_position || '',
      });
      toast.success('Ata assinada com sucesso!');
      setAgreed(false);
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
            {format(new Date(minute.session_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
