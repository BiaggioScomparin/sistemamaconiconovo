import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateLibraryItem, useUpdateLibraryItem, LibraryItem } from '@/hooks/useLibrary';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, X, FileText, Loader2 } from 'lucide-react';

interface LibraryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: LibraryItem | null;
}

export function LibraryFormDialog({ open, onOpenChange, item }: LibraryFormDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileType, setFileType] = useState('');
  const [degree, setDegree] = useState<'Aprendiz' | 'Companheiro' | 'Mestre' | 'Mestre Instalado'>('Aprendiz');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createMutation = useCreateLibraryItem();
  const updateMutation = useUpdateLibraryItem();

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description || '');
      setContent(item.content || '');
      setFileUrl(item.file_url || '');
      setFileType(item.file_type || '');
      setDegree(item.degree);
    } else {
      setTitle('');
      setDescription('');
      setContent('');
      setFileUrl('');
      setFileType('');
      setDegree('Aprendiz');
    }
    setSelectedFile(null);
  }, [item, open]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 50MB.');
        return;
      }
      setSelectedFile(file);
      setFileType(file.type);
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${degree.toLowerCase()}/${fileName}`;

    const { error } = await supabase.storage
      .from('library')
      .upload(filePath, file);

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('library')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFileUrl('');
    setFileType('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    
    try {
      let finalFileUrl = fileUrl;
      let finalFileType = fileType;

      // Upload new file if selected
      if (selectedFile) {
        finalFileUrl = await uploadFile(selectedFile) || '';
        finalFileType = selectedFile.type;
      }

      if (item) {
        await updateMutation.mutateAsync({
          id: item.id,
          title,
          description: description || null,
          content: content || null,
          file_url: finalFileUrl || null,
          file_type: finalFileType || null,
          degree,
        });
        toast.success('Item atualizado com sucesso!');
      } else {
        await createMutation.mutateAsync({
          title,
          description: description || null,
          content: content || null,
          file_url: finalFileUrl || null,
          file_type: finalFileType || null,
          degree,
        });
        toast.success('Item criado com sucesso!');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao salvar item');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || uploading;

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type === 'application/pdf') return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('spreadsheet') || type.includes('excel')) return '📊';
    if (type.includes('presentation') || type.includes('powerpoint')) return '📽️';
    if (type.startsWith('video/')) return '🎬';
    if (type.startsWith('audio/')) return '🎵';
    return '📁';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Editar Item' : 'Novo Item da Biblioteca'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="degree">Grau de Acesso *</Label>
            <Select value={degree} onValueChange={(v) => setDegree(v as typeof degree)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o grau" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Aprendiz">Aprendiz</SelectItem>
                <SelectItem value="Companheiro">Companheiro</SelectItem>
                <SelectItem value="Mestre">Mestre</SelectItem>
                <SelectItem value="Mestre Instalado">Mestre Instalado</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Mestres veem todos os itens. Companheiros veem Aprendiz e Companheiro. Aprendizes veem apenas Aprendiz.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="Texto do conteúdo..."
            />
          </div>

          <div className="space-y-2">
            <Label>Arquivo</Label>
            
            {/* Current or Selected File Display */}
            {(selectedFile || fileUrl) && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <span className="text-2xl">
                  {getFileIcon(selectedFile?.type || fileType)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {selectedFile?.name || fileUrl.split('/').pop()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedFile 
                      ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                      : 'Arquivo atual'
                    }
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={removeFile}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* File Upload Area */}
            {!selectedFile && !fileUrl && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Clique para selecionar ou arraste um arquivo
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOC, XLS, PPT, imagens, vídeos (máx. 50MB)
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.mp4,.mp3,.wav"
            />

            {/* Or manual URL */}
            {!selectedFile && (
              <div className="pt-2">
                <Label htmlFor="fileUrl" className="text-xs text-muted-foreground">
                  Ou insira uma URL externa:
                </Label>
                <Input
                  id="fileUrl"
                  type="url"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploading ? 'Enviando...' : 'Salvando...'}
                </>
              ) : (
                item ? 'Atualizar' : 'Criar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
