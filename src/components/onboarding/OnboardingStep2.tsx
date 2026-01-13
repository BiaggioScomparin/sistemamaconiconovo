import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, MapPin, ArrowRight, ArrowLeft } from 'lucide-react';
import { LodgeData } from '@/pages/onboarding/Onboarding';

interface OnboardingStep2Props {
  data: LodgeData;
  onChange: (data: LodgeData) => void;
  onNext: () => void;
  onBack: () => void;
}

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function OnboardingStep2({ data, onChange, onNext, onBack }: OnboardingStep2Props) {
  const isValid = data.name.trim().length >= 3 && data.city.trim().length >= 2 && data.state.length === 2;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-foreground">Primeira Loja</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure sua primeira loja maçônica
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="lodgeName" className="text-foreground">Nome da Loja</Label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="lodgeName"
              type="text"
              value={data.name}
              onChange={(e) => onChange({ ...data, name: e.target.value })}
              placeholder="Ex: Loja Estrela do Sul nº 123"
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city" className="text-foreground">Cidade</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="city"
                type="text"
                value={data.city}
                onChange={(e) => onChange({ ...data, city: e.target.value })}
                placeholder="São Paulo"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="state" className="text-foreground">Estado</Label>
            <Select
              value={data.state}
              onValueChange={(value) => onChange({ ...data, state: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                {BRAZILIAN_STATES.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Button onClick={onNext} className="flex-1" disabled={!isValid}>
          Próximo
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
