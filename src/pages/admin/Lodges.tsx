import { useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLodges, useCreateLodge, useUpdateLodge, useDeleteLodge } from '@/hooks/useLodges';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Building2, Upload, Image } from 'lucide-react';
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
  const [formData, setFormData] = useState({ name: '', city: '', state: '', default_payment_amount: '200', logo_url: '' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const logoUrl = (lodge as any).logo_url || '';
      setFormData({ 
        name: lodge.name, 
        city: lodge.city || '', 
        state: lodge.state || '',
        default_payment_amount: String((lodge as any).default_payment_amount || 200),
        logo_url: logoUrl
      });
      setLogoPreview(logoUrl || null);
    } else {
      setEditingLodge(null);
      setFormData({ name: '', city: '', state: '', default_payment_amount: '200', logo_url: '' });
      setLogoPreview(null);
    }
    setLogoFile(null);
    setDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Erro', description: 'Selecione apenas arquivos de imagem', variant: 'destructive' });
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: 'Erro', description: 'O arquivo deve ter no máximo 2MB', variant: 'destructive' });
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const uploadLogo = async (lodgeId: string): Promise<string | null> => {
    if (!logoFile) return formData.logo_url || null;

    const fileExt = logoFile.name.split('.').pop();
    const fileName = `${lodgeId}/logo.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(fileName, logoFile, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Erro ao fazer upload do logo');
    }

    const { data: { publicUrl } } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    
    try {
      let logoUrl = formData.logo_url;

      if (editingLodge) {
        // Upload logo if there's a new file
        if (logoFile) {
          logoUrl = await uploadLogo(editingLodge.id) || '';
        }

        const dataToSave = {
          name: formData.name,
          city: formData.city,
          state: formData.state,
          default_payment_amount: parseFloat(formData.default_payment_amount) || 200,
          logo_url: logoUrl,
        };

        await updateLodge.mutateAsync({ id: editingLodge.id, ...dataToSave });
        toast({ title: 'Loja atualizada com sucesso!' });
      } else {
        // Create lodge first without logo
        const dataToSave = {
          name: formData.name,
          city: formData.city,
          state: formData.state,
          default_payment_amount: parseFloat(formData.default_payment_amount) || 200,
        };

        const newLodge = await createLodge.mutateAsync(dataToSave);
        
        // Upload logo if there's a file
        if (logoFile && newLodge?.id) {
          logoUrl = await uploadLogo(newLodge.id) || '';
          await updateLodge.mutateAsync({ id: newLodge.id, logo_url: logoUrl });
        }

        toast({ title: 'Loja criada com sucesso!' });
      }
      setDialogOpen(false);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
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
                
                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label>Logo da Loja</Label>
                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <div className="relative">
                        <img 
                          src={logoPreview} 
                          alt="Logo preview" 
                          className="w-20 h-20 object-contain rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setLogoFile(null);
                            setLogoPreview(null);
                            setFormData({ ...formData, logo_url: '' });
                          }}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
                      >
                        <Image className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {logoPreview ? 'Alterar Logo' : 'Selecionar Logo'}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG ou GIF. Máximo 2MB.
                      </p>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-primary hover:bg-navy-light text-primary-foreground" disabled={uploading}>
                  {uploading ? 'Salvando...' : editingLodge ? 'Salvar Alterações' : 'Criar Loja'}
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
                    <TableHead className="w-16">Logo</TableHead>
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
                      <TableCell>
                        {(lodge as any).logo_url ? (
                          <img 
                            src={(lodge as any).logo_url} 
                            alt={`Logo ${lodge.name}`}
                            className="w-10 h-10 object-contain rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
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
