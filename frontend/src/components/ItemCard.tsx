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
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Gut':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Befriedigend':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Schlecht':
      case 'Restaurierungsbedürftig':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-stone-50 text-stone-600 border-stone-200';
    }
  };

  return (
    <article
      onClick={() => onSelect(item)}
      className="group relative bg-white rounded-2xl border border-stone-200 hover:border-amber-400 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer flex flex-col hover:-translate-y-1"
    >
      {/* Photo Container */}
      <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden flex items-center justify-center">
        {primaryPhoto && !imgError ? (
          <img
            src={getPhotoUrl(primaryPhoto.path)}
            alt={item.name}
            onError={() => setImgError(true)}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-stone-400 p-4 text-center">
            <ImageIcon className="w-12 h-12 stroke-[1.25] text-stone-300 mb-1" />
            <span className="text-xs font-medium text-stone-400">Kein Foto</span>
          </div>
        )}

        {/* Inventory Number Badge */}
        {item.inventoryNumber && (
          <div className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-md text-amber-200 font-mono text-[11px] font-semibold px-2 py-0.5 rounded-lg shadow-sm border border-stone-700/50">
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
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-stone-800 text-xs font-medium px-2.5 py-0.5 rounded-lg shadow-sm border border-stone-200">
            {item.category}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Era & Condition row */}
          <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
            {item.era && (
              <span className="inline-flex items-center text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                <Calendar className="w-3 h-3 mr-1 text-amber-700" />
                {item.era}
              </span>
            )}
            {item.condition && (
              <span
                className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md border ${getConditionBadgeClass(
                  item.condition
                )}`}
              >
                {item.condition}
              </span>
            )}
          </div>

          {/* Name */}
          <h3 className="font-bold text-stone-900 text-base group-hover:text-amber-800 transition-colors line-clamp-1 mb-1">
            {item.name}
          </h3>

          {/* Material / Origin */}
          {(item.material || item.origin) && (
            <p className="text-xs text-stone-500 line-clamp-1 mb-2">
              {[item.material, item.origin].filter(Boolean).join(' • ')}
            </p>
          )}

          {/* Description Snippet */}
          {item.description && (
            <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed mb-3">
              {item.description}
            </p>
          )}
        </div>

        {/* Footer Area: Location & Price */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between mt-auto">
          {/* Location */}
          <div className="flex items-center text-xs text-stone-500 truncate max-w-[55%]">
            <MapPin className="w-3.5 h-3.5 mr-1 text-amber-700 flex-shrink-0" />
            <span className="truncate">{item.location?.name || 'Kein Standort'}</span>
          </div>

          {/* Valuation / Price */}
          {formattedPrice ? (
            <div className="text-right">
              <span className="block text-[10px] text-stone-400 font-medium uppercase tracking-wider">
                {displayPrice?.label}
              </span>
              <span className="font-bold text-sm text-stone-900 font-mono">
                {formattedPrice}
              </span>
            </div>
          ) : (
            <div className="text-right text-[11px] text-stone-400 italic">
              Nicht geschätzt
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default ItemCard;
