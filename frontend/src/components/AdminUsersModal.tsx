// frontend/src/components/AdminUsersModal.tsx
import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Shield,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import type { User, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatDate } from '../utils/formatters';

export interface AdminUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminUsersModal: React.FC<AdminUsersModalProps> = ({ isOpen, onClose }) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Konnte Benutzer nicht laden');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setActionSuccess(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRoleToggle = async (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      alert('Sie können Ihre eigene Administrator-Rolle nicht entziehen.');
      return;
    }

    const newRole: UserRole = targetUser.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    setUpdatingId(targetUser.id);
    setError(null);
    setActionSuccess(null);

    try {
      await api.updateUserRole(targetUser.id, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
      );
      setActionSuccess(`Rolle für ${targetUser.email} erfolgreich zu ${newRole} geändert.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Aktualisieren der Rolle');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      alert('Sie können Ihr eigenes Konto nicht löschen.');
      return;
    }

    if (!window.confirm(`Benutzer ${targetUser.email} wirklich unwiderruflich löschen?`)) {
      return;
    }

    setUpdatingId(targetUser.id);
    setError(null);
    setActionSuccess(null);

    try {
      await api.deleteUser(targetUser.id);
      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      setActionSuccess(`Benutzer ${targetUser.email} gelöscht.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen des Benutzers');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-hidden">
      <div
        className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[calc(100dvh-1.5rem)] sm:h-auto sm:max-h-[90vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="p-2 bg-slate-800 text-slate-200 rounded-lg flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-base sm:text-lg font-bold tracking-tight truncate">Benutzerverwaltung</h2>
              <p className="text-xs text-slate-400 truncate">Rollen verwalten und Zugänge steuern (Admin)</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={fetchUsers}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Aktualisieren"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Banners */}
        {actionSuccess && (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-medium flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {error && (
          <div className="px-6 py-2.5 bg-red-50 border-b border-red-200 text-red-700 text-xs font-medium flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* User Table - Scrollable */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1 overscroll-contain">
          {loading && users.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-slate-600" />
              <p className="text-xs">Benutzerliste wird geladen...</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Benutzer</th>
                    <th className="py-3 px-4">Anbieter</th>
                    <th className="py-3 px-4">Rolle</th>
                    <th className="py-3 px-4">Registriert</th>
                    <th className="py-3 px-4 text-right">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    const isProcessing = updatingId === u.id;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>{u.name || u.email.split('@')[0]}</span>
                            {isSelf && (
                              <span className="text-[10px] bg-slate-900 text-white px-1.5 py-0.5 rounded font-bold">
                                Du
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                            {u.authProvider || 'lokal'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <button
                            type="button"
                            disabled={isSelf || isProcessing}
                            onClick={() => handleRoleToggle(u)}
                            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors ${
                              u.role === 'ADMIN'
                                ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                            } ${isSelf ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                            title={
                              isSelf
                                ? 'Eigene Rolle kann nicht geändert werden'
                                : `Klicken, um Rolle zu ${u.role === 'ADMIN' ? 'MEMBER' : 'ADMIN'} zu wechseln`
                            }
                          >
                            <Shield className={`w-3 h-3 ${u.role === 'ADMIN' ? 'text-slate-300' : 'text-slate-500'}`} />
                            <span>{u.role === 'ADMIN' ? 'Admin' : 'Mitglied'}</span>
                          </button>
                        </td>

                        <td className="py-3 px-4 text-slate-500 font-mono">
                          {u.createdAt ? formatDate(u.createdAt) : '—'}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            disabled={isSelf || isProcessing}
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isSelf ? 'Eigenes Konto nicht löschbar' : 'Benutzer löschen'}
                          >
                            {isProcessing ? (
                              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminUsersModal;
