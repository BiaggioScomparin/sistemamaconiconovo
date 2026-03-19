import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useEvents } from '@/hooks/useEvents';
import { cn } from '@/lib/utils';

export default function MemberCalendar() {
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: events, isLoading: eventsLoading } = useEvents(profile?.lodge_id || undefined);

  const isLoading = authLoading || profileLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDayOfWeek = monthStart.getDay();
  const emptyDays = Array(startDayOfWeek).fill(null);

  const getEventsForDay = (date: Date) => {
    return events?.filter((event) => isSameDay(new Date(event.event_date + 'T12:00:00'), date)) || [];
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const today = new Date();

  const selectedDateEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  const upcomingEvents = events
    ?.filter((event) => new Date(event.event_date + 'T12:00:00') >= today)
    .sort((a, b) => new Date(a.event_date + 'T12:00:00').getTime() - new Date(b.event_date + 'T12:00:00').getTime())
    .slice(0, 5) || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display text-foreground">Calendário</h1>
          <p className="text-muted-foreground">Eventos e atividades da loja</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <CardTitle className="text-xl capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-pulse text-muted-foreground">Carregando...</div>
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {weekDays.map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                  
                  {emptyDays.map((_, index) => (
                    <div key={`empty-${index}`} className="aspect-square" />
                  ))}
                  
                  {monthDays.map((day) => {
                    const dayEvents = getEventsForDay(day);
                    const isToday = isSameDay(day, today);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={cn(
                          'aspect-square p-1 rounded-lg border transition-colors relative',
                          isToday && 'border-primary',
                          isSelected && 'bg-primary/10 border-primary',
                          !isToday && !isSelected && 'border-transparent hover:bg-muted',
                          !isSameMonth(day, currentMonth) && 'opacity-50'
                        )}
                      >
                        <span className={cn(
                          'text-sm',
                          isToday && 'font-bold text-primary'
                        )}>
                          {format(day, 'd')}
                        </span>
                        {dayEvents.length > 0 && (
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                            {dayEvents.slice(0, 3).map((_, i) => (
                              <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary" />
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Selected Date Events */}
            {selectedDate && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDateEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum evento nesta data</p>
                  ) : (
                    <div className="space-y-4">
                      {selectedDateEvents.map((event) => (
                        <div key={event.id} className="p-4 bg-muted rounded-lg space-y-2">
                          <h4 className="font-semibold">{event.title}</h4>
                          {event.event_time && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              {event.event_time.slice(0, 5)}
                            </div>
                          )}
                          {event.lodge && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              {event.lodge.name}
                            </div>
                          )}
                          {event.description && (
                            <p className="text-sm text-muted-foreground pt-1">
                              {event.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Upcoming Events */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Próximos Eventos</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum evento agendado</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => setSelectedDate(new Date(event.event_date + 'T12:00:00'))}
                      >
                        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary shrink-0">
                          <span className="text-lg font-bold leading-none">
                            {format(new Date(event.event_date + 'T00:00:00'), 'd')}
                          </span>
                          <span className="text-xs uppercase">
                            {format(new Date(event.event_date + 'T00:00:00'), 'MMM', { locale: ptBR })}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{event.title}</h4>
                          {event.event_time && (
                            <p className="text-sm text-muted-foreground">
                              {event.event_time.slice(0, 5)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
