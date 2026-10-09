import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Mail, Lock, User, ArrowRight, ShieldCheck, Phone, FileText, Calendar, MapPin, Briefcase } from 'lucide-react';
import { trackMetaEvent } from '@/lib/metaPixel';

const formatCPF = (value: string): string => {
  const clean = value.replace(/\D/g, '').slice(0, 11);
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
};

const formatPhone = (value: string): string => {
  const clean = value.replace(/\D/g, '').slice(0, 11);
  if (clean.length <= 2) return clean;
  if (clean.length <= 7) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
};

export default function Register() {
  const { user, loading, signUp } = useAuth();
  
  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Sindicância Candidate Profile fields
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cellPhone, setCellPhone] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [identityIssuer, setIdentityIssuer] = useState('SSP');
  const [state, setState] = useState('SP');
  const [city, setCity] = useState('');
  const [profession, setProfession] = useState('');
  const [lgpdConsent, setLgpdConsent] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-foreground">Carregando...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/proposta" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error('Informe o Nome Completo');
      return;
    }

    if (!cpf || cpf.replace(/\D/g, '').length !== 11) {
      toast.error('Informe um CPF válido');
      return;
    }

    if (!birthDate) {
      toast.error('Informe a Data de Nascimento');
      return;
    }

    if (!cellPhone.trim()) {
      toast.error('Informe o Telefone / WhatsApp');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (!lgpdConsent) {
      toast.error('Você precisa autorizar a consulta de antecedentes públicos para prosseguir.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create auth user
      const { error: signUpError } = await signUp(email, password);
      
      if (signUpError) {
        toast.error(signUpError.message);
        setIsSubmitting(false);
        return;
      }

      // 2. Get the logged in user reference
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData?.user;

      if (currentUser) {
        const payload = {
          user_id: currentUser.id,
          full_name: fullName,
          email: email,
          cpf: cpf,
          birth_date: birthDate,
          cell_phone: cellPhone,
          identity_number: identityNumber,
          identity_issuer: identityIssuer || 'SSP',
          state: state || 'SP',
          city: city,
          profession: profession,
          status: 'sindicancia',
          agrees_investigation_fee: true,
          proposal_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(payload as any, { onConflict: 'user_id' });

        if (profileError) {
          console.error('Erro ao atualizar perfil na inscrição:', profileError);
        }
      }

      // 3. Trigger Meta (Facebook) Conversion Events
      trackMetaEvent('CompleteRegistration', { content_name: 'Admissão Maçônica - Sindicância' });
      trackMetaEvent('Lead', { content_name: 'Candidato GOIB' });

      toast.success('Cadastro e pré-proposta enviados com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao criar conta: ' + (error.message || 'Erro inesperado'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl space-y-6">
        {/* Logo/Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-2 shadow-lg">
            <span className="font-display text-3xl text-secondary">∴</span>
          </div>
          <h1 className="text-3xl font-display text-foreground">Cadastro de Candidato</h1>
          <p className="text-muted-foreground font-body max-w-md mx-auto text-sm">
            Grande Oriente Independente do Brasil (GOIB) - Admissão Maçônica & Sindicância
          </p>
        </div>

        {/* Step Info Banner */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs sm:text-sm">
          <ShieldCheck className="h-6 w-6 shrink-0 text-amber-500" />
          <div>
            <p className="font-semibold">Pré-Cadastro para Sindicância</p>
            <p className="text-muted-foreground text-xs">
              Preencha seus dados completos para criar a conta e enviar sua pré-proposta para análise da Comissão de Sindicância.
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="card-elegant p-6 sm:p-8 border border-border">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Credenciais de Acesso */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-2 border-b border-border pb-2">
                <Lock className="h-4 w-4" /> Credenciais de Acesso
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email" className="text-xs font-semibold">E-mail *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-semibold">Senha *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold">Confirmar Senha *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Dados Pessoais para Sindicância */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-2 border-b border-border pb-2">
                <User className="h-4 w-4" /> Dados Pessoais do Candidato (Sindicância)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="fullName" className="text-xs font-semibold">Nome Completo *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Seu nome completo"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf" className="text-xs font-semibold">CPF *</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="cpf"
                      value={cpf}
                      onChange={(e) => setCpf(formatCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthDate" className="text-xs font-semibold">Data de Nascimento *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="birthDate"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cellPhone" className="text-xs font-semibold">Telefone / WhatsApp *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="cellPhone"
                      value={cellPhone}
                      onChange={(e) => setCellPhone(formatPhone(e.target.value))}
                      placeholder="(11) 99999-9999"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rg" className="text-xs font-semibold">RG e Órgão Emissor</Label>
                  <div className="flex gap-2">
                    <Input
                      id="rg"
                      placeholder="00.000.000-0"
                      value={identityNumber}
                      onChange={(e) => setIdentityNumber(e.target.value)}
                    />
                    <Input
                      placeholder="SSP"
                      className="w-24"
                      value={identityIssuer}
                      onChange={(e) => setIdentityIssuer(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state" className="text-xs font-semibold">Estado (UF)</Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger id="state">
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {['SP', 'RJ', 'MG', 'PR', 'SC', 'RS', 'BA', 'DF', 'GO', 'PE', 'CE', 'PA', 'ES', 'MT', 'MS'].map(uf => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city" className="text-xs font-semibold">Cidade Residencial</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="city"
                      placeholder="Sua cidade"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="profession" className="text-xs font-semibold">Profissão / Ocupação Principal</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="profession"
                      placeholder="Ex: Engenheiro Civil / Administrador"
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* LGPD Box */}
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="lgpd"
                  checked={lgpdConsent}
                  onCheckedChange={checked => setLgpdConsent(!!checked)}
                  className="mt-1 border-amber-500 text-amber-500 focus:ring-amber-500"
                />
                <Label htmlFor="lgpd" className="text-xs leading-relaxed text-foreground/90 cursor-pointer">
                  Autorizo o Grande Oriente Independente do Brasil (GOIB) e a Comissão de Sindicância a realizarem a verificação de certidões públicas de antecedentes para fins de admissão maçônica, nos termos da Lei Geral de Proteção de Dados (LGPD).
                </Label>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full py-6 text-base font-semibold shadow-md"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                'Enviando Cadastro e Pré-Proposta...'
              ) : (
                <>
                  Concluir Cadastro & Enviar para Sindicância
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
