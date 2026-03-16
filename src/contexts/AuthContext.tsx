
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '../lib/supabase/client';
import { getPublicSiteUrl } from '../lib/supabase/config';

function mapAuthSetupError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Authentication is unavailable right now.';
  const lower = message.toLowerCase();

  if (
    lower.includes('next_public_supabase_url') ||
    lower.includes('next_public_supabase_anon_key') ||
    lower.includes('next_public_supabase_publishable_default_key')
  ) {
    return 'Authentication is unavailable because the Supabase environment variables are missing or invalid.';
  }

  return message;
}

const AuthContext = createContext<any | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);

  useEffect(() => {
    let isMounted = true;

    try {
      const client = createClient();
      if (isMounted) {
        setSupabase(client);
        setAuthError(null);
      }

      client.auth.getSession()
        .then(({ data: { session } }) => {
          if (!isMounted) return;
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        })
        .catch((error) => {
          if (!isMounted) return;
          setAuthError(mapAuthSetupError(error));
          setLoading(false);
        });

      const {
        data: { subscription }
      } = client.auth.onAuthStateChange((_event, nextSession) => {
        if (!isMounted) return;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setLoading(false);
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    } catch (error) {
      if (isMounted) {
        setSupabase(null);
        setSession(null);
        setUser(null);
        setAuthError(mapAuthSetupError(error));
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const requireSupabase = () => {
    if (supabase) return supabase;
    throw new Error(authError ?? 'Authentication is unavailable right now.');
  };

  // Email/Password Sign Up
  const signUp = async (email: string, password: string, metadata = {}) => {
    const client = requireSupabase();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata?.fullName || '',
          avatar_url: metadata?.avatarUrl || ''
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) throw error;
    return data;
  };

  // Email/Password Sign In
  const signIn = async (email: string, password: string) => {
    const client = requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  };

  // Sign Out
  const signOut = async () => {
    const client = requireSupabase();
    const { error } = await client.auth.signOut();
    if (error) throw error;
  };

  // Google OAuth Sign In
  const signInWithGoogle = async () => {
    const client = requireSupabase();
    const redirectOrigin =
      typeof window !== 'undefined' ? window.location.origin : getPublicSiteUrl();

    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: redirectOrigin
        ? {
            redirectTo: `${redirectOrigin}/auth/callback`,
          }
        : undefined,
    });

    if (error) throw error;
    return data;
  };

  // Get Current User
  const getCurrentUser = async () => {
    const client = requireSupabase();
    const { data: { user }, error } = await client.auth.getUser();
    if (error) throw error;
    return user;
  };

  // Check if Email is Verified
  const isEmailVerified = () => {
    return user?.email_confirmed_at !== null;
  };

  // Get User Profile from Database
  const getUserProfile = async () => {
    if (!user) return null;
    const client = requireSupabase();
    const { data, error } = await client
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) throw error;
    return data;
  };

  const value = {
    user,
    session,
    loading,
    authError,
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
    getCurrentUser,
    isEmailVerified,
    getUserProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
