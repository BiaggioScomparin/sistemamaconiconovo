import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer } from 'lucide-react';

const RITOS = ['R.E.A', 'REEA', 'MODERNO', 'YORK', 'BRASILEIRO'];

const TIME_OPTIONS = [
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
];

export interface EditalFormData {
  oriente: string;
  endereco: string;
  sessaoHora: string;
  rito: string;
  lodgeNumber: string;
}

interface EditalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileName: string;
  lodgeName?: string;
  lodgeCity?: string;
  lodgeState?: string;
  onGenerate: (formData: EditalFormData) => void;
  isGenerating: boolean;
}

export function EditalFormDialog({
  open,
  onOpenChange,
  profileName,
  lodgeName,
  lodgeCity,
  lodgeState,
  onGenerate,
  isGenerating,
}: EditalFormDialogProps) {
  const [formData, setFormData] = useState<EditalFormData>({
    oriente: lodgeCity || 'São Paulo',
    endereco: 'Rua Paru 175 - TUCURUVI-SP',
    sessaoHora: '20:00',
    rito: 'R.E.A',
    lodgeNumber: '001',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        oriente: (lodgeCity && !lodgeCity.toLowerCase().startsWith('rua') ? lodgeCity : '') || 'São Paulo',
        endereco: 'Rua Paru 175 - TUCURUVI-SP',
        sessaoHora: '20:00',
        rito: 'R.E.A',
        lodgeNumber: '001',
      });
    }
  }, [open, lodgeCity]);

  const handleSubmit = () => {
    onGenerate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Gerar Edital</DialogTitle>
          <DialogDescription>
            Preencha os dados da Loja para gerar o edital de {profileName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lodgeNumber">Nº da Loja</Label>
              <Input
                id="lodgeNumber"
                value={formData.lodgeNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, lodgeNumber: e.target.value }))}
                placeholder="Ex: 001"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="oriente">Oriente (Cidade)</Label>
              <Input
                id="oriente"
                value={formData.oriente}
                onChange={(e) => setFormData(prev => ({ ...prev, oriente: e.target.value }))}
                placeholder="Ex: São Paulo"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço da Loja</Label>
            <Input
              id="endereco"
              value={formData.endereco}
              onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
              placeholder="Ex: Rua Paru 175 - TUCURUVI-SP"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sessaoHora">Sessões às</Label>
              <Select
                value={formData.sessaoHora}
                onValueChange={(value) => setFormData(prev => ({ ...prev, sessaoHora: value }))}
              >
                <SelectTrigger id="sessaoHora">
                  <SelectValue placeholder="Selecione o horário" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}H
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rito">Rito</Label>
              <Select
                value={formData.rito}
                onValueChange={(value) => setFormData(prev => ({ ...prev, rito: value }))}
              >
                <SelectTrigger id="rito">
                  <SelectValue placeholder="Selecione o rito" />
                </SelectTrigger>
                <SelectContent>
                  {RITOS.map((rito) => (
                    <SelectItem key={rito} value={rito}>
                      {rito}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {lodgeName && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Loja:</strong> {lodgeName}
              </p>
              {(lodgeCity || lodgeState) && (
                <p className="text-sm text-muted-foreground">
                  <strong>Localização:</strong> {[lodgeCity, lodgeState].filter(Boolean).join(' - ')}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isGenerating}>
            <Printer className="mr-2 h-4 w-4" />
            {isGenerating ? 'Gerando...' : 'Gerar PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
