// frontend/src/components/Navbar.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Landmark,
  Plus,
  LogIn,
  LogOut,
  Users,
  MapPin,
  Package,
  ChevronDown,
  Shield,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export interface NavbarProps {
  activeTab: 'catalog' | 'locations' | 'users';
  onTabChange: (tab: 'catalog' | 'locations' | 'users') => void;
  onNewItem: () => void;
  onOpenAuth: () => void;
  onOpenAdminUsers: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onNewItem,
  onOpenAuth,
  onOpenAdminUsers,
}) => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    await logout();
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer min-w-0" onClick={() => onTabChange('catalog')}>
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Landmark className="w-5 h-5 text-slate-100" />
            </div>
            <div className="min-w-0">
              <div className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-tight flex items-center gap-1 sm:gap-1.5 truncate">
                <span className="font-serif">Antiquitäten</span>
                <span className="text-slate-500 font-serif italic">&amp;</span>
                <span className="font-serif">Sammlungsstücke</span>
              </div>
              <div className="text-[9px] sm:text-[10px] font-semibold text-slate-500 tracking-wider sm:tracking-widest uppercase truncate">
                Inventar &amp; Sammlungsverwaltung
              </div>
            </div>
          </div>

          {/* Navigation Tabs - Desktop */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              type="button"
              onClick={() => onTabChange('catalog')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'catalog'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Package className={`w-4 h-4 ${activeTab === 'catalog' ? 'text-white' : 'text-slate-500'}`} />
              <span>Katalog</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('locations')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'locations'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <MapPin className={`w-4 h-4 ${activeTab === 'locations' ? 'text-white' : 'text-slate-500'}`} />
              <span>Standorte</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={onOpenAdminUsers}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
                title="Benutzerverwaltung öffnen"
              >
                <Users className="w-4 h-4 text-slate-500" />
                <span>Benutzer</span>
                <span className="px-1.5 py-0.5 text-[10px] uppercase font-semibold tracking-wider rounded bg-slate-100 text-slate-700 border border-slate-200">
                  Admin
                </span>
              </button>
            )}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {/* New Item Action Button */}
            <button
              type="button"
              onClick={onNewItem}
              className="flex items-center space-x-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg shadow-sm transition-all duration-150 transform active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Neues Objekt</span>
              <Sparkles className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>

            {/* Auth / Profile Section */}
            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2.5 p-1.5 pr-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-800 font-semibold border border-slate-200 flex items-center justify-center text-xs">
                    {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left text-xs leading-tight hidden lg:block">
                    <div className="font-medium text-slate-800 truncate max-w-[120px]">
                      {user.name || user.email.split('@')[0]}
                    </div>
                    <div className="text-slate-500 flex items-center gap-1 text-[11px]">
                      {user.role === 'ADMIN' ? (
                        <span className="text-slate-700 font-medium flex items-center">
                          <Shield className="w-3 h-3 mr-0.5 inline text-slate-600" /> Admin
                        </span>
                      ) : (
                        <span>Mitglied</span>
                      )}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 text-sm animate-fade-in z-50">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="font-semibold text-slate-800 truncate">{user.name || 'Benutzer'}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenAdminUsers();
                        }}
                        className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                      >
                        <Users className="w-4 h-4 text-slate-600" />
                        <span>Benutzerverwaltung</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-rose-600 hover:bg-rose-50 flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Abmelden</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="flex items-center space-x-2 px-3.5 py-2 border border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 rounded-lg text-sm font-medium transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Anmelden</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              type="button"
              onClick={onNewItem}
              className="p-2 bg-slate-900 text-white rounded-lg shadow-sm"
              title="Neues Objekt"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-4 space-y-2 animate-fade-in">
          <button
            type="button"
            onClick={() => {
              onTabChange('catalog');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
              activeTab === 'catalog' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-700'
            }`}
          >
            <Package className="w-5 h-5 text-slate-600" />
            <span>Katalog</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onTabChange('locations');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
              activeTab === 'locations' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-700'
            }`}
          >
            <MapPin className="w-5 h-5 text-slate-600" />
            <span>Standorte</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                onOpenAdminUsers();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Users className="w-5 h-5 text-slate-600" />
              <span>Benutzerverwaltung (Admin)</span>
            </button>
          )}

          <div className="border-t border-slate-200 pt-3 mt-3">
            {isAuthenticated && user ? (
              <div className="space-y-2">
                <div className="px-3 py-1 text-xs text-slate-500">
                  Angemeldet als <strong className="text-slate-800">{user.email}</strong>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-rose-600 rounded-lg hover:bg-rose-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Abmelden</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onOpenAuth();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center space-x-2 py-2.5 bg-slate-900 text-white rounded-lg font-medium text-sm shadow-sm"
              >
                <LogIn className="w-4 h-4" />
                <span>Anmelden</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
