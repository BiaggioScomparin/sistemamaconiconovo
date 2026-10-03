import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProfile } from '@/hooks/useProfile';
import { useLodgeMembers } from '@/hooks/useLodgeMembers';
import { useEvents } from '@/hooks/useEvents';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { Building2, Users, Crown, User, Cake, Calendar, Clock, Award, CreditCard, DollarSign, BookOpen, QrCode, ArrowRight, CheckCircle2, Shield } from 'lucide-react';
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
    .filter((event) => new Date(event.event_date + 'T12:00:00') >= today)
    .sort((a, b) => new Date(a.event_date + 'T12:00:00').getTime() - new Date(b.event_date + 'T12:00:00').getTime())
    .slice(0, 5);

  const nextSession = upcomingEvents[0];

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

  const validationUrl = profile?.id ? `${window.location.origin}/validar/${profile.id}` : window.location.origin;

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-accent/30 to-background p-6 rounded-2xl border border-primary/20 shadow-sm">
          <div>
            <h1 className="text-3xl font-display text-foreground">
              Área do Membro
            </h1>
            <p className="text-muted-foreground font-body mt-1">
              Saudações, <span className="font-semibold text-foreground">{profile?.full_name || user.email}</span> ({profile?.degree || 'Aprendiz'})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/member/card">
              <Button variant="outline" className="gap-2 border-primary/30 hover:bg-primary/10">
                <CreditCard className="h-4 w-4 text-primary" />
                Minha Carteirinha
              </Button>
            </Link>
            <Link to="/member/attendance">
              <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                <Calendar className="h-4 w-4" />
                Presenças
              </Button>
            </Link>
          </div>
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

        {/* HIGHLIGHT: NEXT SESSION BANNER */}
        {nextSession && (
          <Card className="card-elegant border-primary/40 bg-card overflow-hidden relative shadow-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2 flex-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold">
                    <Clock size={14} /> Próxima Sessão Agendada
                  </div>
                  <h2 className="text-2xl font-display text-foreground">
                    {nextSession.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pt-1">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <Calendar className="h-4 w-4 text-primary" />
                      {format(new Date(nextSession.event_date + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </span>
                    {nextSession.start_time && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {nextSession.start_time.substring(0, 5)} h
                      </span>
                    )}
                    {lodge?.name && (
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {lodge.name}
                      </span>
                    )}
                  </div>
                </div>
                <Link to="/member/attendance">
                  <Button size="lg" className="w-full md:w-auto gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold shadow-md">
                    <CheckCircle2 className="h-5 w-5" />
                    Confirmar Presença
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TOP WIDGETS: LODGE INFO & DIGITAL CARD PREVIEW */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lodge Info */}
          <Card className="card-elegant lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-display text-foreground">
                  Sua Loja Maçônica
                </CardTitle>
                <CardDescription>Informações da sua oficina</CardDescription>
              </div>
              <Building2 className="h-6 w-6 text-primary" />
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {lodge ? (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl bg-accent/30 border border-border gap-4">
                  <div>
                    <h3 className="text-2xl font-display text-foreground">
                      {lodge.name}
                    </h3>
                    {(lodge.city || lodge.state) && (
                      <p className="text-muted-foreground text-sm mt-1">
                        Oriente de {[lodge.city, lodge.state].filter(Boolean).join(' - ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center px-4 py-2 rounded-lg bg-background border border-border">
                      <span className="text-2xl font-display text-foreground">{membersLoading ? '...' : activeMembers.length}</span>
                      <p className="text-xs text-muted-foreground">Irmãos Ativos</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Nenhuma loja vinculada</p>
              )}

              {/* Quick Member Shortcuts Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <Link to="/member/payments">
                  <div className="p-3 rounded-xl border border-border bg-card hover:bg-accent/40 transition-colors flex flex-col items-center text-center gap-1.5 cursor-pointer">
                    <DollarSign className="h-5 w-5 text-emerald-500" />
                    <span className="text-xs font-medium text-foreground">Mensalidades</span>
                  </div>
                </Link>
                <Link to="/member/library">
                  <div className="p-3 rounded-xl border border-border bg-card hover:bg-accent/40 transition-colors flex flex-col items-center text-center gap-1.5 cursor-pointer">
                    <BookOpen className="h-5 w-5 text-blue-500" />
                    <span className="text-xs font-medium text-foreground">Biblioteca</span>
                  </div>
                </Link>
                <Link to="/member/calendar">
                  <div className="p-3 rounded-xl border border-border bg-card hover:bg-accent/40 transition-colors flex flex-col items-center text-center gap-1.5 cursor-pointer">
                    <Calendar className="h-5 w-5 text-rose-500" />
                    <span className="text-xs font-medium text-foreground">Calendário</span>
                  </div>
                </Link>
                <Link to="/member/attendance">
                  <div className="p-3 rounded-xl border border-border bg-card hover:bg-accent/40 transition-colors flex flex-col items-center text-center gap-1.5 cursor-pointer">
                    <Shield className="h-5 w-5 text-amber-500" />
                    <span className="text-xs font-medium text-foreground">Frequência</span>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Quick QR Digital Card Preview Widget */}
          <Card className="card-elegant border-primary/30 flex flex-col justify-between">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-display text-foreground flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-primary" />
                  Carteirinha & QR
                </CardTitle>
                <Link to="/member/card" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Ver Completa <ArrowRight size={12} />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-4 space-y-3">
              <div className="p-3 bg-white rounded-xl shadow-md border border-gray-200">
                <QRCodeSVG value={validationUrl} size={110} level="M" />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-foreground">{profile?.full_name}</p>
                <p className="text-[11px] text-muted-foreground">{profile?.degree || 'Aprendiz'} • CIM: {profile?.cim_number || 'N/A'}</p>
              </div>
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
                          {format(new Date(event.event_date + 'T12:00:00'), 'd')}
                        </span>
                        <span className="text-xs uppercase">
                          {format(new Date(event.event_date + 'T12:00:00'), 'MMM', { locale: ptBR })}
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
