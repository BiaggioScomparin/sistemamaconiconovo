import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLibraryItems } from '@/hooks/useLibrary';
import { useProfile } from '@/hooks/useProfile';
import { BookOpen, ExternalLink, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const degreeColors: Record<string, string> = {
  Aprendiz: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Companheiro: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  Mestre: 'bg-red-500/10 text-red-500 border-red-500/20',
  'Mestre Instalado': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

export default function MemberLibrary() {
  const { data: items, isLoading } = useLibraryItems();
  const { data: profile } = useProfile();

  // Filter items based on member's degree
  const filteredItems = items?.filter((item) => {
    const memberDegree = profile?.degree || 'Aprendiz';
    
    if (memberDegree === 'Mestre Instalado') {
      return true; // Installed Masters can see all
    }
    if (memberDegree === 'Mestre') {
      return ['Aprendiz', 'Companheiro', 'Mestre'].includes(item.degree);
    }
    if (memberDegree === 'Companheiro') {
      return item.degree === 'Aprendiz' || item.degree === 'Companheiro';
    }
    // Aprendiz can only see Aprendiz
    return item.degree === 'Aprendiz';
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Biblioteca</h1>
          <p className="text-muted-foreground">
            Conteúdos disponíveis para o grau de {profile?.degree || 'Aprendiz'}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-pulse text-muted-foreground">Carregando...</div>
          </div>
        ) : filteredItems?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum conteúdo disponível para seu grau</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems?.map((item) => (
              <Card key={item.id} className="flex flex-col hover:shadow-lg transition-shadow">
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
                    {item.content && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <FileText className="h-4 w-4 mr-1" />
                            Ler
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              {item.title}
                              <Badge variant="outline" className={degreeColors[item.degree]}>
                                {item.degree}
                              </Badge>
                            </DialogTitle>
                          </DialogHeader>
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            {item.description && (
                              <p className="text-muted-foreground italic">{item.description}</p>
                            )}
                            <div className="whitespace-pre-wrap">{item.content}</div>
                          </div>
                          {item.file_url && (
                            <div className="pt-4 border-t">
                              <Button asChild>
                                <a href={item.file_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Abrir Arquivo
                                </a>
                              </Button>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    )}
                    {item.file_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={item.file_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Arquivo
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
