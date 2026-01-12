import { Link, Navigate } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-foreground">Carregando...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary mb-4">
            <span className="font-display text-4xl text-secondary">∴</span>
          </div>
          <h1 className="text-3xl font-display text-foreground">Sistema Maçônico</h1>
          <p className="text-muted-foreground font-body mt-2">
            Acesse sua conta para continuar
          </p>
        </div>

        {/* Form Card */}
        <div className="card-elegant p-8">
          <LoginForm />
        </div>

        {/* Links */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Não tem uma conta?{' '}
            <Link to="/signup" className="text-secondary hover:underline font-medium">
              Criar conta
            </Link>
          </p>
          <p className="text-sm text-muted-foreground">
            Quer se cadastrar como membro?{' '}
            <Link to="/register" className="text-secondary hover:underline font-medium">
              Pré-cadastro
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
