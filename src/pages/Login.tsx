import { Navigate } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/contexts/AuthContext';
import logoGoib from '@/assets/logo-goib.png';

export default function Login() {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-foreground">Carregando...</div>
      </div>
    );
  }

  if (user) {
    // Admins go to dashboard, members go to inicial
    const redirectPath = isAdmin ? '/dashboard' : '/member/inicial';
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-slate-900 border border-amber-500/30 mb-3 shadow-xl">
            <img src={logoGoib} alt="G.O.I.B." className="h-20 w-20 object-contain" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground tracking-wide">G.O.I.B.</h1>
          <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
            Grande Oriente Independente do Brasil
          </p>
          <p className="text-xs text-muted-foreground font-body mt-2">
            Acesse sua conta para continuar no Sistema Maçônico
          </p>
        </div>

        {/* Form Card */}
        <div className="card-elegant p-8">
          <LoginForm />
        </div>

      </div>
    </div>
  );
}
