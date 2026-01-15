import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Plus, Trash2, Move, Type } from 'lucide-react';
import { toast } from 'sonner';

export interface TagPosition {
  id: string;
  field: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right';
  enabled: boolean;
}

interface CustomInviteTemplateProps {
  customImage: string | null;
  onImageChange: (image: string | null) => void;
  tagPositions: TagPosition[];
  onTagPositionsChange: (positions: TagPosition[]) => void;
  inviteData: {
    lodgeName: string;
    lodgeCity: string;
    lodgeState: string;
    sessionType: string;
    date: string;
    time: string;
    veneravelMestre: string;
    names: string[];
    address: string;
  };
}

const AVAILABLE_TAGS = [
  { value: 'lodgeName', label: 'Nome da Loja' },
  { value: 'lodgeCity', label: 'Cidade' },
  { value: 'lodgeState', label: 'Estado' },
  { value: 'sessionType', label: 'Tipo de Sessão' },
  { value: 'date', label: 'Data' },
  { value: 'time', label: 'Horário' },
  { value: 'veneravelMestre', label: 'Venerável Mestre' },
  { value: 'names', label: 'Nomes (Iniciandos/etc)' },
  { value: 'address', label: 'Endereço' },
];

export function CustomInviteTemplate({
  customImage,
  onImageChange,
  tagPositions,
  onTagPositionsChange,
  inviteData,
}: CustomInviteTemplateProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um arquivo de imagem');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      onImageChange(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const addTag = () => {
    const usedFields = tagPositions.map(t => t.field);
    const availableField = AVAILABLE_TAGS.find(t => !usedFields.includes(t.value));
    
    if (!availableField) {
      toast.error('Todas as tags já foram adicionadas');
      return;
    }

    const newTag: TagPosition = {
      id: crypto.randomUUID(),
      field: availableField.value,
      x: 50,
      y: 50,
      fontSize: 16,
      color: '#000000',
      fontWeight: 'normal',
      textAlign: 'center',
      enabled: true,
    };

    onTagPositionsChange([...tagPositions, newTag]);
    setSelectedTagId(newTag.id);
  };

  const removeTag = (id: string) => {
    onTagPositionsChange(tagPositions.filter(t => t.id !== id));
    if (selectedTagId === id) setSelectedTagId(null);
  };

  const updateTag = (id: string, updates: Partial<TagPosition>) => {
    onTagPositionsChange(
      tagPositions.map(t => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const getTagValue = (field: string): string => {
    switch (field) {
      case 'lodgeName':
        return inviteData.lodgeName || '[Nome da Loja]';
      case 'lodgeCity':
        return inviteData.lodgeCity || '[Cidade]';
      case 'lodgeState':
        return inviteData.lodgeState || '[Estado]';
      case 'sessionType':
        return inviteData.sessionType || '[Tipo de Sessão]';
      case 'date':
        return inviteData.date || '[Data]';
      case 'time':
        return inviteData.time ? `${inviteData.time}h` : '[Horário]';
      case 'veneravelMestre':
        return inviteData.veneravelMestre || '[Venerável Mestre]';
      case 'names':
        return inviteData.names.length > 0 ? inviteData.names.join('\n') : '[Nomes]';
      case 'address':
        return inviteData.address || '[Endereço]';
      default:
        return '';
    }
  };

  const selectedTag = tagPositions.find(t => t.id === selectedTagId);

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div className="space-y-2">
        <Label>Imagem do Modelo (Canva)</Label>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            {customImage ? 'Trocar Imagem' : 'Importar do Canva'}
          </Button>
          {customImage && (
            <Button
              variant="destructive"
              size="icon"
              onClick={() => onImageChange(null)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        <p className="text-xs text-muted-foreground">
          Exporte sua arte do Canva como PNG e importe aqui
        </p>
      </div>

      {customImage && (
        <>
          {/* Tags Management */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Tags de Texto</Label>
              <Button variant="outline" size="sm" onClick={addTag}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Tag
              </Button>
            </div>
            
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {tagPositions.map((tag) => (
                <Card
                  key={tag.id}
                  className={`cursor-pointer transition-colors ${
                    selectedTagId === tag.id ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setSelectedTagId(tag.id)}
                >
                  <CardContent className="p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={tag.enabled}
                        onCheckedChange={(checked) => updateTag(tag.id, { enabled: checked })}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-sm">
                        {AVAILABLE_TAGS.find(t => t.value === tag.field)?.label}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTag(tag.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Tag Editor */}
          {selectedTag && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Type className="h-4 w-4" />
                  Editar Tag
                </div>

                <div className="space-y-2">
                  <Label>Campo</Label>
                  <Select
                    value={selectedTag.field}
                    onValueChange={(value) => updateTag(selectedTag.id, { field: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_TAGS.map((tag) => (
                        <SelectItem
                          key={tag.value}
                          value={tag.value}
                          disabled={tagPositions.some(
                            t => t.field === tag.value && t.id !== selectedTag.id
                          )}
                        >
                          {tag.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Posição X (%)</Label>
                    <Slider
                      value={[selectedTag.x]}
                      onValueChange={([value]) => updateTag(selectedTag.id, { x: value })}
                      min={0}
                      max={100}
                      step={1}
                    />
                    <span className="text-xs text-muted-foreground">{selectedTag.x}%</span>
                  </div>

                  <div className="space-y-2">
                    <Label>Posição Y (%)</Label>
                    <Slider
                      value={[selectedTag.y]}
                      onValueChange={([value]) => updateTag(selectedTag.id, { y: value })}
                      min={0}
                      max={100}
                      step={1}
                    />
                    <span className="text-xs text-muted-foreground">{selectedTag.y}%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tamanho da Fonte</Label>
                  <Slider
                    value={[selectedTag.fontSize]}
                    onValueChange={([value]) => updateTag(selectedTag.id, { fontSize: value })}
                    min={8}
                    max={48}
                    step={1}
                  />
                  <span className="text-xs text-muted-foreground">{selectedTag.fontSize}px</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cor</Label>
                    <Input
                      type="color"
                      value={selectedTag.color}
                      onChange={(e) => updateTag(selectedTag.id, { color: e.target.value })}
                      className="h-10 p-1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Peso</Label>
                    <Select
                      value={selectedTag.fontWeight}
                      onValueChange={(value: 'normal' | 'bold') =>
                        updateTag(selectedTag.id, { fontWeight: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="bold">Negrito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Alinhamento</Label>
                  <Select
                    value={selectedTag.textAlign}
                    onValueChange={(value: 'left' | 'center' | 'right') =>
                      updateTag(selectedTag.id, { textAlign: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Esquerda</SelectItem>
                      <SelectItem value="center">Centro</SelectItem>
                      <SelectItem value="right">Direita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

interface CustomInvitePreviewProps {
  customImage: string;
  tagPositions: TagPosition[];
  inviteData: {
    lodgeName: string;
    lodgeCity: string;
    lodgeState: string;
    sessionType: string;
    date: string;
    time: string;
    veneravelMestre: string;
    names: string[];
    address: string;
  };
  inviteRef: React.RefObject<HTMLDivElement>;
}

export function CustomInvitePreview({
  customImage,
  tagPositions,
  inviteData,
  inviteRef,
}: CustomInvitePreviewProps) {
  const getTagValue = (field: string): string => {
    switch (field) {
      case 'lodgeName':
        return inviteData.lodgeName || '';
      case 'lodgeCity':
        return inviteData.lodgeCity || '';
      case 'lodgeState':
        return inviteData.lodgeState || '';
      case 'sessionType':
        return inviteData.sessionType || '';
      case 'date':
        return inviteData.date || '';
      case 'time':
        return inviteData.time ? `${inviteData.time}h` : '';
      case 'veneravelMestre':
        return inviteData.veneravelMestre || '';
      case 'names':
        return inviteData.names.join('\n');
      case 'address':
        return inviteData.address || '';
      default:
        return '';
    }
  };

  return (
    <div
      ref={inviteRef}
      className="relative inline-block"
      style={{ maxWidth: '100%' }}
    >
      <img
        src={customImage}
        alt="Convite personalizado"
        className="max-w-full h-auto"
        crossOrigin="anonymous"
      />
      {tagPositions
        .filter(tag => tag.enabled)
        .map((tag) => (
          <div
            key={tag.id}
            className="absolute whitespace-pre-line"
            style={{
              left: `${tag.x}%`,
              top: `${tag.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${tag.fontSize}px`,
              color: tag.color,
              fontWeight: tag.fontWeight,
              textAlign: tag.textAlign,
            }}
          >
            {getTagValue(tag.field)}
          </div>
        ))}
    </div>
  );
}
