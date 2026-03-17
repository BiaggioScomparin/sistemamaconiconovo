import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProfile } from '@/hooks/useProfile';
import { useLodgeMembers } from '@/hooks/useLodgeMembers';
import { useEvents } from '@/hooks/useEvents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, Users, Crown, User, Cake, Calendar, Clock, Award } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const LODGE_POSITIONS = [
  { value: 'veneravel_mestre', label: 'Venerável Mestre' },
  { value: 'primeiro_vigilante', label: 'Primeiro Vigilante' },
  { value: 'segundo_vigilante', label: 'Segundo Vigilante' },
  { value: 'orador', label: 'Orador' },
  { value: 'secretario', label: 'Secretário' },
  { value: 'tesoureiro', label: 'Tesoureiro' },
  { value: 'mestre_cerimonias', label: 'Mestre de Cerimônias' },
  { value: 'primeiro_diacono', label: '1º Diácono' },
  { value: 'segundo_diacono', label: '2º Diácono' },
  { value: 'primeiro_experto', label: '1º Experto' },
  { value: 'segundo_experto', label: '2º Experto' },
  { value: 'cobridor_interno', label: 'Cobridor Interno' },
  { value: 'cobridor_externo', label: 'Cobridor Externo' },
  { value: 'porta_bandeira', label: 'Porta Bandeira' },
  { value: 'porta_estandarte', label: 'Porta Estandarte' },
  { value: 'porta_espada', label: 'Porta Espada' },
  { value: 'mestre_banquetes', label: 'Mestre de Banquetes' },
  { value: 'mestre_harmonia', label: 'Mestre de Harmonia' },
];

