import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any; user?: User | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Set user's preferred language if available
      if (session?.user?.user_metadata?.preferred_language) {
        import('@/i18n').then((i18nModule) => {
          i18nModule.default.changeLanguage(session.user.user_metadata.preferred_language);
        });
      }
      
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state change - Session:', session);
      console.log('Auth state change - User:', session?.user);
      setSession(session);
      setUser(session?.user ?? null);
      
      // Set user's preferred language if available
      if (session?.user?.user_metadata?.preferred_language) {
        import('@/i18n').then((i18nModule) => {
          i18nModule.default.changeLanguage(session.user.user_metadata.preferred_language);
        });
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting sign in with supabase client:', typeof supabase);
      console.log('Supabase auth object:', supabase.auth);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      console.log('Sign in result:', { error });
      return { error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { 
        error: { 
          message: 'Bağlantı hatası. Lütfen tekrar deneyin.' 
        } 
      };
    }
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      console.log('Attempting sign up with supabase client:', typeof supabase);
      console.log('Supabase auth object:', supabase.auth);
      const redirectUrl = `${window.location.origin}/`;
      console.log('Redirect URL:', redirectUrl);
      console.log('User metadata:', metadata);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: metadata || {}
        }
      });
      console.log('Sign up result:', { error, user: data?.user });
      return { error, user: data?.user };
    } catch (error) {
      console.error('Sign up error:', error);
      return { 
        error: { 
          message: 'Bağlantı hatası. Lütfen tekrar deneyin.' 
        },
        user: null
      };
    }
  };

  const signOut = async () => {
    try {
      console.log('Attempting sign out...');
      
      // Clear local state first
      setUser(null);
      setSession(null);
      
      // Then attempt to sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.log('Sign out error (but continuing):', error);
      } else {
        console.log('Sign out successful');
      }
      
      // Clear any local storage items related to auth
      localStorage.removeItem('sb-wnedqmxejgynelhtbpmw-auth-token');
      
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if there's an error, clear local state
      setUser(null);
      setSession(null);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      console.log('Attempting password reset for:', email);
      
      // First check if user exists
      const { data: checkResult, error: checkError } = await supabase.functions.invoke('check-user-exists', {
        body: { email }
      });

      console.log('User check result:', checkResult);

      if (checkError) {
        console.error('Error checking user existence:', checkError);
        return { 
          error: { 
            message: 'Bağlantı hatası. Lütfen tekrar deneyin.' 
          } 
        };
      }

      // If user doesn't exist, return specific error
      if (!checkResult?.exists) {
        return { 
          error: { 
            message: 'EMAIL_NOT_REGISTERED' 
          } 
        };
      }

      // User exists, proceed with password reset
      const redirectUrl = `${window.location.origin}/password-reset`;
      console.log('Password reset redirect URL:', redirectUrl);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      
      console.log('Password reset response:', { error });
      
      console.log('Password reset result:', { error });
      return { error };
    } catch (error) {
      console.error('Password reset error:', error);
      return { 
        error: { 
          message: 'Bağlantı hatası. Lütfen tekrar deneyin.' 
        } 
      };
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
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