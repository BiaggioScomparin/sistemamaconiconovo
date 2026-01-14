import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLibraryItems, useDeleteLibraryItem, LibraryItem, LibraryCategory } from '@/hooks/useLibrary';
import { LibraryFormDialog } from '@/components/admin/LibraryFormDialog';
import { Plus, Pencil, Trash2, BookOpen, ExternalLink, FileText, BookMarked, GraduationCap, FolderOpen } from 'lucide-react';
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

const categoryIcons: Record<LibraryCategory, React.ReactNode> = {
  Documentos: <FileText className="h-4 w-4" />,
  Livros: <BookMarked className="h-4 w-4" />,
  Cursos: <GraduationCap className="h-4 w-4" />,
  Trabalhos: <FolderOpen className="h-4 w-4" />,
};

const categories: LibraryCategory[] = ['Documentos', 'Livros', 'Cursos', 'Trabalhos'];

export default function AdminLibrary() {
  const { data: items, isLoading } = useLibraryItems();
  const deleteMutation = useDeleteLibraryItem();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<LibraryCategory>('Documentos');

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

  const filteredItems = items?.filter((item) => (item.category || 'Documentos') === activeCategory);

  const getCategoryCount = (category: LibraryCategory) => {
    return items?.filter((item) => (item.category || 'Documentos') === category).length || 0;
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

        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as LibraryCategory)}>
          <TabsList className="grid w-full grid-cols-4">
            {categories.map((category) => (
              <TabsTrigger key={category} value={category} className="flex items-center gap-2">
                {categoryIcons[category]}
                <span className="hidden sm:inline">{category}</span>
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5">
                  {getCategoryCount(category)}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((category) => (
            <TabsContent key={category} value={category} className="mt-6">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-pulse text-muted-foreground">Carregando...</div>
                </div>
              ) : filteredItems?.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum item em {category}</p>
                    <Button onClick={handleNewItem} className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar primeiro item
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredItems?.map((item) => (
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
            </TabsContent>
          ))}
        </Tabs>
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
