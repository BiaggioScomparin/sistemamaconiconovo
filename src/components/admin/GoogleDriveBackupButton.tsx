import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Cloud, CloudOff, Upload, Link2, ExternalLink, Loader2 } from 'lucide-react';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import { SessionMinute } from '@/hooks/useSessionMinutes';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GoogleDriveBackupButtonProps {
  minute: SessionMinute;
  onGeneratePdf: () => Promise<string>; // Should return base64 PDF content
}

export function GoogleDriveBackupButton({ minute, onGeneratePdf }: GoogleDriveBackupButtonProps) {
  const { status, connect, disconnect, uploadBackup } = useGoogleDrive();
  const [isUploading, setIsUploading] = useState(false);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [lastBackupLink, setLastBackupLink] = useState<string | null>(null);

  const handleBackup = async () => {
    if (!status.connected) {
      setShowConnectDialog(true);
      return;
    }

    setIsUploading(true);
    try {
      const pdfContent = await onGeneratePdf();
      
      const sessionDate = format(new Date(minute.session_date + 'T12:00:00'), 'dd-MM-yyyy', { locale: ptBR });
      const sessionType = minute.session_type === 'ordinaria' ? 'Ordinaria' : 'Magna';
      const fileName = `Ata_${sessionType}_${sessionDate}_N${minute.session_number || 'X'}.pdf`;

      const result = await uploadBackup(minute.id, fileName, pdfContent, 'application/pdf');
      
      if (result.success && result.webViewLink) {
        setLastBackupLink(result.webViewLink);
      }
    } finally {
      setIsUploading(false);
    }
  };

  if (status.loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className={status.connected ? 'text-green-600 border-green-200' : ''}
          >
            {status.connected ? (
              <Cloud className="h-4 w-4" />
            ) : (
              <CloudOff className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {status.connected ? (
            <>
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                Conectado: {status.email}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleBackup} disabled={isUploading}>
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Fazer Backup no Drive
              </DropdownMenuItem>
              {lastBackupLink && (
                <DropdownMenuItem onClick={() => window.open(lastBackupLink, '_blank')}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ver último backup
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={disconnect} className="text-destructive">
                <CloudOff className="mr-2 h-4 w-4" />
                Desconectar Drive
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem onClick={() => setShowConnectDialog(true)}>
              <Link2 className="mr-2 h-4 w-4" />
              Conectar Google Drive
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conectar Google Drive</DialogTitle>
            <DialogDescription>
              Para fazer backup das atas no Google Drive, você precisa autorizar o acesso à sua conta Google.
              Os arquivos serão salvos em uma pasta chamada "Atas Maçônicas - Backup".
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Cloud className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Backup Automático</p>
                <p className="text-sm text-muted-foreground">
                  Salve suas atas em PDF diretamente no seu Google Drive
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConnectDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => { connect(); setShowConnectDialog(false); }}>
              <Cloud className="mr-2 h-4 w-4" />
              Conectar ao Google Drive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
