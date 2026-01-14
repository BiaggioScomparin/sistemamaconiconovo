import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLibraryItems, useDeleteLibraryItem, LibraryItem } from '@/hooks/useLibrary';
import { LibraryFormDialog } from '@/components/admin/LibraryFormDialog';
import { Plus, Pencil, Trash2, BookOpen, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const degreeColors: Record<string, string> = {
  Aprendiz: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Companheiro: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  Mestre: 'bg-red-500/10 text-red-500 border-red-500/20',
  'Mestre Instalado': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

export default function AdminLibrary() {
  const { data: items, isLoading } = useLibraryItems();
  const deleteMutation = useDeleteLibraryItem();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleEdit = (item: LibraryItem) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Item excluído com sucesso!');
    } catch (error) {
      toast.error('Erro ao excluir item');
    }
    setDeleteId(null);
  };

  const handleNewItem = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Biblioteca</h1>
            <p className="text-muted-foreground">
              Gerencie os conteúdos disponíveis para os membros
            </p>
          </div>
          <Button onClick={handleNewItem}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Item
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-pulse text-muted-foreground">Carregando...</div>
          </div>
        ) : items?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum item na biblioteca</p>
              <Button onClick={handleNewItem} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar primeiro item
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items?.map((item) => (
              <Card key={item.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg leading-tight">{item.title}</CardTitle>
                    <Badge variant="outline" className={degreeColors[item.degree]}>
                      {item.degree}
                    </Badge>
                  </div>
                  {item.description && (
                    <CardDescription className="line-clamp-2">
                      {item.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end">
                  {item.content && (
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {item.content}
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    {item.file_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={item.file_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Arquivo
                        </a>
                      </Button>
                    )}
                    <div className="flex-1" />
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => setDeleteId(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <LibraryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editingItem}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
