import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateLibraryItem, useUpdateLibraryItem, LibraryItem } from '@/hooks/useLibrary';
import { toast } from 'sonner';

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
  const [degree, setDegree] = useState<'Aprendiz' | 'Companheiro' | 'Mestre'>('Aprendiz');

  const createMutation = useCreateLibraryItem();
  const updateMutation = useUpdateLibraryItem();

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description || '');
      setContent(item.content || '');
      setFileUrl(item.file_url || '');
      setDegree(item.degree);
    } else {
      setTitle('');
      setDescription('');
      setContent('');
      setFileUrl('');
      setDegree('Aprendiz');
    }
  }, [item, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (item) {
        await updateMutation.mutateAsync({
          id: item.id,
          title,
          description: description || null,
          content: content || null,
          file_url: fileUrl || null,
          degree,
        });
        toast.success('Item atualizado com sucesso!');
      } else {
        await createMutation.mutateAsync({
          title,
          description: description || null,
          content: content || null,
          file_url: fileUrl || null,
          file_type: null,
          degree,
        });
        toast.success('Item criado com sucesso!');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao salvar item');
      console.error(error);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

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
            <Label htmlFor="fileUrl">URL do Arquivo (opcional)</Label>
            <Input
              id="fileUrl"
              type="url"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : item ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
