import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import CatalogView from './components/CatalogView';
import LocationsView from './components/LocationsView';
import ItemDetailModal from './components/ItemDetailModal';
import ItemFormModal from './components/ItemFormModal';
import AdminUsersModal from './components/AdminUsersModal';
import AuthModal from './components/AuthModal';
import type { Item, Location } from './types';
import api from './services/api';
import {
  Sparkles,
  Lock,
  Landmark,
  LogIn,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
} from 'lucide-react';

interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

function MainApp() {
  const { isAuthenticated, loading: authLoading, isAdmin } = useAuth();

  // Navigation State
  const [activeTab, setActiveTab] = useState<'catalog' | 'locations' | 'users'>('catalog');

  // Data State
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Modals State
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isNewItemOpen, setIsNewItemOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAdminUsersOpen, setIsAdminUsersOpen] = useState(false);

  // Global Toast Notifications
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load items
  const loadItems = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingItems(true);
    try {
      const data = await api.getItems();
      setItems(data);
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      setLoadingItems(false);
    }
  }, [isAuthenticated]);

  // Load locations
  const loadLocations = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const tree = await api.getLocations(false);
      setLocations(tree);
    } catch (err) {
      console.error('Failed to load locations:', err);
    }
  }, [isAuthenticated]);

  // Load data on mount & auth change
  useEffect(() => {
    if (isAuthenticated) {
      loadItems();
      loadLocations();
    } else {
      setItems([]);
      setLocations([]);
    }
  }, [isAuthenticated, loadItems, loadLocations]);

  // Handlers for Item lifecycle
  const handleItemCreated = (newItem: Item) => {
    setItems((prev) => [newItem, ...prev.filter((i) => i.id !== newItem.id)]);
    loadLocations(); // Refresh item counters
    addToast(`Objekt „${newItem.name}“ erfolgreich angelegt!`, 'success');
  };

  const handleItemUpdated = (updatedItem: Item) => {
    setItems((prev) => prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
    if (selectedItem?.id === updatedItem.id) {
      setSelectedItem(updatedItem);
    }
    loadLocations(); // Refresh item counters
    addToast(`Objekt „${updatedItem.name}“ aktualisiert.`, 'success');
  };

  const handleItemDeleted = (deletedId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== deletedId));
    if (selectedItem?.id === deletedId) {
      setSelectedItem(null);
    }
    loadLocations();
    addToast('Objekt erfolgreich gelöscht.', 'info');
  };

  const handleNewItemClick = () => {
    if (!isAuthenticated) {
      setIsAuthOpen(true);
      return;
    }
    setIsNewItemOpen(true);
  };

  const handleTabChange = (tab: 'catalog' | 'locations' | 'users') => {
    if (tab === 'users') {
      if (isAdmin) {
        setIsAdminUsersOpen(true);
      }
      return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 flex flex-col font-sans selection:bg-amber-800 selection:text-white">
      {/* Top Sticky Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onNewItem={handleNewItemClick}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenAdminUsers={() => setIsAdminUsersOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {authLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-stone-400">
            <Loader2 className="w-10 h-10 animate-spin text-amber-800 mb-3" />
            <p className="text-sm font-medium">Antiquitäten-Katalog wird initialisiert...</p>
          </div>
        ) : !isAuthenticated ? (
          /* Unauthenticated Landing / Welcome State */
          <div className="max-w-2xl mx-auto my-12 bg-white rounded-3xl p-8 sm:p-10 border border-stone-200 shadow-xl text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-tr from-amber-800 to-amber-600 rounded-3xl flex items-center justify-center text-white mx-auto shadow-lg shadow-amber-800/20">
              <Landmark className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                Antiquitäten &amp; Sammlungsstücke
              </h1>
              <p className="text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
                Der professionelle Katalog für Antiquitäten, Kunst und Sammlerobjekte mit
                integrierter <strong>Google Gemini Multimodal AI</strong> für automatische
                Epochen-, Material- und Werteerkennung.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
                <Sparkles className="w-5 h-5 text-amber-700 mb-1.5" />
                <h4 className="text-xs font-bold text-stone-800">1-Klick KI-Scan</h4>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Fotos hochladen &amp; Gemini ermittelt automatisch 23 Attribute.
                </p>
              </div>

              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
                <Landmark className="w-5 h-5 text-amber-700 mb-1.5" />
                <h4 className="text-xs font-bold text-stone-800">Katalog &amp; Standorte</h4>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Hierarchische Standorte, Vitrinen, Epochen und Filter.
                </p>
              </div>

              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
                <Lock className="w-5 h-5 text-amber-700 mb-1.5" />
                <h4 className="text-xs font-bold text-stone-800">Sicher &amp; DSGVO</h4>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Rollenbasiert mit Authentik OIDC SSO oder lokalem Login.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsAuthOpen(true)}
                className="inline-flex items-center space-x-2 px-8 py-3 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-2xl shadow-lg shadow-amber-800/20 text-sm transition-all transform active:scale-98"
              >
                <LogIn className="w-4 h-4" />
                <span>Jetzt anmelden / registrieren</span>
              </button>
            </div>
          </div>
        ) : (
          /* Authenticated Tab Views */
          <div>
            {activeTab === 'catalog' && (
              <CatalogView
                items={items}
                locations={locations}
                loading={loadingItems}
                onSelectItem={(item) => setSelectedItem(item)}
                onNewItem={handleNewItemClick}
              />
            )}

            {activeTab === 'locations' && (
              <LocationsView
                locations={locations}
                onRefresh={() => {
                  loadLocations();
                  loadItems();
                }}
              />
            )}
          </div>
        )}
      </main>

      {/* MODALS */}

      {/* Item Detail Modal */}
      <ItemDetailModal
        isOpen={Boolean(selectedItem)}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onEdit={(item) => {
          setSelectedItem(null);
          setEditingItem(item);
        }}
        onDelete={handleItemDeleted}
        onItemUpdated={handleItemUpdated}
      />

      {/* Item Form Modal (Create Mode) */}
      <ItemFormModal
        isOpen={isNewItemOpen}
        item={null}
        locations={locations}
        onClose={() => setIsNewItemOpen(false)}
        onSaved={handleItemCreated}
      />

      {/* Item Form Modal (Edit Mode) */}
      <ItemFormModal
        isOpen={Boolean(editingItem)}
        item={editingItem}
        locations={locations}
        onClose={() => setEditingItem(null)}
        onSaved={handleItemUpdated}
      />

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* Admin Users Modal */}
      <AdminUsersModal
        isOpen={isAdminUsersOpen}
        onClose={() => setIsAdminUsersOpen(false)}
      />

      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center space-x-2.5 py-3 px-4 rounded-xl shadow-xl border text-xs font-semibold max-w-sm transition-all animate-fade-in ${
              toast.type === 'success'
                ? 'bg-emerald-900 text-white border-emerald-700'
                : toast.type === 'error'
                ? 'bg-rose-900 text-white border-rose-700'
                : 'bg-stone-900 text-white border-stone-700'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-300 flex-shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-300 flex-shrink-0" />
            )}
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-white/60 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
