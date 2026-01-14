import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GoogleDriveStatus {
  connected: boolean;
  email?: string;
  loading: boolean;
}

interface BackupResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  webViewLink?: string;
  error?: string;
}

export function useGoogleDrive() {
  const [status, setStatus] = useState<GoogleDriveStatus>({ connected: false, loading: true });
  const { toast } = useToast();

  const checkStatus = useCallback(async () => {
    try {
      setStatus(prev => ({ ...prev, loading: true }));
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus({ connected: false, loading: false });
        return;
      }

      const { data, error } = await supabase.functions.invoke('google-drive-status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setStatus({
        connected: data.connected,
        email: data.email,
        loading: false,
      });
    } catch (error) {
      console.error('Error checking Google Drive status:', error);
      setStatus({ connected: false, loading: false });
    }
  }, []);

  useEffect(() => {
    checkStatus();

    // Listen for connection messages from popup
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'google-drive-connected') {
        setStatus({
          connected: true,
          email: event.data.email,
          loading: false,
        });
        toast({
          title: 'Google Drive conectado!',
          description: `Conectado como ${event.data.email}`,
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [checkStatus, toast]);

  const connect = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Erro',
          description: 'Você precisa estar logado para conectar o Google Drive',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('google-drive-auth', {
        body: {
          userId: session.user.id,
          returnUrl: window.location.href,
        },
      });

      if (error) throw error;

      // Open auth URL in popup
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        data.authUrl,
        'google-drive-auth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (error) {
      console.error('Error connecting to Google Drive:', error);
      toast({
        title: 'Erro ao conectar',
        description: 'Não foi possível iniciar a conexão com o Google Drive',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const disconnect = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.functions.invoke('google-drive-disconnect', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setStatus({ connected: false, loading: false });
      toast({
        title: 'Desconectado',
        description: 'Google Drive foi desconectado com sucesso',
      });
    } catch (error) {
      console.error('Error disconnecting Google Drive:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível desconectar o Google Drive',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const uploadBackup = useCallback(async (
    minuteId: string,
    fileName: string,
    content: string, // base64 encoded content
    mimeType: string = 'application/pdf'
  ): Promise<BackupResult> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data, error } = await supabase.functions.invoke('google-drive-upload', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          minuteId,
          fileName,
          content,
          mimeType,
        },
      });

      if (error) throw error;

      if (data.error) {
        if (data.code === 'NOT_CONNECTED') {
          return { success: false, error: 'Google Drive não conectado' };
        }
        throw new Error(data.error);
      }

      toast({
        title: 'Backup salvo!',
        description: `Arquivo "${fileName}" salvo no Google Drive`,
      });

      return {
        success: true,
        fileId: data.fileId,
        fileName: data.fileName,
        webViewLink: data.webViewLink,
      };
    } catch (error) {
      console.error('Error uploading backup:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao fazer backup',
        description: message,
        variant: 'destructive',
      });
      return { success: false, error: message };
    }
  }, [toast]);

  return {
    status,
    connect,
    disconnect,
    uploadBackup,
    checkStatus,
  };
}
