import React, { useState } from 'react';
import {
  MapPin,
  Folder,
  FolderOpen,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  Package,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import type { Location } from '../types';
import api from '../services/api';

export interface LocationsViewProps {
  locations: Location[]; // hierarchical tree
  onRefresh: () => void;
}

interface LocationModalState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  locationId?: string;
  parentId?: string | null;
  name: string;
  description: string;
}

export const LocationsView: React.FC<LocationsViewProps> = ({ locations, onRefresh }) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [modalState, setModalState] = useState<LocationModalState>({
    isOpen: false,
    mode: 'create',
    parentId: null,
    name: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toggle node expansion
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Expand all / Collapse all
  const expandAll = () => {
    const allIds = new Set<string>();
    function collect(nodes: Location[]) {
      for (const n of nodes) {
        allIds.add(n.id);
        if (n.children && n.children.length > 0) collect(n.children);
      }
    }
    collect(locations);
    setExpandedIds(allIds);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Open modal for new root location
  const handleNewRoot = () => {
    setError(null);
    setModalState({
      isOpen: true,
      mode: 'create',
      parentId: null,
      name: '',
      description: '',
    });
  };

  // Open modal for new child location
  const handleNewChild = (parent: Location) => {
    setError(null);
    setModalState({
      isOpen: true,
      mode: 'create',
      parentId: parent.id,
      name: '',
      description: '',
    });
    // Ensure parent is expanded
    setExpandedIds((prev) => new Set(prev).add(parent.id));
  };

  // Open modal for editing location
  const handleEdit = (loc: Location) => {
    setError(null);
    setModalState({
      isOpen: true,
      mode: 'edit',
      locationId: loc.id,
      parentId: loc.parentId || null,
      name: loc.name,
      description: loc.description || '',
    });
  };

  // Delete location with confirmation
  const handleDelete = async (loc: Location) => {
    const hasChildren = loc.children && loc.children.length > 0;
    const warning = hasChildren
      ? `Standort „${loc.name}“ besitzt Unterstandorte. Möchten Sie diesen wirklich löschen?`
      : `Standort „${loc.name}“ wirklich löschen?`;

    if (!window.confirm(warning)) return;

    try {
      await api.deleteLocation(loc.id);
      onRefresh();
    } catch (err) {
      alert(`Fehler beim Löschen: ${err instanceof Error ? err.message : 'Fehler'}`);
    }
  };

  // Save location (create or edit)
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalState.name.trim()) {
      setError('Bitte geben Sie einen Namen für den Standort an.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (modalState.mode === 'create') {
        await api.createLocation({
          name: modalState.name.trim(),
          description: modalState.description.trim() || null,
          parentId: modalState.parentId || null,
        });
      } else if (modalState.mode === 'edit' && modalState.locationId) {
        await api.updateLocation(modalState.locationId, {
          name: modalState.name.trim(),
          description: modalState.description.trim() || null,
          parentId: modalState.parentId || null,
        });
      }

      setModalState((prev) => ({ ...prev, isOpen: false }));
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Recursive tree item renderer
  const renderLocationNode = (node: Location, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 group ${
            depth > 0 ? 'ml-4 sm:ml-6' : ''
          }`}
        >
          {/* Left Node Info & Toggle */}
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-900" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}

            <div className="text-slate-700">
              {hasChildren ? (
                isExpanded ? (
                  <FolderOpen className="w-4 h-4" />
                ) : (
                  <Folder className="w-4 h-4" />
                )
              ) : (
                <MapPin className="w-4 h-4 text-slate-400" />
              )}
            </div>

            <div className="min-w-0 flex-1 flex items-baseline gap-2">
              <span className="font-semibold text-sm text-slate-900 truncate">{node.name}</span>
              {node.description && (
                <span className="text-xs text-slate-400 truncate hidden md:inline">
                  — {node.description}
                </span>
              )}
            </div>

            {/* Item Count Badge */}
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center space-x-1 ${
                (node.itemCount || 0) > 0
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Package className="w-3 h-3 inline mr-0.5" />
              <span>{node.itemCount || 0} Objekte</span>
            </span>
          </div>

          {/* Action buttons on hover */}
          <div className="flex items-center space-x-1 opacity-70 group-hover:opacity-100 transition-opacity ml-3">
            <button
              type="button"
              onClick={() => handleNewChild(node)}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Unterstandort hinzufügen"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleEdit(node)}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Standort bearbeiten"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(node)}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Standort löschen"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Children Sub-Tree */}
        {hasChildren && isExpanded && (
          <div className="border-l-2 border-slate-200 ml-5 pl-2 space-y-0.5 mt-0.5">
            {node.children!.map((child) => renderLocationNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-slate-800" />
            <span>Standorte &amp; Lagerverwaltung</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Hierarchische Struktur aller Räume, Vitrinen, Depots und Schränke mit Objektzählern.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {locations.length > 0 && (
            <>
              <button
                type="button"
                onClick={expandAll}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Alle aufklappen
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Zuklappen
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleNewRoot}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Neuer Hauptstandort</span>
          </button>
        </div>
      </div>

      {/* Hierarchical Tree Container */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        {locations.length > 0 ? (
          <div className="space-y-1">
            {locations.map((loc) => renderLocationNode(loc))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <MapPin className="w-12 h-12 stroke-1 mx-auto mb-2 text-slate-300" />
            <p className="text-base font-serif font-semibold text-slate-800">Noch keine Standorte angelegt</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Legen Sie Ihren ersten Raum, Schrank oder Lagerort an.
            </p>
            <button
              type="button"
              onClick={handleNewRoot}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Ersten Standort anlegen</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal for Create / Edit Location */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div
            className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-serif font-semibold text-base">
                {modalState.mode === 'create'
                  ? modalState.parentId
                    ? 'Neuen Unterstandort anlegen'
                    : 'Neuen Hauptstandort anlegen'
                  : 'Standort bearbeiten'}
              </h3>
              <button
                type="button"
                onClick={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Standortname *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={modalState.name}
                  onChange={(e) =>
                    setModalState((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="z.B. Galerie OG, Vitrine 3, Depot Ost"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Beschreibung (optional)
                </label>
                <textarea
                  rows={3}
                  value={modalState.description}
                  onChange={(e) =>
                    setModalState((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="z.B. Beleuchtete Glasvitrine, oberstes Fach"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-900"
                />
              </div>

              <div className="flex justify-end items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold rounded-lg"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center space-x-1.5 transition-colors"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Speichern</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationsView;
