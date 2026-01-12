import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, FileSpreadsheet, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { 
  downloadMembersTemplate, 
  parseExcelMembers, 
  validateMemberData,
  MemberImportRow 
} from '@/lib/excelMembersTemplate';

interface ImportMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportResult {
  member: MemberImportRow;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

export function ImportMembersDialog({ open, onOpenChange }: ImportMembersDialogProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [members, setMembers] = useState<ImportResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [importing, setImporting] = useState(false);
  const [lodgesMap, setLodgesMap] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Fetch lodges to map names to IDs
      const { data: lodges } = await supabase
        .from('lodges')
        .select('id, name');
      
      const lodgeMapping: Record<string, string> = {};
      lodges?.forEach(l => {
        lodgeMapping[l.name.toLowerCase()] = l.id;
      });
      setLodgesMap(lodgeMapping);

      // Parse Excel file
      const parsedMembers = await parseExcelMembers(file);
      
      if (parsedMembers.length === 0) {
        toast({
          title: 'Arquivo vazio',
          description: 'Nenhum membro válido encontrado no arquivo. Verifique se os campos obrigatórios estão preenchidos.',
          variant: 'destructive',
        });
        return;
      }

      // Validate each member
      const results: ImportResult[] = parsedMembers.map(member => {
        const validation = validateMemberData(member);
        return {
          member,
          status: validation.valid ? 'pending' : 'error',
          message: validation.errors.join('; '),
        };
      });

      setMembers(results);
      setStep('preview');
    } catch (error: any) {
      console.error('Error parsing file:', error);
      toast({
        title: 'Erro ao ler arquivo',
        description: error.message || 'Não foi possível processar o arquivo Excel.',
        variant: 'destructive',
      });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    const validMembers = members.filter(m => m.status === 'pending');
    if (validMembers.length === 0) {
      toast({
        title: 'Nenhum membro válido',
        description: 'Corrija os erros antes de importar.',
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);
    setStep('importing');
    setProgress(0);

    const results = [...members];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      
      if (result.status === 'error') {
        errorCount++;
        continue;
      }

      const member = result.member;

      try {
        // Find lodge ID
        let lodgeId = null;
        if (member.lodge_name) {
          lodgeId = lodgesMap[member.lodge_name.toLowerCase()] || null;
        }

        const profileData = {
          full_name: member.full_name,
          email: member.email,
          cpf: member.cpf,
          birth_date: member.birth_date,
          mother_name: member.mother_name || null,
          spouse_name: member.spouse_name || null,
          initiation_date: member.initiation_date || null,
          degree: member.degree || 'Aprendiz',
          lodge_id: lodgeId,
          cep: member.cep || null,
          street: member.street || null,
          number: member.number || null,
          complement: member.complement || null,
          neighborhood: member.neighborhood || null,
          city: member.city || null,
          state: member.state || null,
          phone: member.phone || null,
          cell_phone: member.cell_phone || null,
          status: 'approved',
          member_status: 'active',
        };

        const { error } = await supabase
          .from('profiles')
          .insert(profileData);

        if (error) throw error;

        results[i] = { ...result, status: 'success', message: 'Importado com sucesso' };
        successCount++;
      } catch (error: any) {
        results[i] = { 
          ...result, 
          status: 'error', 
          message: error.message || 'Erro ao importar' 
        };
        errorCount++;
      }

      setProgress(((i + 1) / results.length) * 100);
      setMembers([...results]);
    }

    setImporting(false);
    setStep('done');

    queryClient.invalidateQueries({ queryKey: ['all-profiles'] });

    toast({
      title: 'Importação concluída',
      description: `${successCount} membro(s) importado(s) com sucesso. ${errorCount} erro(s).`,
      variant: successCount > 0 ? 'default' : 'destructive',
    });
  };

  const handleClose = () => {
    setStep('upload');
    setMembers([]);
    setProgress(0);
    onOpenChange(false);
  };

  const validCount = members.filter(m => m.status === 'pending' || m.status === 'success').length;
  const errorCount = members.filter(m => m.status === 'error').length;
  const successCount = members.filter(m => m.status === 'success').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Membros via Excel
          </DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo Excel com os dados dos membros.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="py-8">
            <div className="flex flex-col items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Baixe o modelo de planilha, preencha com os dados dos membros e faça o upload.
                </p>
                <Button 
                  variant="outline" 
                  onClick={downloadMembersTemplate}
                  className="mb-6"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Baixar Modelo Excel
                </Button>
              </div>

              <div className="border-2 border-dashed border-border rounded-lg p-8 w-full max-w-md text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Arraste o arquivo ou clique para selecionar
                </p>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="max-w-xs mx-auto"
                />
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-sm">
                {members.length} membro(s) encontrado(s)
              </Badge>
              <Badge variant="default" className="text-sm bg-green-600">
                {validCount} válido(s)
              </Badge>
              {errorCount > 0 && (
                <Badge variant="destructive" className="text-sm">
                  {errorCount} com erro(s)
                </Badge>
              )}
            </div>

            <ScrollArea className="h-[400px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Status</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Nascimento</TableHead>
                    <TableHead>Grau</TableHead>
                    <TableHead>Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {result.status === 'pending' && (
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                        )}
                        {result.status === 'success' && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {result.status === 'error' && (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{result.member.full_name}</TableCell>
                      <TableCell>{result.member.email}</TableCell>
                      <TableCell>{result.member.cpf}</TableCell>
                      <TableCell>{result.member.birth_date}</TableCell>
                      <TableCell>{result.member.degree || 'Aprendiz'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {result.message || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={validCount === 0}>
                Importar {validCount} Membro(s)
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'importing' && (
          <div className="py-8 space-y-6">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-secondary mb-4" />
              <p className="text-lg font-medium">Importando membros...</p>
              <p className="text-muted-foreground">Por favor, aguarde.</p>
            </div>
            <Progress value={progress} className="w-full" />
            <p className="text-center text-sm text-muted-foreground">
              {Math.round(progress)}% concluído
            </p>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-4 py-4">
              <Badge variant="default" className="text-sm bg-green-600">
                {successCount} importado(s)
              </Badge>
              {errorCount > 0 && (
                <Badge variant="destructive" className="text-sm">
                  {errorCount} erro(s)
                </Badge>
              )}
            </div>

            <ScrollArea className="h-[300px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Status</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Resultado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {result.status === 'success' && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {result.status === 'error' && (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{result.member.full_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {result.message || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <DialogFooter>
              <Button onClick={handleClose}>Fechar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
