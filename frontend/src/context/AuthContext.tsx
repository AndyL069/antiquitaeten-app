// frontend/src/context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { User, AuthProvidersResponse, LoginCredentials, RegisterData } from '../types';
import api from '../services/api';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  authError: string | null;
  providers: AuthProvidersResponse;
  login: (emailOrData: string | LoginCredentials, password?: string) => Promise<User>;
  register: (
    emailOrData: string | RegisterData,
    nameOrPassword?: string,
    password?: string
  ) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  clearAuthError: () => void;
  setAuthError: (error: string | null) => void;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [providers, setProviders] = useState<AuthProvidersResponse>({
    authentik: false,
  });

  // On mount: check URL for OAuth params and fetch current session & providers
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const authErrorParam = params.get('auth_error') || params.get('error');
      const authSuccessParam = params.get('auth_success');

      if (authErrorParam) {
        const errorMap: Record<string, string> = {
          invalid_state: 'Sicherheitsprüfung fehlgeschlagen (ungültiger OAuth-State).',
          missing_code: 'Kein Autorisierungscode von Authentik empfangen.',
          no_email_returned: 'Authentik hat keine E-Mail-Adresse übermittelt.',
          authentik_exchange_failed: 'Token-Austausch mit Authentik fehlgeschlagen.',
        };
        setAuthError(errorMap[authErrorParam] || decodeURIComponent(authErrorParam));
      }

      // Clean OAuth and auth state query parameters from URL
      if (authErrorParam || authSuccessParam) {
        params.delete('auth_error');
        params.delete('error');
        params.delete('auth_success');
        const search = params.toString() ? `?${params.toString()}` : '';
        const cleanUrl = `${window.location.pathname}${search}${window.location.hash}`;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }

    let isMounted = true;

    async function initializeAuth() {
      try {
        const [userRes, providersRes] = await Promise.allSettled([
          api.getMe(),
          api.getAuthProviders(),
        ]);

        if (isMounted) {
          if (userRes.status === 'fulfilled') {
            setUser(userRes.value);
          } else {
            setUser(null);
          }

          if (providersRes.status === 'fulfilled') {
            setProviders(providersRes.value);
          }
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(
    async (emailOrData: string | LoginCredentials, password?: string): Promise<User> => {
      setLoading(true);
      setAuthError(null);
      try {
        const loggedUser = await api.login(emailOrData, password);
        setUser(loggedUser);
        return loggedUser;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen';
        setAuthError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const register = useCallback(
    async (
      emailOrData: string | RegisterData,
      nameOrPassword?: string,
      password?: string
    ): Promise<User> => {
      setLoading(true);
      setAuthError(null);
      try {
        const registeredUser = await api.register(emailOrData, nameOrPassword, password);
        setUser(registeredUser);
        return registeredUser;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Registrierung fehlgeschlagen';
        setAuthError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setAuthError(null);
      setLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const freshUser = await api.getMe();
      setUser(freshUser);
      return freshUser;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      authError,
      providers,
      login,
      register,
      logout,
      refreshUser,
      clearAuthError,
      setAuthError,
      isAdmin: user?.role === 'ADMIN',
      isAuthenticated: !!user,
    }),
    [user, loading, authError, providers, login, register, logout, refreshUser, clearAuthError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