export default function Inicial() {
  const { user, loading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: lodgeMembers = [], isLoading: membersLoading } = useLodgeMembers(profile?.lodge_id || undefined);
  const { data: events = [], isLoading: eventsLoading } = useEvents(profile?.lodge_id || undefined);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const lodge = (profile as any)?.lodges;
  const activeMembers = lodgeMembers.filter(m => m.member_status === 'active');

  // Get current month birthdays
  const currentMonth = new Date().getMonth() + 1;
  const birthdaysThisMonth = lodgeMembers
    .filter(m => {
      if (!m.birth_date) return false;
      const birthMonth = new Date(m.birth_date + "T12:00:00").getMonth() + 1;
      return birthMonth === currentMonth;
    })
    .sort((a, b) => {
      const dayA = new Date(a.birth_date + "T12:00:00").getDate();
      const dayB = new Date(b.birth_date + "T12:00:00").getDate();
      return dayA - dayB;
    });

  // Get current month order anniversaries (initiation date)
  const orderAnniversariesThisMonth = lodgeMembers
    .filter(m => {
      if (!m.initiation_date) return false;
      const initiationMonth = new Date(m.initiation_date + "T12:00:00").getMonth() + 1;
      return initiationMonth === currentMonth;
    })
    .sort((a, b) => {
      const dayA = new Date(a.initiation_date! + "T12:00:00").getDate();
      const dayB = new Date(b.initiation_date! + "T12:00:00").getDate();
      return dayA - dayB;
    });

  // Group members by their lodge position - show only filled positions
  const membersByPosition = LODGE_POSITIONS.map(position => {
    const members = lodgeMembers.filter(m => m.lodge_position === position.value);
    return {
      ...position,
      members,
    };
  }).filter(p => p.members.length > 0);

  // Members without a position
  const membersWithoutPosition = lodgeMembers.filter(m => !m.lodge_position);

  // Upcoming events (next 5)
  const today = new Date();
  const upcomingEvents = events
    .filter((event) => new Date(event.event_date) >= today)
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
    .slice(0, 5);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const formatBirthday = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00");
    return format(date, "dd 'de' MMMM", { locale: ptBR });
  };

  const formatOrderAnniversary = (initiationDate: string) => {
    const initDate = new Date(initiationDate + "T12:00:00");
    const today = new Date();
    const years = today.getFullYear() - initDate.getFullYear();
    return {
      day: format(initDate, "dd 'de' MMMM", { locale: ptBR }),
      years,
    };
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display text-foreground">Inicial</h1>
          <p className="text-muted-foreground font-body mt-1">
            Olá, {profile?.full_name || user.email}
          </p>
        </div>

        {profile?.status === 'pending' && (
          <Card className="card-elegant border-amber-500">
            <CardContent className="pt-6">
              <p className="text-amber-600 font-body">
                Seu cadastro está aguardando aprovação de um administrador.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Lodge Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="card-elegant">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-body text-muted-foreground">
                Sua Loja
              </CardTitle>
              <Building2 className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              {lodge ? (
                <div>
                  <div className="text-2xl font-display text-foreground">
                    {lodge.name}
                  </div>
                  {(lodge.city || lodge.state) && (
                    <p className="text-muted-foreground text-sm mt-1">
                      {[lodge.city, lodge.state].filter(Boolean).join(' - ')}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Nenhuma loja vinculada</p>
              )}
            </CardContent>
          </Card>

          <Card className="card-elegant">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-body text-muted-foreground">
                Membros Ativos
              </CardTitle>
              <Users className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display text-foreground">
                {membersLoading ? '...' : activeMembers.length}
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                na sua loja
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Events */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display text-foreground flex items-center gap-2">
              <Calendar className="h-5 w-5 text-secondary" />
              Próximos Eventos
            </h2>
            <Link 
              to="/member/calendar" 
              className="text-sm text-primary hover:underline"
            >
              Ver calendário completo
            </Link>
          </div>

          {eventsLoading ? (
            <div className="animate-pulse text-muted-foreground">Carregando eventos...</div>
          ) : upcomingEvents.length === 0 ? (
            <Card className="card-elegant">
              <CardContent className="pt-6">
                <p className="text-muted-foreground">
                  Nenhum evento agendado.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingEvents.map(event => (
                <Card key={event.id} className="card-elegant hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-primary/10 text-primary shrink-0">
                        <span className="text-xl font-bold leading-none">
                          {format(new Date(event.event_date + 'T00:00:00'), 'd')}
                        </span>
                        <span className="text-xs uppercase">
                          {format(new Date(event.event_date + 'T00:00:00'), 'MMM', { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{event.title}</h3>
                        {event.event_time && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <Clock className="h-3.5 w-3.5" />
                            {event.event_time.slice(0, 5)}
                          </div>
                        )}
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Birthdays this month */}
        <div>
          <h2 className="text-xl font-display text-foreground mb-4 flex items-center gap-2">
            <Cake className="h-5 w-5 text-secondary" />
            Aniversariantes do Mês
          </h2>

          {membersLoading ? (
            <div className="animate-pulse text-muted-foreground">Carregando aniversariantes...</div>
          ) : birthdaysThisMonth.length === 0 ? (
            <Card className="card-elegant">
              <CardContent className="pt-6">
                <p className="text-muted-foreground">
                  Nenhum aniversariante neste mês.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="card-elegant">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {birthdaysThisMonth.map(member => (
                    <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/5">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.photo_url || undefined} />
                        <AvatarFallback className="bg-secondary/10 text-secondary text-xs">
                          {getInitials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="text-foreground text-sm font-body block">
                          {member.full_name}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {formatBirthday(member.birth_date)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order Anniversaries this month */}
        <div>
          <h2 className="text-xl font-display text-foreground mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-secondary" />
            Aniversário de Ordem
          </h2>

          {membersLoading ? (
            <div className="animate-pulse text-muted-foreground">Carregando aniversários de ordem...</div>
          ) : orderAnniversariesThisMonth.length === 0 ? (
            <Card className="card-elegant">
              <CardContent className="pt-6">
                <p className="text-muted-foreground">
                  Nenhum aniversário de ordem neste mês.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="card-elegant">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {orderAnniversariesThisMonth.map(member => {
                    const anniversary = formatOrderAnniversary(member.initiation_date!);
                    return (
                      <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.photo_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(member.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="text-foreground text-sm font-body block">
                            {member.full_name}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {anniversary.day} • {anniversary.years} {anniversary.years === 1 ? 'ano' : 'anos'} de ordem
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Lodge Positions */}
        <div>
          <h2 className="text-xl font-display text-foreground mb-4 flex items-center gap-2">
            <Crown className="h-5 w-5 text-secondary" />
            Cargos da Loja
          </h2>

          {membersLoading ? (
            <div className="animate-pulse text-muted-foreground">Carregando cargos...</div>
          ) : membersByPosition.length === 0 ? (
            <Card className="card-elegant">
              <CardContent className="pt-6">
                <p className="text-muted-foreground">
                  Nenhum cargo atribuído ainda.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {membersByPosition.map(position => (
                <Card key={position.value} className="card-elegant">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-display text-secondary">
                      {position.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {position.members.map(member => (
                      <div key={member.id} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.photo_url || undefined} />
                          <AvatarFallback className="bg-secondary/10 text-secondary text-xs">
                            {getInitials(member.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-foreground text-sm font-body">
                          {member.full_name}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Members without position */}
        {membersWithoutPosition.length > 0 && (
          <div>
            <h2 className="text-xl font-display text-foreground mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-secondary" />
              Demais Membros
            </h2>
            <Card className="card-elegant">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {membersWithoutPosition.map(member => (
                    <div key={member.id} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.photo_url || undefined} />
                        <AvatarFallback className="bg-secondary/10 text-secondary text-xs">
                          {getInitials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-foreground text-sm font-body">
                        {member.full_name}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
