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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onTabChange('catalog')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-800 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-800/20">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-stone-900 leading-tight flex items-center gap-1.5">
                <span>Antiquitäten</span>
                <span className="text-amber-800 font-serif">&amp;</span>
                <span>Sammlungsstücke</span>
              </div>
              <div className="text-[11px] font-medium text-stone-500 tracking-wider uppercase">
                Fitcast Catalog &amp; AI
              </div>
            </div>
          </div>

          {/* Navigation Tabs - Desktop */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              type="button"
              onClick={() => onTabChange('catalog')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'catalog'
                  ? 'bg-amber-50 text-amber-900 font-semibold shadow-inner'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Package className="w-4 h-4 text-amber-700" />
              <span>Katalog</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('locations')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'locations'
                  ? 'bg-amber-50 text-amber-900 font-semibold shadow-inner'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <MapPin className="w-4 h-4 text-amber-700" />
              <span>Standorte</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={onOpenAdminUsers}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all"
                title="Benutzerverwaltung öffnen"
              >
                <Users className="w-4 h-4 text-amber-700" />
                <span>Benutzer</span>
                <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-amber-100 text-amber-800">
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
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all duration-150 transform active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Neues Objekt</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-200 ml-0.5" />
            </button>

            {/* Auth / Profile Section */}
            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2.5 p-1.5 pr-3 rounded-xl border border-stone-200 hover:border-stone-300 bg-white hover:bg-stone-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-xs">
                    {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left text-xs leading-tight hidden lg:block">
                    <div className="font-semibold text-stone-800 truncate max-w-[120px]">
                      {user.name || user.email.split('@')[0]}
                    </div>
                    <div className="text-stone-400 flex items-center gap-1">
                      {user.role === 'ADMIN' ? (
                        <span className="text-amber-700 font-semibold flex items-center">
                          <Shield className="w-3 h-3 mr-0.5 inline" /> Admin
                        </span>
                      ) : (
                        <span>Mitglied</span>
                      )}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-stone-400" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-stone-200 py-1.5 text-sm animate-fade-in z-50">
                    <div className="px-4 py-2 border-b border-stone-100">
                      <p className="font-semibold text-stone-800 truncate">{user.name || 'Benutzer'}</p>
                      <p className="text-xs text-stone-500 truncate">{user.email}</p>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenAdminUsers();
                        }}
                        className="w-full text-left px-4 py-2 text-stone-700 hover:bg-amber-50 hover:text-amber-900 flex items-center space-x-2"
                      >
                        <Users className="w-4 h-4 text-amber-700" />
                        <span>Benutzerverwaltung</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>Abmelden</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="flex items-center space-x-2 px-3.5 py-2 border border-stone-300 hover:border-amber-700 text-stone-700 hover:text-amber-800 rounded-xl text-sm font-semibold transition-colors"
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
              className="p-2 bg-amber-800 text-white rounded-lg"
              title="Neues Objekt"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-stone-600 hover:bg-stone-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white px-4 pt-3 pb-4 space-y-2 animate-fade-in">
          <button
            type="button"
            onClick={() => {
              onTabChange('catalog');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
              activeTab === 'catalog' ? 'bg-amber-50 text-amber-900 font-bold' : 'text-stone-700'
            }`}
          >
            <Package className="w-5 h-5 text-amber-700" />
            <span>Katalog</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onTabChange('locations');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
              activeTab === 'locations' ? 'bg-amber-50 text-amber-900 font-bold' : 'text-stone-700'
            }`}
          >
            <MapPin className="w-5 h-5 text-amber-700" />
            <span>Standorte</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                onOpenAdminUsers();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              <Users className="w-5 h-5 text-amber-700" />
              <span>Benutzerverwaltung (Admin)</span>
            </button>
          )}

          <div className="border-t border-stone-200 pt-3 mt-3">
            {isAuthenticated && user ? (
              <div className="space-y-2">
                <div className="px-3 py-1 text-xs text-stone-500">
                  Angemeldet als <strong className="text-stone-800">{user.email}</strong>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50"
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
                className="w-full flex items-center justify-center space-x-2 py-2.5 bg-amber-800 text-white rounded-xl font-semibold text-sm shadow"
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
