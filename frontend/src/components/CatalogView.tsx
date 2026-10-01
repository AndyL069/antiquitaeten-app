import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  SlidersHorizontal,
  Plus,
  Landmark,
  ArrowUpDown,
  Sparkles,
} from 'lucide-react';
import ItemCard from './ItemCard';
import type { Item, Location } from '../types';
import { CATEGORIES, ERAS, CONDITIONS } from '../types';

export interface CatalogViewProps {
  items: Item[];
  locations: Location[];
  loading?: boolean;
  onSelectItem: (item: Item) => void;
  onNewItem: () => void;
}

type SortOption =
  | 'newest'
  | 'oldest'
  | 'name_asc'
  | 'name_desc'
  | 'price_desc'
  | 'price_asc'
  | 'inv_asc';

export const CatalogView: React.FC<CatalogViewProps> = ({
  items,
  locations,
  loading = false,
  onSelectItem,
  onNewItem,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedCondition, setSelectedCondition] = useState<string>('ALL');
  const [selectedEra, setSelectedEra] = useState<string>('ALL');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Helper to flatten nested locations
  const flattenedLocations = useMemo(() => {
    const result: Location[] = [];
    function traverse(list: Location[]) {
      for (const loc of list) {
        result.push(loc);
        if (loc.children && loc.children.length > 0) {
          traverse(loc.children);
        }
      }
    }
    traverse(locations);
    return result;
  }, [locations]);

  // Extract numeric price for sorting
  const getItemPrice = (item: Item): number => {
    if (item.appraisals && item.appraisals.length > 0) {
      return item.appraisals[item.appraisals.length - 1].value;
    }
    if (item.buyItNowPrice) return item.buyItNowPrice;
    if (item.startPrice) return item.startPrice;
    return 0;
  };

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return items
      .filter((item) => {
        // Search text matching
        if (q) {
          const matchName = item.name.toLowerCase().includes(q);
          const matchInv = (item.inventoryNumber || '').toLowerCase().includes(q);
          const matchEra = (item.era || '').toLowerCase().includes(q);
          const matchMat = (item.material || '').toLowerCase().includes(q);
          const matchDesc = (item.description || '').toLowerCase().includes(q);
          const matchContext = (item.context || '').toLowerCase().includes(q);
          const matchSearchText = (item.searchText || '').toLowerCase().includes(q);
          const matchOrigin = (item.origin || '').toLowerCase().includes(q);
          const matchAuthor = (item.author || '').toLowerCase().includes(q);

          if (
            !matchName &&
            !matchInv &&
            !matchEra &&
            !matchMat &&
            !matchDesc &&
            !matchContext &&
            !matchSearchText &&
            !matchOrigin &&
            !matchAuthor
          ) {
            return false;
          }
        }

        // Category filter
        if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
          return false;
        }

        // Condition filter
        if (selectedCondition !== 'ALL' && item.condition !== selectedCondition) {
          return false;
        }

        // Era filter
        if (selectedEra !== 'ALL' && item.era !== selectedEra) {
          return false;
        }

        // Location filter
        if (selectedLocationId !== 'ALL' && item.locationId !== selectedLocationId) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'newest':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'oldest':
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case 'name_asc':
            return a.name.localeCompare(b.name, 'de', { sensitivity: 'base' });
          case 'name_desc':
            return b.name.localeCompare(a.name, 'de', { sensitivity: 'base' });
          case 'inv_asc':
            return (a.inventoryNumber || '').localeCompare(b.inventoryNumber || '', 'de', {
              numeric: true,
            });
          case 'price_desc':
            return getItemPrice(b) - getItemPrice(a);
          case 'price_asc':
            return getItemPrice(a) - getItemPrice(b);
          default:
            return 0;
        }
      });
  }, [
    items,
    searchQuery,
    selectedCategory,
    selectedCondition,
    selectedEra,
    selectedLocationId,
    sortBy,
  ]);

  const hasActiveFilters =
    Boolean(searchQuery) ||
    selectedCategory !== 'ALL' ||
    selectedCondition !== 'ALL' ||
    selectedEra !== 'ALL' ||
    selectedLocationId !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedCondition('ALL');
    setSelectedEra('ALL');
    setSelectedLocationId('ALL');
    setSortBy('newest');
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Header Bar */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Live Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Objekte durchsuchen nach Name, Epoche, Material, Inventarnummer..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500 text-sm transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Actions (Mobile Filter toggle & Sort) */}
          <div className="flex items-center space-x-2">
            {/* Sort Dropdown */}
            <div className="relative flex items-center">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="pl-8 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500 cursor-pointer appearance-none"
              >
                <option value="newest">Neueste zuerst</option>
                <option value="oldest">Älteste zuerst</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
                <option value="inv_asc">Inventarnummer</option>
                <option value="price_desc">Preis (Höchster)</option>
                <option value="price_asc">Preis (Niedrigster)</option>
              </select>
            </div>

            {/* Mobile Filter Toggle */}
            <button
              type="button"
              onClick={() => setShowFiltersMobile(!showFiltersMobile)}
              className={`md:hidden flex items-center space-x-1.5 px-3 py-2.5 rounded-lg border text-xs font-medium ${
                hasActiveFilters
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-sky-400 ml-1 inline-block" />
              )}
            </button>
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div
          className={`${
            showFiltersMobile ? 'grid' : 'hidden'
          } md:grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100`}
        >
          {/* Category */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Kategorie
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-500 cursor-pointer"
            >
              <option value="ALL">Alle Kategorien</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Era */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Epoche
            </label>
            <select
              value={selectedEra}
              onChange={(e) => setSelectedEra(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-500 cursor-pointer"
            >
              <option value="ALL">Alle Epochen</option>
              {ERAS.map((era) => (
                <option key={era} value={era}>
                  {era}
                </option>
              ))}
            </select>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Zustand
            </label>
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-500 cursor-pointer"
            >
              <option value="ALL">Alle Zustände</option>
              {CONDITIONS.map((cond) => (
                <option key={cond} value={cond}>
                  {cond}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Standort
            </label>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-500 cursor-pointer"
            >
              <option value="ALL">Alle Standorte</option>
              {flattenedLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} {loc.itemCount !== undefined ? `(${loc.itemCount})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Summary & Reset Bar */}
        <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-700">
              {filteredAndSortedItems.length}
            </span>
            <span>
              {filteredAndSortedItems.length === 1 ? 'Objekt' : 'Objekte'} gefunden
            </span>
            {items.length > 0 && filteredAndSortedItems.length !== items.length && (
              <span className="text-slate-400"> (von insgesamt {items.length})</span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center space-x-1 text-slate-600 hover:text-slate-900 font-medium hover:underline"
            >
              <X className="w-3.5 h-3.5" />
              <span>Filter zurücksetzen</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid View */}
      {loading ? (
        // Skeleton loader
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden h-[340px] flex flex-col"
            >
              <div className="aspect-[4/3] bg-slate-200" />
              <div className="p-4 space-y-3 flex-1">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-5 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
                <div className="h-10 bg-slate-100 rounded mt-auto" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredAndSortedItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredAndSortedItems.map((item) => (
            <ItemCard key={item.id} item={item} onSelect={onSelectItem} />
          ))}
        </div>
      ) : (
        // Empty State
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-sm my-8">
          <div className="w-14 h-14 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto mb-4 border border-slate-200">
            <Landmark className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-serif font-bold text-slate-900 mb-1">
            {items.length === 0 ? 'Noch keine Objekte vorhanden' : 'Keine Treffer gefunden'}
          </h3>
          <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
            {items.length === 0
              ? 'Beginnen Sie jetzt mit dem Aufbau Ihres Katalogs. Fotos hochladen und Gemini KI die Attribute ermitteln lassen.'
              : 'Versuchen Sie, die Suchkriterien anzupassen oder Ihre Filter zurückzusetzen.'}
          </p>

          <div className="flex items-center justify-center gap-3">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium rounded-lg transition-colors"
              >
                Filter zurücksetzen
              </button>
            )}
            <button
              type="button"
              onClick={onNewItem}
              className="inline-flex items-center space-x-2 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Neues Objekt anlegen</span>
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogView;
