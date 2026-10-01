import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Edit3,
  Trash2,
  MapPin,
  Calendar,
  Tag,
  Star,
  Plus,
  DollarSign,
  TrendingUp,
  BookOpen,
  Image as ImageIcon,
  Loader2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import type { Item } from '../types';
import { CURRENCIES } from '../types';
import api from '../services/api';
import { getPhotoUrl, formatDate } from '../utils/formatters';


export interface ItemDetailModalProps {
  isOpen: boolean;
  item: Item | null;
  onClose: () => void;
  onEdit: (item: Item) => void;
  onDelete: (itemId: string) => void;
  onItemUpdated: (updatedItem: Item) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  isOpen,
  item,
  onClose,
  onEdit,
  onDelete,
  onItemUpdated,
}) => {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoActionLoading, setPhotoActionLoading] = useState<string | null>(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  // Appraisal Form State
  const [showAppraisalForm, setShowAppraisalForm] = useState(false);
  const [appraisalValue, setAppraisalValue] = useState('');
  const [appraisalCurrency, setAppraisalCurrency] = useState('EUR');
  const [appraisalAppraiser, setAppraisalAppraiser] = useState('');
  const [appraisalDate, setAppraisalDate] = useState('');
  const [appraisalNote, setAppraisalNote] = useState('');
  const [isSubmittingAppraisal, setIsSubmittingAppraisal] = useState(false);

  // Sale Form State
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [salePlatform, setSalePlatform] = useState('eBay');
  const [saleAmount, setSaleAmount] = useState('');
  const [saleCurrency, setSaleCurrency] = useState('EUR');
  const [saleDate, setSaleDate] = useState('');
  const [saleNote, setSaleNote] = useState('');
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset active photo index when item changes
  useEffect(() => {
    setActivePhotoIndex(0);
    setShowAppraisalForm(false);
    setShowSaleForm(false);
    setConfirmDeleteModal(false);
  }, [item?.id]);

  if (!isOpen || !item) return null;

  const photos = item.photos || [];
  const primaryIndex = photos.findIndex((p) => p.isPrimary);
  const currentPhoto = photos[activePhotoIndex] || (primaryIndex >= 0 ? photos[primaryIndex] : photos[0]);

  // Refresh current item data
  const refreshItemData = async () => {
    try {
      const fresh = await api.getItem(item.id);
      onItemUpdated(fresh);
    } catch (err) {
      console.error('Failed to refresh item:', err);
    }
  };

  // Upload extra photo
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhoto(true);
    try {
      for (let i = 0; i < files.length; i++) {
        await api.uploadPhoto(item.id, files[i], photos.length === 0 && i === 0);
      }
      await refreshItemData();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      alert(`Foto-Upload fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Set primary photo
  const handleSetPrimary = async (photoId: string) => {
    setPhotoActionLoading(photoId);
    try {
      await api.setPrimaryPhoto(photoId);
      await refreshItemData();
    } catch (err) {
      alert(`Fehler beim Setzen des Hauptfotos: ${err instanceof Error ? err.message : 'Fehler'}`);
    } finally {
      setPhotoActionLoading(null);
    }
  };

  // Delete photo
  const handleDeletePhoto = async (photoId: string) => {
    if (!window.confirm('Möchten Sie dieses Foto wirklich löschen?')) return;

    setPhotoActionLoading(photoId);
    try {
      await api.deletePhoto(photoId);
      await refreshItemData();
      setActivePhotoIndex(0);
    } catch (err) {
      alert(`Fehler beim Löschen des Fotos: ${err instanceof Error ? err.message : 'Fehler'}`);
    } finally {
      setPhotoActionLoading(null);
    }
  };

  // Submit new Appraisal
  const handleAddAppraisal = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(appraisalValue);
    if (isNaN(val) || val <= 0) return;

    setIsSubmittingAppraisal(true);
    try {
      await api.addAppraisal(item.id, {
        value: val,
        currency: appraisalCurrency,
        appraiser: appraisalAppraiser.trim() || null,
        appraisalDate: appraisalDate || null,
        note: appraisalNote.trim() || null,
      });
      await refreshItemData();
      setAppraisalValue('');
      setAppraisalAppraiser('');
      setAppraisalNote('');
      setShowAppraisalForm(false);
    } catch (err) {
      alert(`Fehler: ${err instanceof Error ? err.message : 'Konnte Schätzung nicht anlegen'}`);
    } finally {
      setIsSubmittingAppraisal(false);
    }
  };

  // Delete Appraisal
  const handleDeleteAppraisal = async (id: string) => {
    if (!window.confirm('Diese Schätzung wirklich löschen?')) return;
    try {
      await api.deleteAppraisal(id);
      await refreshItemData();
    } catch (err) {
      alert('Löschen fehlgeschlagen.');
    }
  };

  // Submit new Sale
  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(saleAmount);
    if (isNaN(amt) || amt <= 0) return;

    setIsSubmittingSale(true);
    try {
      await api.addSale(item.id, {
        platform: salePlatform.trim() || 'Direktverkauf',
        amount: amt,
        currency: saleCurrency,
        soldAt: saleDate || null,
        note: saleNote.trim() || null,
      });
      await refreshItemData();
      setSaleAmount('');
      setSaleNote('');
      setShowSaleForm(false);
    } catch (err) {
      alert(`Fehler: ${err instanceof Error ? err.message : 'Konnte Verkauf nicht erfassen'}`);
    } finally {
      setIsSubmittingSale(false);
    }
  };

  // Delete Sale
  const handleDeleteSale = async (id: string) => {
    if (!window.confirm('Diesen Verkaufseintrag wirklich löschen?')) return;
    try {
      await api.deleteSale(id);
      await refreshItemData();
    } catch (err) {
      alert('Löschen fehlgeschlagen.');
    }
  };

  // Item Delete
  const handleConfirmDeleteItem = async () => {
    setIsDeletingItem(true);
    try {
      await api.deleteItem(item.id);
      onDelete(item.id);
      onClose();
    } catch (err) {
      alert(`Fehler beim Löschen des Objekts: ${err instanceof Error ? err.message : 'Fehler'}`);
    } finally {
      setIsDeletingItem(false);
    }
  };

  // Check if book section is applicable
  const hasBookFields =
    item.category === 'Buch' ||
    Boolean(item.author || item.publisher || item.publicationYear || item.edition || item.language);

  const appraisals = item.appraisals || [];
  const sales = item.sales || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-hidden">
      <div
        className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[calc(100dvh-1rem)] sm:h-auto sm:max-h-[90vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-900 text-white flex items-start justify-between gap-3 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
            {item.inventoryNumber && (
              <span className="self-start px-2 py-0.5 sm:px-2.5 sm:py-1 bg-slate-800 text-slate-200 font-mono text-[11px] sm:text-xs font-semibold rounded-md border border-slate-700 whitespace-nowrap flex-shrink-0">
                {item.inventoryNumber}
              </span>
            )}
            <h2 className="text-base sm:text-xl font-serif font-bold tracking-tight break-words text-white leading-snug">
              {item.name}
            </h2>
          </div>
          <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0 pt-0.5">
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium shadow transition-colors"
              title="Objekt bearbeiten"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bearbeiten</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 flex-1 overscroll-contain">
          {/* Top Section: Photo Gallery + Key Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Gallery Column (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              {/* Primary View */}
              <div className="relative aspect-[4/3] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center shadow-inner group">
                {currentPhoto ? (
                  <>
                    <img
                      src={getPhotoUrl(currentPhoto.path)}
                      alt={item.name}
                      className="w-full h-full object-contain bg-slate-900/5"
                    />
                    {/* Primary Badge */}
                    {currentPhoto.isPrimary && (
                      <div className="absolute top-3 left-3 bg-slate-900 text-white text-[11px] font-medium px-2.5 py-1 rounded shadow flex items-center space-x-1">
                        <Star className="w-3 h-3 fill-slate-300 text-slate-300" />
                        <span>Hauptfoto</span>
                      </div>
                    )}
                    {/* Controls on hover */}
                    <div className="absolute top-3 right-3 flex items-center space-x-2 opacity-90 group-hover:opacity-100 transition-opacity">
                      {!currentPhoto.isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(currentPhoto.id)}
                          disabled={photoActionLoading === currentPhoto.id}
                          className="px-2.5 py-1 bg-white/90 hover:bg-white text-slate-800 text-xs font-medium rounded shadow border border-slate-200 flex items-center space-x-1"
                          title="Als primäres Foto setzen"
                        >
                          <Star className="w-3 h-3 text-slate-500" />
                          <span>Als Hauptfoto</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(currentPhoto.id)}
                        disabled={photoActionLoading === currentPhoto.id}
                        className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow"
                        title="Foto löschen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-8 text-slate-400">
                    <ImageIcon className="w-16 h-16 stroke-1 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm">Kein Foto für dieses Objekt vorhanden.</p>
                  </div>
                )}
              </div>

              {/* Thumbnails Strip */}
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {photos.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActivePhotoIndex(idx)}
                    className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                      idx === activePhotoIndex
                        ? 'border-slate-900 ring-2 ring-slate-900/20'
                        : 'border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={getPhotoUrl(p.path)} alt="" className="w-full h-full object-cover" />
                    {p.isPrimary && (
                      <span className="absolute bottom-0 inset-x-0 bg-slate-900 text-[8px] text-white font-medium text-center py-0.5">
                        Haupt
                      </span>
                    )}
                  </button>
                ))}

                {/* Upload More Photos Button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-600 flex flex-col items-center justify-center text-slate-500 hover:text-slate-800 transition-colors flex-shrink-0 bg-slate-50"
                  title="Weiteres Foto hinzufügen"
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-700" />
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mb-0.5" />
                      <span className="text-[9px] font-semibold">Foto +</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Overview Column (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Badges Bar */}
              <div className="flex flex-wrap gap-2">
                {item.category && (
                  <span className="px-3 py-1 bg-slate-100 text-slate-800 text-xs font-medium rounded-lg border border-slate-200">
                    {item.category}
                  </span>
                )}
                {item.era && (
                  <span className="px-3 py-1 bg-slate-100 text-slate-800 text-xs font-medium rounded-lg border border-slate-200 flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-slate-500" />
                    {item.era}
                  </span>
                )}
                {item.condition && (
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-medium rounded-lg border border-emerald-200">
                    {item.condition}
                  </span>
                )}
              </div>

              {/* Location Card */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center space-x-3">
                <div className="p-2 bg-slate-200 text-slate-700 rounded-lg">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Standort
                  </span>
                  <span className="text-sm font-semibold text-slate-800">
                    {item.location?.name || 'Kein Standort hinterlegt'}
                  </span>
                </div>
              </div>

              {/* Key Specifications Table */}
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
                {item.origin && (
                  <div className="flex justify-between py-2 px-3">
                    <span className="text-slate-500 font-medium">Herkunft:</span>
                    <span className="font-semibold text-slate-800 text-right">{item.origin}</span>
                  </div>
                )}
                {item.material && (
                  <div className="flex justify-between py-2 px-3">
                    <span className="text-slate-500 font-medium">Material:</span>
                    <span className="font-semibold text-slate-800 text-right">{item.material}</span>
                  </div>
                )}
                {item.dimensions && (
                  <div className="flex justify-between py-2 px-3">
                    <span className="text-slate-500 font-medium">Abmessungen:</span>
                    <span className="font-semibold text-slate-800 text-right">{item.dimensions}</span>
                  </div>
                )}
                {item.weight && (
                  <div className="flex justify-between py-2 px-3">
                    <span className="text-slate-500 font-medium">Gewicht:</span>
                    <span className="font-semibold text-slate-800 text-right">{item.weight}</span>
                  </div>
                )}
                {item.acquisitionDate && (
                  <div className="flex justify-between py-2 px-3">
                    <span className="text-slate-500 font-medium">Erwerbsdatum:</span>
                    <span className="font-semibold text-slate-800 text-right">
                      {formatDate(item.acquisitionDate)}
                    </span>
                  </div>
                )}
              </div>

              {/* Price / Valuation Card */}
              <div className="p-4 bg-slate-900 text-white rounded-xl shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Aktueller Schätzwert
                  </span>
                  <DollarSign className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                  {appraisals.length > 0
                    ? new Intl.NumberFormat('de-DE', {
                        style: 'currency',
                        currency: appraisals[appraisals.length - 1].currency || 'EUR',
                      }).format(appraisals[appraisals.length - 1].value)
                    : item.buyItNowPrice
                    ? `${item.buyItNowPrice} € (Sofortkauf)`
                    : 'Nicht geschätzt'}
                </div>
                {appraisals.length > 0 && appraisals[appraisals.length - 1].note && (
                  <p className="text-xs text-slate-300 italic">
                    „{appraisals[appraisals.length - 1].note}“
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Description & Context Section */}
          <div className="space-y-4">
            {item.description && (
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Beschreibung
                </h3>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                  {item.description}
                </div>
              </div>
            )}

            {item.context && (
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-slate-600" />
                  <span>Historischer Kontext &amp; Epocheneinordnung</span>
                </h3>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm leading-relaxed italic border-l-4 border-l-slate-700">
                  {item.context}
                </div>
              </div>
            )}
          </div>

          {/* Book Section (Conditional) */}
          {hasBookFields && (
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center space-x-2 text-slate-800">
                <BookOpen className="w-5 h-5 text-slate-700" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Buch- &amp; Druckwerk-Metadaten
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {item.author && (
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">
                      Autor
                    </span>
                    <span className="font-semibold text-slate-800">{item.author}</span>
                  </div>
                )}
                {item.publisher && (
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">
                      Verlag / Druckerei
                    </span>
                    <span className="font-semibold text-slate-800">{item.publisher}</span>
                  </div>
                )}
                {item.publicationYear && (
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">
                      Erscheinungsjahr
                    </span>
                    <span className="font-semibold text-slate-800">{item.publicationYear}</span>
                  </div>
                )}
                {item.edition && (
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">
                      Auflage
                    </span>
                    <span className="font-semibold text-slate-800">{item.edition}</span>
                  </div>
                )}
                {item.language && (
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">
                      Sprache
                    </span>
                    <span className="font-semibold text-slate-800">{item.language}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* eBay & Valuation Section */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span>eBay &amp; Marktplatz-Daten</span>
              <Tag className="w-4 h-4 text-slate-400" />
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="sm:col-span-2">
                <span className="text-slate-400 block uppercase font-bold text-[10px]">
                  eBay Angebotstitel
                </span>
                <span className="font-semibold text-slate-800">
                  {item.ebayTitle || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[10px]">
                  Startpreis
                </span>
                <span className="font-semibold text-slate-800 font-mono">
                  {item.startPrice !== null && item.startPrice !== undefined
                    ? `${item.startPrice} €`
                    : '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[10px]">
                  Sofort-Kaufpreis
                </span>
                <span className="font-semibold text-slate-800 font-mono">
                  {item.buyItNowPrice !== null && item.buyItNowPrice !== undefined
                    ? `${item.buyItNowPrice} €`
                    : '—'}
                </span>
              </div>
            </div>

            {(item.ebayCondition || item.ebayConditionNote) && (
              <div className="pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-400 uppercase font-bold text-[10px] mr-2">
                  eBay Zustand:
                </span>
                <span className="font-medium text-slate-800">
                  {item.ebayCondition}{' '}
                  {item.ebayConditionNote ? `(${item.ebayConditionNote})` : ''}
                </span>
              </div>
            )}
          </div>

          {/* Sub-Section 1: Appraisals (Wertschätzungen) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Wertschätzungen ({appraisals.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAppraisalForm(!showAppraisalForm)}
                className="flex items-center space-x-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Schätzung erfassen</span>
              </button>
            </div>

            {/* Inline Add Appraisal Form */}
            {showAppraisalForm && (
              <form
                onSubmit={handleAddAppraisal}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 animate-fade-in"
              >
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Neue Wertschätzung hinzufügen
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Wert *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={appraisalValue}
                      onChange={(e) => setAppraisalValue(e.target.value)}
                      placeholder="1200.00"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Währung
                    </label>
                    <select
                      value={appraisalCurrency}
                      onChange={(e) => setAppraisalCurrency(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Gutachter / Quelle
                    </label>
                    <input
                      type="text"
                      value={appraisalAppraiser}
                      onChange={(e) => setAppraisalAppraiser(e.target.value)}
                      placeholder="z.B. Dorotheum"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Datum
                    </label>
                    <input
                      type="date"
                      value={appraisalDate}
                      onChange={(e) => setAppraisalDate(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Notiz / Begründung
                  </label>
                  <input
                    type="text"
                    value={appraisalNote}
                    onChange={(e) => setAppraisalNote(e.target.value)}
                    placeholder="z.B. Auktionskatalog Referenzlos #104"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAppraisalForm(false)}
                    className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAppraisal}
                    className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 disabled:bg-slate-300"
                  >
                    {isSubmittingAppraisal ? 'Wird gespeichert...' : 'Schätzung speichern'}
                  </button>
                </div>
              </form>
            )}

            {/* Appraisal List */}
            {appraisals.length > 0 ? (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {appraisals.map((a) => (
                  <div key={a.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold font-mono text-slate-900 text-sm">
                          {new Intl.NumberFormat('de-DE', {
                            style: 'currency',
                            currency: a.currency || 'EUR',
                          }).format(a.value)}
                        </span>
                        {a.appraiser && (
                          <span className="text-slate-500 font-medium">({a.appraiser})</span>
                        )}
                        {(a.appraisalDate || a.createdAt) && (
                          <span className="text-slate-400">
                            am {formatDate(a.appraisalDate || a.createdAt)}
                          </span>
                        )}
                      </div>
                      {a.note && <p className="text-slate-600 text-xs mt-0.5">{a.note}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAppraisal(a.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Schätzung löschen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Noch keine Wertschätzungen erfasst.</p>
            )}
          </div>

          {/* Sub-Section 2: Sales (Verkäufe) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Verkäufe ({sales.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSaleForm(!showSaleForm)}
                className="flex items-center space-x-1 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Verkauf erfassen</span>
              </button>
            </div>

            {/* Inline Add Sale Form */}
            {showSaleForm && (
              <form
                onSubmit={handleAddSale}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 animate-fade-in"
              >
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Verkauf dokumentieren
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Verkaufspreis *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={saleAmount}
                      onChange={(e) => setSaleAmount(e.target.value)}
                      placeholder="1500.00"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Währung
                    </label>
                    <select
                      value={saleCurrency}
                      onChange={(e) => setSaleCurrency(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Plattform / Käufer
                    </label>
                    <input
                      type="text"
                      value={salePlatform}
                      onChange={(e) => setSalePlatform(e.target.value)}
                      placeholder="z.B. eBay / Messe"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Verkaufsdatum
                    </label>
                    <input
                      type="date"
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Notiz
                  </label>
                  <input
                    type="text"
                    value={saleNote}
                    onChange={(e) => setSaleNote(e.target.value)}
                    placeholder="z.B. Inklusive Versand und Versicherung"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowSaleForm(false)}
                    className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingSale}
                    className="px-4 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-medium hover:bg-emerald-800 disabled:bg-slate-300"
                  >
                    {isSubmittingSale ? 'Wird gespeichert...' : 'Verkauf speichern'}
                  </button>
                </div>
              </form>
            )}

            {/* Sale List */}
            {sales.length > 0 ? (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {sales.map((s) => (
                  <div key={s.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold font-mono text-emerald-800 text-sm">
                          {new Intl.NumberFormat('de-DE', {
                            style: 'currency',
                            currency: s.currency || 'EUR',
                          }).format(s.amount)}
                        </span>
                        <span className="text-slate-600 font-medium">über {s.platform}</span>
                        {(s.soldAt || s.createdAt) && (
                          <span className="text-slate-400">
                            am {formatDate(s.soldAt || s.createdAt)}
                          </span>
                        )}
                      </div>
                      {s.note && <p className="text-slate-500 text-xs mt-0.5">{s.note}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSale(s.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Verkauf löschen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Noch keine Verkäufe registriert.</p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={() => setConfirmDeleteModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Objekt löschen</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Sub-Modal for Deleting Item */}
      {confirmDeleteModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900">Objekt wirklich löschen?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Das Objekt „{item.name}“ und alle zugehörigen Fotos, Schätzungen und Verkäufe werden
                unwiderruflich entfernt.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteModal(false)}
                disabled={isDeletingItem}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-200"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteItem}
                disabled={isDeletingItem}
                className="px-4 py-2 bg-rose-600 text-white text-xs font-medium rounded-lg hover:bg-rose-700 flex items-center space-x-1"
              >
                {isDeletingItem ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Endgültig löschen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemDetailModal;
