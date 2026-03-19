import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useLodges } from '@/hooks/useLodges';
import { useCreateEvent, useUpdateEvent, Event } from '@/hooks/useEvents';
import { toast } from 'sonner';

const eventSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  event_date: z.date({ required_error: 'Data é obrigatória' }),
  event_time: z.string().optional(),
  lodge_id: z.string().optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event | null;
}

export function EventFormDialog({ open, onOpenChange, event }: EventFormDialogProps) {
  const { data: lodges } = useLodges();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      description: '',
      event_time: '',
      lodge_id: '',
    },
  });

  useEffect(() => {
    if (event) {
      form.reset({
        title: event.title,
        description: event.description || '',
        event_date: new Date(event.event_date + 'T12:00:00'),
        event_time: event.event_time?.slice(0, 5) || '',
        lodge_id: event.lodge_id || '__all__',
      });
    } else {
      form.reset({
        title: '',
        description: '',
        event_time: '',
        lodge_id: '__all__',
      });
    }
  }, [event, form, open]);

  const onSubmit = async (data: EventFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        title: data.title,
        description: data.description || null,
        event_date: format(data.event_date, 'yyyy-MM-dd'),
        event_time: data.event_time || null,
        lodge_id: data.lodge_id === '__all__' ? null : data.lodge_id || null,
      };

      if (event) {
        await updateEvent.mutateAsync({ id: event.id, ...payload });
        toast.success('Evento atualizado com sucesso!');
      } else {
        await createEvent.mutateAsync(payload);
        toast.success('Evento criado com sucesso!');
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Erro ao salvar evento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{event ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do evento" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descrição do evento..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="event_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? format(field.value, 'dd/MM/yyyy') : 'Selecione'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className={cn('p-3 pointer-events-auto')}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="event_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="lodge_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loja (opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || '__all__'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as lojas" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__all__">Todas as lojas</SelectItem>
                      {lodges?.map((lodge) => (
                        <SelectItem key={lodge.id} value={lodge.id}>
                          {lodge.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : event ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
