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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Benutzerverwaltung</h2>
              <p className="text-xs text-stone-400">Rollen verwalten und Zugänge steuern (Admin)</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={fetchUsers}
              disabled={loading}
              className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
              title="Aktualisieren"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 transition-colors"
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
        <div className="overflow-y-auto p-6 flex-1">
          {loading && users.length === 0 ? (
            <div className="py-12 text-center text-stone-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-700" />
              <p className="text-xs">Benutzerliste wird geladen...</p>
            </div>
          ) : (
            <div className="border border-stone-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Benutzer</th>
                    <th className="py-3 px-4">Anbieter</th>
                    <th className="py-3 px-4">Rolle</th>
                    <th className="py-3 px-4">Registriert</th>
                    <th className="py-3 px-4 text-right">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {users.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    const isProcessing = updatingId === u.id;

                    return (
                      <tr key={u.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-stone-900 flex items-center gap-1.5">
                            <span>{u.name || u.email.split('@')[0]}</span>
                            {isSelf && (
                              <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                                Du
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-stone-400 font-mono">{u.email}</div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-medium">
                            {u.authProvider || 'lokal'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <button
                            type="button"
                            disabled={isSelf || isProcessing}
                            onClick={() => handleRoleToggle(u)}
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                              u.role === 'ADMIN'
                                ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                                : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
                            } ${isSelf ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                            title={
                              isSelf
                                ? 'Eigene Rolle kann nicht geändert werden'
                                : `Klicken, um Rolle zu ${u.role === 'ADMIN' ? 'MEMBER' : 'ADMIN'} zu wechseln`
                            }
                          >
                            <Shield className="w-3 h-3 text-amber-700" />
                            <span>{u.role === 'ADMIN' ? 'Admin' : 'Mitglied'}</span>
                          </button>
                        </td>

                        <td className="py-3 px-4 text-stone-500 font-mono">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('de-DE') : '—'}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            disabled={isSelf || isProcessing}
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isSelf ? 'Eigenes Konto nicht löschbar' : 'Benutzer löschen'}
                          >
                            {isProcessing ? (
                              <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
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
        <div className="px-6 py-3.5 bg-stone-50 border-t border-stone-200 flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold rounded-xl transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminUsersModal;
