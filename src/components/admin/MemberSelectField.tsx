import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LodgeMember } from '@/hooks/useLodgeMembers';

interface MemberSelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  members: LodgeMember[];
  disabled?: boolean;
  placeholder?: string;
}

export function MemberSelectField({
  id,
  label,
  value,
  onChange,
  members,
  disabled = false,
  placeholder = "Selecione um membro"
}: MemberSelectFieldProps) {
  const [isOther, setIsOther] = useState(false);
  const [customValue, setCustomValue] = useState('');

  // Check if current value matches a member or is custom
  const isCustomValue = value && !members.some(m => m.full_name === value) && value !== '';
  const showCustomInput = isOther || isCustomValue;

  const handleSelectChange = (selectedValue: string) => {
    if (selectedValue === '__other__') {
      setIsOther(true);
      setCustomValue('');
      onChange('');
    } else {
      setIsOther(false);
      onChange(selectedValue);
    }
  };

  const handleCustomChange = (newValue: string) => {
    setCustomValue(newValue);
    onChange(newValue);
  };

  const handleBackToSelect = () => {
    setIsOther(false);
    setCustomValue('');
    onChange('');
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {showCustomInput ? (
        <div className="flex gap-2">
          <Input
            id={id}
            value={isCustomValue ? value : customValue}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="Digite o nome..."
            disabled={disabled}
            className="flex-1"
          />
          <button
            type="button"
            onClick={handleBackToSelect}
            className="text-xs text-muted-foreground hover:text-foreground px-2"
            disabled={disabled}
          >
            ← Lista
          </button>
        </div>
      ) : (
        <Select
          value={value || undefined}
          onValueChange={handleSelectChange}
          disabled={disabled}
        >
          <SelectTrigger id={id}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.full_name}>
                {member.full_name}
                {member.lodge_position && (
                  <span className="text-muted-foreground ml-2 text-xs">
                    ({member.lodge_position.replace(/_/g, ' ')})
                  </span>
                )}
              </SelectItem>
            ))}
            <SelectItem value="__other__" className="text-muted-foreground italic">
              Outro (digitar nome)
            </SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
