import React, { useState } from 'react';
import { MapPin, Image as ImageIcon, Calendar } from 'lucide-react';
import type { Item } from '../types';
import { getPhotoUrl } from '../utils/formatters';


export interface ItemCardProps {
  item: Item;
  onSelect: (item: Item) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onSelect }) => {
  const [imgError, setImgError] = useState(false);

  // Find primary photo or first photo
  const primaryPhoto = item.photos?.find((p) => p.isPrimary) || item.photos?.[0];

  // Determine displayed valuation / price
  const latestAppraisal = item.appraisals && item.appraisals.length > 0
    ? item.appraisals[item.appraisals.length - 1]
    : null;

  const displayPrice = latestAppraisal
    ? {
        amount: latestAppraisal.value,
        currency: latestAppraisal.currency || 'EUR',
        label: 'Schätzwert',
      }
    : item.buyItNowPrice
    ? {
        amount: item.buyItNowPrice,
        currency: 'EUR',
        label: 'Sofort-Kauf',
      }
    : item.startPrice
    ? {
        amount: item.startPrice,
        currency: 'EUR',
        label: 'Startpreis',
      }
    : null;

  const formattedPrice = displayPrice
    ? new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: displayPrice.currency,
        maximumFractionDigits: 0,
      }).format(displayPrice.amount)
    : null;

  // Condition color mapping
  const getConditionBadgeClass = (condition?: string | null) => {
    switch (condition) {
      case 'Sehr gut':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Gut':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Befriedigend':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Schlecht':
      case 'Restaurierungsbedürftig':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <article
      onClick={() => onSelect(item)}
      className="group relative bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer flex flex-col hover:-translate-y-0.5"
    >
      {/* Photo Container */}
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden flex items-center justify-center">
        {primaryPhoto && !imgError ? (
          <img
            src={getPhotoUrl(primaryPhoto.path)}
            alt={item.name}
            onError={() => setImgError(true)}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
            <ImageIcon className="w-12 h-12 stroke-[1.25] text-slate-300 mb-1" />
            <span className="text-xs font-medium text-slate-400">Kein Foto</span>
          </div>
        )}

        {/* Inventory Number Badge */}
        {item.inventoryNumber && (
          <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md text-slate-100 font-mono text-[10px] font-semibold px-2 py-0.5 rounded shadow-sm border border-slate-700/50">
            {item.inventoryNumber}
          </div>
        )}

        {/* Photo Count Pill */}
        {item.photos && item.photos.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center space-x-1">
            <ImageIcon className="w-3 h-3 inline" />
            <span>{item.photos.length} Fotos</span>
          </div>
        )}

        {/* Category Pill */}
        {item.category && (
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md text-slate-800 text-[11px] font-medium px-2 py-0.5 rounded shadow-sm border border-slate-200">
            {item.category}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Era & Condition row */}
          <div className="flex items-center flex-wrap gap-1.5 mb-2">
            {item.era && (
              <span className="inline-flex items-center text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                <Calendar className="w-3 h-3 mr-1 text-slate-500" />
                {item.era}
              </span>
            )}
            {item.condition && (
              <span
                className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded border ${getConditionBadgeClass(
                  item.condition
                )}`}
              >
                {item.condition}
              </span>
            )}
          </div>

          {/* Name */}
          <h3 className="font-serif font-semibold text-slate-900 text-base group-hover:text-slate-700 transition-colors line-clamp-2 leading-snug mb-1">
            {item.name}
          </h3>

          {/* Material / Origin */}
          {(item.material || item.origin) && (
            <p className="text-xs text-slate-500 line-clamp-1 mb-2">
              {[item.material, item.origin].filter(Boolean).join(' • ')}
            </p>
          )}

          {/* Description Snippet */}
          {item.description && (
            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
              {item.description}
            </p>
          )}
        </div>

        {/* Footer Area: Location & Price */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-auto">
          {/* Location */}
          <div className="flex items-center text-xs text-slate-500 truncate max-w-[55%]">
            <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 flex-shrink-0" />
            <span className="truncate">{item.location?.name || 'Kein Standort'}</span>
          </div>

          {/* Valuation / Price */}
          {formattedPrice ? (
            <div className="text-right">
              <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                {displayPrice?.label}
              </span>
              <span className="font-semibold text-sm text-slate-900 font-mono">
                {formattedPrice}
              </span>
            </div>
          ) : (
            <div className="text-right text-[11px] text-slate-400 italic">
              Nicht geschätzt
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default ItemCard;
