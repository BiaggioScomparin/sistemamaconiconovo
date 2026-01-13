import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLodges, useCreateLodge, useUpdateLodge, useDeleteLodge } from '@/hooks/useLodges';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { Lodge } from '@/lib/supabase-types';

export default function AdminLodges() {
  const { user, loading, isAdmin } = useAuth();
  const { data: lodges, isLoading } = useLodges();
  const createLodge = useCreateLodge();
  const updateLodge = useUpdateLodge();
  const deleteLodge = useDeleteLodge();
  const { toast } = useToast();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLodge, setEditingLodge] = useState<Lodge | null>(null);
  const [formData, setFormData] = useState({ name: '', city: '', state: '', default_payment_amount: '200' });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleOpenDialog = (lodge?: Lodge) => {
    if (lodge) {
      setEditingLodge(lodge);
      setFormData({ 
        name: lodge.name, 
        city: lodge.city || '', 
        state: lodge.state || '',
        default_payment_amount: String((lodge as any).default_payment_amount || 200)
      });
    } else {
      setEditingLodge(null);
      setFormData({ name: '', city: '', state: '', default_payment_amount: '200' });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const dataToSave = {
      name: formData.name,
      city: formData.city,
      state: formData.state,
      default_payment_amount: parseFloat(formData.default_payment_amount) || 200,
    };
    
    try {
      if (editingLodge) {
        await updateLodge.mutateAsync({ id: editingLodge.id, ...dataToSave });
        toast({ title: 'Loja atualizada com sucesso!' });
      } else {
        await createLodge.mutateAsync(dataToSave);
        toast({ title: 'Loja criada com sucesso!' });
      }
      setDialogOpen(false);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta loja?')) return;
    
    try {
      await deleteLodge.mutateAsync(id);
      toast({ title: 'Loja excluída com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display text-foreground">Lojas Maçônicas</h1>
            <p className="text-muted-foreground font-body mt-1">Gerencie as lojas cadastradas</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="bg-secondary hover:bg-gold-dark text-secondary-foreground font-display">
                <Plus className="mr-2 h-4 w-4" />
                Nova Loja
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">
                  {editingLodge ? 'Editar Loja' : 'Nova Loja'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Loja *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      maxLength={2}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default_payment_amount">Valor Padrão da Mensalidade (R$)</Label>
                  <Input
                    id="default_payment_amount"
                    type="number"
                    value={formData.default_payment_amount}
                    onChange={(e) => setFormData({ ...formData, default_payment_amount: e.target.value })}
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground">
                    Este valor será usado ao gerar mensalidades automaticamente. Após vencimento, será acrescido R$50,00 de multa.
                  </p>
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-navy-light text-primary-foreground">
                  {editingLodge ? 'Salvar Alterações' : 'Criar Loja'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="card-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Building2 className="h-5 w-5 text-secondary" />
              Lojas Cadastradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : lodges?.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma loja cadastrada.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Valor Mensalidade</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lodges?.map((lodge) => (
                    <TableRow key={lodge.id}>
                      <TableCell className="font-medium">{lodge.name}</TableCell>
                      <TableCell>{lodge.city || '-'}</TableCell>
                      <TableCell>{lodge.state || '-'}</TableCell>
                      <TableCell>
                        R$ {Number((lodge as any).default_payment_amount || 200).toFixed(2).replace('.', ',')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(lodge)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(lodge.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
