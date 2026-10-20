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

export const CACHED_USER_KEY = 'antiquitaeten_cached_user';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  authError: string | null;
  providers: AuthProvidersResponse;
  isOfflineSession: boolean;
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

function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHED_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.id) {
      return parsed as User;
    }
  } catch (err) {
    console.warn('Failed to parse cached user from localStorage:', err);
  }
  return null;
}

function cacheUser(user: User | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CACHED_USER_KEY);
    }
  } catch (err) {
    console.warn('Failed to update cached user in localStorage:', err);
  }
}

function clearCachedUser(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CACHED_USER_KEY);
  } catch (err) {
    console.warn('Failed to remove cached user from localStorage:', err);
  }
}

function isUnauthorizedError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === 'object' && error !== null) {
    if ('status' in error && (error as { status?: unknown }).status === 401) {
      return true;
    }
    if ('statusCode' in error && (error as { statusCode?: unknown }).statusCode === 401) {
      return true;
    }
  }
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  return (
    lower.includes('401') ||
    lower.includes('nicht authentifiziert') ||
    lower.includes('unauthorized') ||
    lower.includes('not authenticated')
  );
}

function isNetworkOrOfflineError(error: unknown): boolean {
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.onLine === 'boolean' &&
    !navigator.onLine
  ) {
    return true;
  }
  if (!error) return false;
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('networkerror') ||
    msg.includes('load failed') ||
    msg.includes('econnrefused') ||
    msg.includes('abort')
  );
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [providers, setProviders] = useState<AuthProvidersResponse>({
    authentik: false,
  });
  const [isOfflineSession, setIsOfflineSession] = useState<boolean>(false);

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
            setIsOfflineSession(false);
            cacheUser(userRes.value);
          } else {
            const error = userRes.reason;
            if (isUnauthorizedError(error)) {
              clearCachedUser();
              setUser(null);
              setIsOfflineSession(false);
            } else if (
              isNetworkOrOfflineError(error) ||
              (typeof navigator !== 'undefined' &&
                typeof navigator.onLine === 'boolean' &&
                !navigator.onLine)
            ) {
              const cached = getStoredUser();
              if (cached) {
                setUser(cached);
                setIsOfflineSession(true);
              } else {
                setUser(null);
                setIsOfflineSession(false);
              }
            } else {
              // Non-401 server failure / fallback: check cached user
              const cached = getStoredUser();
              if (cached) {
                setUser(cached);
                setIsOfflineSession(true);
              } else {
                setUser(null);
                setIsOfflineSession(false);
              }
            }
          }

          if (providersRes.status === 'fulfilled') {
            setProviders(providersRes.value);
          }
        }
      } catch (err) {
        if (isMounted) {
          if (isUnauthorizedError(err)) {
            clearCachedUser();
            setUser(null);
            setIsOfflineSession(false);
          } else {
            const cached = getStoredUser();
            if (cached) {
              setUser(cached);
              setIsOfflineSession(true);
            } else {
              setUser(null);
              setIsOfflineSession(false);
            }
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    // Silently re-validate session when browser comes back online
    const handleOnline = async () => {
      try {
        const freshUser = await api.getMe();
        if (isMounted) {
          setUser(freshUser);
          setIsOfflineSession(false);
          cacheUser(freshUser);
        }
      } catch (err) {
        if (isUnauthorizedError(err) && isMounted) {
          clearCachedUser();
          setUser(null);
          setIsOfflineSession(false);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
    }

    return () => {
      isMounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
      }
    };
  }, []);

  const login = useCallback(
    async (emailOrData: string | LoginCredentials, password?: string): Promise<User> => {
      setLoading(true);
      setAuthError(null);
      try {
        const loggedUser = await api.login(emailOrData, password);
        setUser(loggedUser);
        setIsOfflineSession(false);
        cacheUser(loggedUser);
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
        setIsOfflineSession(false);
        cacheUser(registeredUser);
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
      clearCachedUser();
      setUser(null);
      setIsOfflineSession(false);
      setAuthError(null);
      setLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const freshUser = await api.getMe();
      setUser(freshUser);
      setIsOfflineSession(false);
      cacheUser(freshUser);
      return freshUser;
    } catch (err) {
      if (isUnauthorizedError(err)) {
        clearCachedUser();
        setUser(null);
        setIsOfflineSession(false);
      }
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
      isOfflineSession,
      login,
      register,
      logout,
      refreshUser,
      clearAuthError,
      setAuthError,
      isAdmin: user?.role === 'ADMIN',
      isAuthenticated: !!user,
    }),
    [
      user,
      loading,
      authError,
      providers,
      isOfflineSession,
      login,
      register,
      logout,
      refreshUser,
      clearAuthError,
      setAuthError,
    ]
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
