import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/lib/supabase-types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole | null;
  isAdmin: boolean;
  signIn: (identifier: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);

  const fetchUserRole = async (userId: string): Promise<AppRole | null> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      // Check if user has admin role (prioritize admin over member)
      const roles = data?.map(r => r.role) || [];
      if (roles.includes('admin')) {
        return 'admin';
      }
      if (roles.includes('member')) {
        return 'member';
      }

      return null;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;
    let roleTimeout: ReturnType<typeof setTimeout> | null = null;
    // Monotonic token to discard results from stale/out-of-order role fetches.
    let latestRequestId = 0;

    const applyRole = (requestId: number, userRole: AppRole | null) => {
      // Ignore if unmounted or superseded by a newer auth event.
      if (!isMounted || requestId !== latestRequestId) return;
      setRole(userRole);
      setLoading(false);
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const requestId = ++latestRequestId;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Defer the role fetch to avoid potential Supabase deadlocks inside the callback.
          if (roleTimeout) clearTimeout(roleTimeout);
          roleTimeout = setTimeout(() => {
            fetchUserRole(session.user.id).then((userRole) => applyRole(requestId, userRole));
          }, 0);
        } else {
          applyRole(requestId, null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const requestId = ++latestRequestId;
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserRole(session.user.id).then((userRole) => applyRole(requestId, userRole));
      } else {
        applyRole(requestId, null);
      }
    });

    return () => {
      isMounted = false;
      if (roleTimeout) clearTimeout(roleTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (identifier: string, password: string) => {
    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      return { error: new Error('Informe seu e-mail, CPF ou CIM.') };
    }

    let emailToUse = cleanIdentifier;

    // Se não for e-mail (não possui @), tenta resolver via CPF ou CIM
    if (!cleanIdentifier.includes('@')) {
      try {
        const { data: resolvedEmail, error: rpcError } = await supabase.rpc('get_login_email', {
          _identifier: cleanIdentifier,
        });

        if (rpcError) {
          console.error('Erro na RPC get_login_email:', rpcError);
          return { error: new Error('Erro ao localizar o cadastro. Verifique os dados digitados.') };
        }

        if (!resolvedEmail) {
          return { error: new Error('Nenhum cadastro encontrado com este CPF ou CIM.') };
        }

        emailToUse = resolvedEmail;
      } catch (err: any) {
        console.error('Erro ao resolver identificador de login:', err);
        return { error: new Error('Erro ao verificar CPF ou CIM. Tente novamente.') };
      }
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    // If user created, automatically sign in seamlessly
    if (data?.user) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!signInError) return { error: null };
    }

    // Fallback only for mailer/SMTP errors (e.g. confirmation email could not be sent).
    // We intentionally do NOT swallow "already registered" style errors.
    const msg = error?.message?.toLowerCase() ?? '';
    const isMailerError =
      msg.includes('confirmation email') ||
      msg.includes('sending') ||
      msg.includes('smtp') ||
      msg.includes('mailer');
    if (error && isMailerError) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!signInError) return { error: null };
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    role,
    isAdmin: role === 'admin',
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
