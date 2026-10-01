// frontend/src/components/AuthModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, User as UserIcon, Shield, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, authError, clearAuthError, providers } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      clearAuthError();
      setLocalError(null);
      setPassword('');
      setConfirmPassword('');
    }
  }, [isOpen, mode, clearAuthError]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!email || !password) {
      setLocalError('Bitte E-Mail-Adresse und Passwort eingeben.');
      return;
    }

    if (mode === 'register') {
      if (password.length < 6) {
        setLocalError('Das Passwort muss mindestens 6 Zeichen lang sein.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Die Passwörter stimmen nicht überein.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({ email, password, name: name.trim() || undefined });
      }
      onClose();
    } catch {
      // Handled by authError in AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthentikLogin = () => {
    const redirectUrl = window.location.pathname + window.location.search;
    window.location.href = `/api/auth/authentik/login?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const displayError = localError || authError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-amber-700 to-amber-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-white/10 rounded-lg">
              <Lock className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {mode === 'login' ? 'Willkommen zurück' : 'Konto erstellen'}
              </h2>
              <p className="text-xs text-amber-200/80">Antiquitäten & Sammlungsstücke</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-stone-200 bg-stone-50">
          <button
            type="button"
            className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
              mode === 'login'
                ? 'text-amber-800 border-b-2 border-amber-800 bg-white'
                : 'text-stone-500 hover:text-stone-800'
            }`}
            onClick={() => setMode('login')}
          >
            Anmelden
          </button>
          <button
            type="button"
            className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
              mode === 'register'
                ? 'text-amber-800 border-b-2 border-amber-800 bg-white'
                : 'text-stone-500 hover:text-stone-800'
            }`}
            onClick={() => setMode('register')}
          >
            Registrieren
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Authentik SSO Button */}
          {providers.authentik && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleAuthentikLogin}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl shadow-sm transition-all duration-150 transform active:scale-[0.98]"
              >
                <Shield className="w-4 h-4 text-orange-200" />
                <span>Mit Authentik anmelden (SSO)</span>
              </button>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-stone-200 w-full" />
                <span className="bg-white px-3 text-xs text-stone-400 uppercase tracking-wider font-medium">
                  oder mit E-Mail
                </span>
                <div className="border-t border-stone-200 w-full" />
              </div>
            </div>
          )}

          {/* Error Message */}
          {displayError && (
            <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-shake">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
              <div className="flex-1 font-medium">{displayError}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Name (optional)
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Max Mustermann"
                    className="w-full pl-10 pr-3 py-2 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600 text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                E-Mail-Adresse
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ihre.email@example.de"
                  className="w-full pl-10 pr-3 py-2 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Passwort
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600 text-sm"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Passwort bestätigen
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3 py-2 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600 text-sm"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center space-x-2 py-2.5 px-4 bg-amber-800 hover:bg-amber-900 disabled:bg-amber-400 text-white font-semibold rounded-xl shadow transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Wird verarbeitet...</span>
                </>
              ) : (
                <span>{mode === 'login' ? 'Anmelden' : 'Registrieren'}</span>
              )}
            </button>
          </form>

          {/* Toggle mode helper */}
          <div className="text-center text-xs text-stone-500 pt-2">
            {mode === 'login' ? (
              <p>
                Noch kein Konto?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-amber-800 font-semibold hover:underline"
                >
                  Jetzt registrieren
                </button>
              </p>
            ) : (
              <p>
                Bereits registriert?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-amber-800 font-semibold hover:underline"
                >
                  Hier anmelden
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
