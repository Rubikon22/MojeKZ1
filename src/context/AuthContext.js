import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../config/supabase';

// Create context with better default values and type safety
const AuthContext = createContext({
  user: null,
  loading: true,
  signUp: async () => ({ data: null, error: new Error('AuthContext not initialized') }),
  signIn: async () => ({ data: null, error: new Error('AuthContext not initialized') }),
  signOut: async () => ({ error: new Error('AuthContext not initialized') }),
});

// Set display name for debugging
AuthContext.displayName = 'AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Get current session
    const initializeAuth = async () => {
      try {
        const { data: { session } = {}, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }
        
        if (mounted) {
          setUser(session?.user ?? null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen to auth state changes
    const { data: { subscription } = {} } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (mounted) {
            setUser(session?.user ?? null);
            setLoading(false);
          }
        } catch (error) {
          console.error('Error in auth state change:', error);
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Memoize auth functions to prevent unnecessary re-renders
  const signUp = useCallback(async (email, password, userData = {}) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { data: null, error: error.message || 'Blad rejestracji' };
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = useCallback(async (email, password) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error: error.message || 'Blad logowania' };
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error: error.message || 'Blad wylogowania' };
    } finally {
      setLoading(false);
    }
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    loading,
    signUp,
    signIn,
    signOut,
  }), [user, loading, signUp, signIn, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };