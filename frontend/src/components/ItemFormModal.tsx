import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  BookOpen,
  DollarSign,
  FileText,
  Layers,
} from 'lucide-react';
import type { Item, Location, ItemDetailsAnalysis } from '../types';
import { CATEGORIES, ERAS, CONDITIONS, EBAY_CONDITIONS } from '../types';
import api from '../services/api';

export interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: Item | null;
  locations: Location[];
  onSaved: (savedItem: Item) => void;
}

export const ItemFormModal: React.FC<ItemFormModalProps> = ({
  isOpen,
  onClose,
  item,
  locations,
  onSaved,
}) => {
  const [persistedItem, setPersistedItem] = useState<Item | null>(item || null);
  const isEditMode = Boolean(persistedItem);

  // Form Fields State
  const [name, setName] = useState('');
  const [inventoryNumber, setInventoryNumber] = useState('');
  const [category, setCategory] = useState<string>('Sonstiges');
  const [era, setEra] = useState<string>('Sonstige');
  const [origin, setOrigin] = useState('');
  const [material, setMaterial] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [condition, setCondition] = useState<string>('Gut');
  const [weight, setWeight] = useState('');
  const [locationId, setLocationId] = useState<string>('');
  const [acquisitionDate, setAcquisitionDate] = useState('');

  const [description, setDescription] = useState('');
  const [context, setContext] = useState('');

  // Book fields
  const [author, setAuthor] = useState('');
  const [publisher, setPublisher] = useState('');
  const [publicationYear, setPublicationYear] = useState('');
  const [edition, setEdition] = useState('');
  const [language, setLanguage] = useState('');

  // eBay & Valuation fields
  const [ebayTitle, setEbayTitle] = useState('');
  const [ebayCategory, setEbayCategory] = useState('');
  const [ebayCondition, setEbayCondition] = useState<string>('');
  const [ebayConditionNote, setEbayConditionNote] = useState('');
  const [startPrice, setStartPrice] = useState<string>('');
  const [buyItNowPrice, setBuyItNowPrice] = useState<string>('');
  const [estimatedValue, setEstimatedValue] = useState<string>('');
  const [valueNote, setValueNote] = useState('');

  // Photos & Uploads
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newFilePreviews, setNewFilePreviews] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track preview URLs to revoke on unmount or reset
  const previewUrlsRef = useRef<string[]>([]);
  previewUrlsRef.current = newFilePreviews;

  useEffect(() => {
    return () => {
      // Memory cleanup: revoke all created object URLs on unmount
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // UI & Loading States
  const [activeTab, setActiveTab] = useState<'basic' | 'text' | 'book' | 'ebay'>('basic');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savingProgress, setSavingProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  // Flatten locations for selector
  const flattenedLocations = React.useMemo(() => {
    const list: Location[] = [];
    function traverse(arr: Location[], depth = 0) {
      for (const loc of arr) {
        list.push({ ...loc, name: depth > 0 ? `${'— '.repeat(depth)}${loc.name}` : loc.name });
        if (loc.children && loc.children.length > 0) {
          traverse(loc.children, depth + 1);
        }
      }
    }
    traverse(locations);
    return list;
  }, [locations]);

  // Initialize or reset form on open/item change
  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setAiSuccessMessage(null);
    newFilePreviews.forEach((url) => URL.revokeObjectURL(url));
    setNewFiles([]);
    setNewFilePreviews([]);

    setPersistedItem(item || null);

    if (item) {
      // Edit mode
      setName(item.name || '');
      setInventoryNumber(item.inventoryNumber || '');
      setCategory(item.category || 'Sonstiges');
      setEra(item.era || 'Sonstige');
      setOrigin(item.origin || '');
      setMaterial(item.material || '');
      setDimensions(item.dimensions || '');
      setCondition(item.condition || 'Gut');
      setWeight(item.weight || '');
      setLocationId(item.locationId || '');
      setAcquisitionDate(item.acquisitionDate ? item.acquisitionDate.split('T')[0] : '');

      setDescription(item.description || '');
      setContext(item.context || '');

      setAuthor(item.author || '');
      setPublisher(item.publisher || '');
      setPublicationYear(item.publicationYear || '');
      setEdition(item.edition || '');
      setLanguage(item.language || '');

      setEbayTitle(item.ebayTitle || '');
      setEbayCategory(item.ebayCategory || '');
      setEbayCondition(item.ebayCondition || '');
      setEbayConditionNote(item.ebayConditionNote || '');
      setStartPrice(item.startPrice !== null && item.startPrice !== undefined ? String(item.startPrice) : '');
      setBuyItNowPrice(item.buyItNowPrice !== null && item.buyItNowPrice !== undefined ? String(item.buyItNowPrice) : '');

      const latestAppraisal = item.appraisals && item.appraisals.length > 0
        ? item.appraisals[item.appraisals.length - 1]
        : null;
      setEstimatedValue(latestAppraisal ? String(latestAppraisal.value) : '');
      setValueNote(latestAppraisal?.note || '');
    } else {
      // Create mode
      setName('');
      setInventoryNumber('');
      setCategory('Sonstiges');
      setEra('Sonstige');
      setOrigin('');
      setMaterial('');
      setDimensions('');
      setCondition('Gut');
      setWeight('');
      setLocationId('');
      setAcquisitionDate('');

      setDescription('');
      setContext('');

      setAuthor('');
      setPublisher('');
      setPublicationYear('');
      setEdition('');
      setLanguage('');

      setEbayTitle('');
      setEbayCategory('');
      setEbayCondition('');
      setEbayConditionNote('');
      setStartPrice('');
      setBuyItNowPrice('');
      setEstimatedValue('');
      setValueNote('');
    }
  }, [isOpen, item]);

  if (!isOpen) return null;

  // Handle files selection
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    setNewFiles((prev) => [...prev, ...fileArray]);
    const previews = fileArray.map((file) => URL.createObjectURL(file));
    setNewFilePreviews((prev) => [...prev, ...previews]);
  };

  const removeNewFile = (index: number) => {
    URL.revokeObjectURL(newFilePreviews[index]);
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setNewFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Trigger Gemini AI Image Analysis
  const handleGeminiAnalysis = async () => {
    if (newFiles.length === 0) {
      setError('Bitte wählen Sie zuerst mindestens ein Foto für die KI-Analyse aus.');
      return;
    }

    setError(null);
    setAiSuccessMessage(null);
    setIsAnalyzing(true);

    try {
      const result: ItemDetailsAnalysis = await api.analyzeImages(newFiles);

      // Auto-fill all fields from analysis result
      if (result.name) setName(result.name);
      if (result.category) setCategory(result.category);
      if (result.era) setEra(result.era);
      if (result.origin) setOrigin(result.origin);
      if (result.material) setMaterial(result.material);
      if (result.dimensions) setDimensions(result.dimensions);
      if (result.condition) setCondition(result.condition);
      if (result.description) setDescription(result.description);
      if (result.context) setContext(result.context);

      // Book fields
      if (result.author) setAuthor(result.author);
      if (result.publisher) setPublisher(result.publisher);
      if (result.publicationYear) setPublicationYear(result.publicationYear);
      if (result.edition) setEdition(result.edition);
      if (result.language) setLanguage(result.language);
      if (result.weight) setWeight(result.weight);

      // eBay fields
      if (result.ebayTitle) setEbayTitle(result.ebayTitle);
      if (result.ebayCategory) setEbayCategory(result.ebayCategory);
      if (result.ebayCondition) setEbayCondition(result.ebayCondition);
      if (result.ebayConditionNote) setEbayConditionNote(result.ebayConditionNote);
      if (result.startPrice) setStartPrice(String(result.startPrice));
      if (result.buyItNowPrice) setBuyItNowPrice(String(result.buyItNowPrice));

      // Estimated value & notes
      if (result.estimatedValue) setEstimatedValue(String(result.estimatedValue));
      if (result.valueNote) setValueNote(result.valueNote);

      // Auto-switch to book tab if category is book
      if (result.category === 'Buch' || result.author) {
        setActiveTab('book');
      }

      setAiSuccessMessage(
        '✨ Gemini-Analyse erfolgreich! Alle relevanten Merkmale wurden extrahiert und in das Formular eingetragen.'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'KI-Analyse fehlgeschlagen.';
      setError(`Fehler bei der KI-Analyse: ${msg}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Bitte geben Sie einen Namen für das Objekt ein.');
      setActiveTab('basic');
      return;
    }

    setIsSaving(true);
    setSavingProgress('Objekt wird gespeichert...');

    try {
      const payload: Partial<Item> = {
        name: trimmedName,
        inventoryNumber: inventoryNumber.trim() || null,
        category: category || null,
        era: era || null,
        origin: origin.trim() || null,
        material: material.trim() || null,
        dimensions: dimensions.trim() || null,
        condition: condition || null,
        weight: weight.trim() || null,
        locationId: locationId || null,
        acquisitionDate: acquisitionDate || null,
        description: description.trim() || null,
        context: context.trim() || null,
        author: author.trim() || null,
        publisher: publisher.trim() || null,
        publicationYear: publicationYear.trim() || null,
        edition: edition.trim() || null,
        language: language.trim() || null,
        ebayTitle: ebayTitle.trim() || null,
        ebayCategory: ebayCategory.trim() || null,
        ebayCondition: ebayCondition.trim() || null,
        ebayConditionNote: ebayConditionNote.trim() || null,
        startPrice: startPrice ? parseFloat(startPrice) : null,
        buyItNowPrice: buyItNowPrice ? parseFloat(buyItNowPrice) : null,
      };

      let savedItem: Item;

      if (isEditMode && persistedItem) {
        savedItem = await api.updateItem(persistedItem.id, payload);
      } else {
        savedItem = await api.createItem(payload);
        setPersistedItem(savedItem);
      }

      // Upload newly added photos
      if (newFiles.length > 0) {
        setSavingProgress(`Fotos werden hochgeladen (0 / ${newFiles.length})...`);
        const filesToUpload = [...newFiles];
        const previewsToRevoke = [...newFilePreviews];

        for (let i = 0; i < filesToUpload.length; i++) {
          setSavingProgress(`Foto ${i + 1} von ${filesToUpload.length} wird hochgeladen...`);
          // If first photo of an item with no prior photos, mark as primary
          const hasPriorPhotos = Boolean(
            persistedItem?.photos && persistedItem.photos.length > 0
          );
          const isPrimary = !hasPriorPhotos && i === 0;
          await api.uploadPhoto(savedItem.id, filesToUpload[i], isPrimary);

          // Update remaining state so retry on partial failure only processes remaining files
          const uploadedPreview = previewsToRevoke[i];
          if (uploadedPreview) URL.revokeObjectURL(uploadedPreview);
          setNewFiles((prev) => prev.filter((_, idx) => idx !== 0));
          setNewFilePreviews((prev) => prev.filter((_, idx) => idx !== 0));
        }
      }

      // Only add appraisal if new item (!isEditMode) OR if valuation value/note changed from latest appraisal
      const latestAppraisal = (isEditMode && persistedItem?.appraisals && persistedItem.appraisals.length > 0)
        ? persistedItem.appraisals[persistedItem.appraisals.length - 1]
        : null;

      const parsedVal = parseFloat(estimatedValue);
      const hasValuation = !isNaN(parsedVal) && parsedVal > 0;
      const isNewAppraisalNeeded =
        hasValuation &&
        (!isEditMode ||
          !latestAppraisal ||
          latestAppraisal.value !== parsedVal ||
          (latestAppraisal.note || '').trim() !== valueNote.trim());

      if (isNewAppraisalNeeded) {
        try {
          await api.addAppraisal(savedItem.id, {
            value: parsedVal,
            currency: 'EUR',
            note: valueNote.trim() || (isEditMode ? 'Aktualisierter Schätzwert' : 'Schätzwert bei Anlage erfasst'),
          });
        } catch (appraisalErr) {
          console.warn('Appraisal record failed to save:', appraisalErr);
        }
      }

      // Refresh complete item with all relations
      setSavingProgress('Objektdaten werden aktualisiert...');
      const fullItem = await api.getItem(savedItem.id);

      onSaved(fullItem);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Speichern fehlgeschlagen.';
      setError(msg);
    } finally {
      setIsSaving(false);
      setSavingProgress('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-hidden">
      <div
        className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[calc(100dvh-1rem)] sm:h-auto sm:max-h-[92vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-900 text-white flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 flex-1">
            <div className="p-2 bg-slate-800 rounded-lg text-slate-200 flex-shrink-0">
              <Sparkles className="w-5 h-5 text-slate-300" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-xl font-serif font-bold tracking-tight truncate">
                {isEditMode ? 'Objekt bearbeiten' : 'Neues Objekt erfassen'}
              </h2>
              <p className="text-xs text-slate-400 truncate">
                {isEditMode ? persistedItem?.name || name : 'Fotos hochladen, mit KI scannen oder manuell erfassen'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
            title="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI & Photo Banner Section */}
        <div className="p-3.5 sm:p-6 bg-slate-50 border-b border-slate-200 space-y-3 sm:space-y-4 flex-shrink-0">
          {/* Photo Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors flex flex-col sm:flex-row items-center justify-between gap-4 ${
              dragActive
                ? 'border-slate-900 bg-slate-100'
                : 'border-slate-300 hover:border-slate-500 bg-white'
            }`}
          >
            <div className="flex items-center space-x-3 text-left">
              <div className="p-3 bg-slate-100 rounded-lg text-slate-700">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Fotos hochladen &amp; per Drag-and-Drop ablegen
                </p>
                <p className="text-xs text-slate-500">
                  JPG, PNG, WebP bis 10MB (mehrere Fotos möglich)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
              >
                Fotos auswählen
              </button>

              {/* Prominent Gemini AI Scan Button */}
              <button
                type="button"
                onClick={handleGeminiAnalysis}
                disabled={newFiles.length === 0 || isAnalyzing}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-medium rounded-lg shadow-sm transition-all duration-150 transform active:scale-98"
                title={
                  newFiles.length === 0
                    ? 'Wählen Sie Fotos aus, um die KI-Analyse zu starten'
                    : '1-Klick Analyse mit Google Gemini'
                }
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                    <span>Gemini analysiert...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-300" />
                    <span>Mit KI analysieren (Gemini)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* New Photo Previews Strip */}
          {newFilePreviews.length > 0 && (
            <div className="flex items-center gap-3 overflow-x-auto py-2">
              {newFilePreviews.map((url, idx) => (
                <div key={idx} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-slate-200 shadow-sm flex-shrink-0 bg-slate-100">
                  <img src={url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeNewFile(idx)}
                    className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-md opacity-90 hover:opacity-100 transition-opacity"
                    title="Foto entfernen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {idx === 0 && !isEditMode && (
                    <span className="absolute bottom-0 inset-x-0 bg-slate-900/90 text-[9px] text-white font-medium text-center py-0.5">
                      Hauptfoto
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Existing Photos in Edit Mode */}
          {isEditMode && persistedItem?.photos && persistedItem.photos.length > 0 && (
            <div className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Bereits gespeicherte Fotos:</span>{' '}
              {persistedItem.photos.length} Fotos (weitere können über den Detail-Dialog verwaltet werden)
            </div>
          )}

          {/* AI Success Banner */}
          {aiSuccessMessage && (
            <div className="flex items-start space-x-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium animate-fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 mt-0.5" />
              <span>{aiSuccessMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="flex items-start space-x-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-3 sm:px-6 flex-shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'basic'
                ? 'border-slate-900 text-slate-900 bg-slate-50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Basisdaten &amp; Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'text'
                ? 'border-slate-900 text-slate-900 bg-slate-50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Texte &amp; Geschichte</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('book')}
            className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'book'
                ? 'border-slate-900 text-slate-900 bg-slate-50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Buchdaten</span>
            {category === 'Buch' && (
              <span className="w-2 h-2 rounded-full bg-slate-700 inline-block" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ebay')}
            className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'ebay'
                ? 'border-slate-900 text-slate-900 bg-slate-50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>eBay &amp; Werte</span>
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form id="item-form" onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 overscroll-contain">
          {/* TAB 1: Basisdaten & Details */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Objektname <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="z.B. Biedermeier Schreibsekretär Kirschbaum"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Inventarnummer
                  </label>
                  <input
                    type="text"
                    value={inventoryNumber}
                    onChange={(e) => setInventoryNumber(e.target.value)}
                    placeholder="Auto (z.B. INV-0042)"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Kategorie
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Epoche
                  </label>
                  <select
                    value={era}
                    onChange={(e) => setEra(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                  >
                    {ERAS.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Zustand
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                  >
                    {CONDITIONS.map((cond) => (
                      <option key={cond} value={cond}>
                        {cond}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Material
                  </label>
                  <input
                    type="text"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    placeholder="z.B. Kirschbaum massiv, Messing"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Herkunft / Manufaktur
                  </label>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="z.B. Süddeutschland / Meissen"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Standort / Lagerort
                  </label>
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                  >
                    <option value="">Kein Standort zugewiesen</option>
                    {flattenedLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Abmessungen
                  </label>
                  <input
                    type="text"
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                    placeholder="z.B. 120 x 85 x 55 cm"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Gewicht
                  </label>
                  <input
                    type="text"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="z.B. ca. 45 kg"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Erwerbsdatum
                  </label>
                  <input
                    type="date"
                    value={acquisitionDate}
                    onChange={(e) => setAcquisitionDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Beschreibung & Kontext */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Beschreibung
                </label>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detaillierte Beschreibung des Objekts, Besonderheiten, Erhaltungszustand..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Historischer Kontext</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    Epoche, Stilgeschichte, Verwendung
                  </span>
                </label>
                <textarea
                  rows={4}
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Kulturhistorische Einordnung, historische Verwendung und stilistische Merkmale..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Buchdaten */}
          {activeTab === 'book' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 text-xs text-slate-700 mb-2">
                Spezifische Attribute für antike Bücher, Manuskripte, Drucke und Erstausgaben.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Autor / Verfasser
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="z.B. Johann Wolfgang von Goethe"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Verlag / Druckerei
                  </label>
                  <input
                    type="text"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                    placeholder="z.B. Cotta'sche Verlagsbuchhandlung"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Erscheinungsjahr
                  </label>
                  <input
                    type="text"
                    value={publicationYear}
                    onChange={(e) => setPublicationYear(e.target.value)}
                    placeholder="z.B. 1808"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Auflage / Band
                  </label>
                  <input
                    type="text"
                    value={edition}
                    onChange={(e) => setEdition(e.target.value)}
                    placeholder="z.B. 1. Auflage, Band 1 & 2"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Sprache
                  </label>
                  <input
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    placeholder="z.B. Deutsch (Frakturschrift)"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: eBay & Schätzwerte */}
          {activeTab === 'ebay' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Schätzwert (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={estimatedValue}
                    onChange={(e) => setEstimatedValue(e.target.value)}
                    placeholder="z.B. 850"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Notiz zum Schätzwert
                  </label>
                  <input
                    type="text"
                    value={valueNote}
                    onChange={(e) => setValueNote(e.target.value)}
                    placeholder="z.B. Auktionshaus Lempertz Schätzung"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  eBay Verkaufs-Vorbereitung
                </h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      eBay Angebotstitel (max. 80 Zeichen)
                    </label>
                    <input
                      type="text"
                      maxLength={80}
                      value={ebayTitle}
                      onChange={(e) => setEbayTitle(e.target.value)}
                      placeholder="z.B. Antiker Biedermeier Sekretär Kirschbaum um 1830 restauriert"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                    />
                    <span className="text-[11px] text-slate-400 block text-right mt-0.5">
                      {ebayTitle.length} / 80 Zeichen
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        eBay Kategorie
                      </label>
                      <input
                        type="text"
                        value={ebayCategory}
                        onChange={(e) => setEbayCategory(e.target.value)}
                        placeholder="z.B. Antiquitäten & Kunst > Möbel > Biedermeier"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        eBay Zustand
                      </label>
                      <select
                        value={ebayCondition}
                        onChange={(e) => setEbayCondition(e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                      >
                        <option value="">Auswählen...</option>
                        {EBAY_CONDITIONS.map((cond) => (
                          <option key={cond} value={cond}>
                            {cond}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      eBay Zustandsbeschreibung
                    </label>
                    <input
                      type="text"
                      value={ebayConditionNote}
                      onChange={(e) => setEbayConditionNote(e.target.value)}
                      placeholder="z.B. Altersgemäße Patina, wohnfertig restauriert, Schlüssel vorhanden"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Startpreis (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={startPrice}
                        onChange={(e) => setStartPrice(e.target.value)}
                        placeholder="z.B. 1.00"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Sofort-Kaufen-Preis (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={buyItNowPrice}
                        onChange={(e) => setBuyItNowPrice(e.target.value)}
                        placeholder="z.B. 950.00"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Modal Footer */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            {savingProgress && (
              <span className="flex items-center space-x-1.5 text-slate-800">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{savingProgress}</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3 sm:px-4 py-2 text-slate-700 hover:text-slate-900 text-xs sm:text-sm font-medium transition-colors"
            >
              Abbrechen
            </button>

            <button
              type="submit"
              form="item-form"
              disabled={isSaving || isAnalyzing}
              className="flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs sm:text-sm font-medium rounded-lg shadow-sm transition-colors"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Speichern...</span>
                </>
              ) : (
                <span>{isEditMode ? 'Änderungen speichern' : 'Objekt anlegen'}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemFormModal;
