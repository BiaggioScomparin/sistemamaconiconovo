import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react';

interface ProposalAuthGateProps {
  children: React.ReactNode;
}

export default function ProposalAuthGate({ children }: ProposalAuthGateProps) {
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <>{children}</>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          toast({
            title: 'Erro',
            description: 'As senhas não conferem',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          toast({
            title: 'Erro',
            description: 'A senha deve ter pelo menos 6 caracteres',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password);
        if (error) {
          toast({
            title: 'Erro ao cadastrar',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Cadastro realizado!',
            description: 'Você já pode preencher sua proposta.',
          });
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: 'Erro ao entrar',
            description: 'E-mail ou senha incorretos',
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mx-auto mb-4">
            <span className="text-3xl text-primary-foreground">∴</span>
          </div>
          <CardTitle className="text-xl">
            {mode === 'register' ? 'Cadastrar Acesso' : 'Entrar'}
          </CardTitle>
          <CardDescription>
            {mode === 'register' 
              ? 'Crie um acesso para preencher sua proposta de filiação'
              : 'Entre com seu e-mail e senha para continuar'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : mode === 'register' ? (
                <UserPlus className="h-4 w-4 mr-2" />
              ) : (
                <LogIn className="h-4 w-4 mr-2" />
              )}
              {loading 
                ? 'Aguarde...' 
                : mode === 'register' 
                  ? 'Cadastrar e Continuar' 
                  : 'Entrar'
              }
            </Button>
          </form>

          <div className="mt-6 text-center">
            {mode === 'register' ? (
              <p className="text-sm text-muted-foreground">
                Já possui cadastro?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-primary hover:underline font-medium"
                >
                  Entrar
                </button>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Não possui cadastro?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-primary hover:underline font-medium"
                >
                  Cadastrar
                </button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
