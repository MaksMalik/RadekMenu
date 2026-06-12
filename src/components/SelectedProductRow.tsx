import { Trash2 } from 'lucide-react';
import type { OFFProduct, ComputedMacros, WeightUnit } from '../types/openfoodfacts';

interface SelectedProductRowProps {
  product: OFFProduct;
  weight: number;
  unit: WeightUnit;
  macros: ComputedMacros;
  onWeightChange: (weight: number) => void;
  onUnitChange: (unit: WeightUnit) => void;
  onRemove: () => void;
}

export function SelectedProductRow({
  product,
  weight,
  unit,
  macros,
  onWeightChange,
  onUnitChange,
  onRemove,
}: SelectedProductRowProps) {
  // Check if serving size already contains the units/portions to avoid double wrapping
  const servingLabel = product.servingSize 
    ? product.servingSize 
    : `${product.servingQuantityG}g`;

  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 rounded-2xl space-y-2.5 transition-all">
      {/* Top row: name + remove */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{product.name}</p>
          {product.brand && (
            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{product.brand}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 rounded-xl text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors shrink-0"
          aria-label="Usuń produkt"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Middle row: weight input + unit toggle + serving shortcut */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            value={weight}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val > 0) onWeightChange(val);
            }}
            className="w-16 px-2 py-1 text-sm text-center border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          
          {/* Unit toggle: g / ml */}
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => onUnitChange('g')}
              className={`px-2 py-1 text-xs font-semibold transition-colors ${
                unit === 'g'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              g
            </button>
            <button
              type="button"
              onClick={() => onUnitChange('ml')}
              className={`px-2 py-1 text-xs font-semibold transition-colors ${
                unit === 'ml'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              ml
            </button>
          </div>
        </div>

        {/* Serving size shortcut button */}
        {product.servingQuantityG && product.servingQuantityG > 0 && (
          <button
            type="button"
            onClick={() => onWeightChange(product.servingQuantityG!)}
            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-950/45 transition-colors whitespace-nowrap"
            title={servingLabel}
          >
            {servingLabel}
          </button>
        )}
      </div>

      {/* Bottom row: macros */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400 pt-0.5 border-t border-slate-100 dark:border-slate-800/40">
        <span className="text-slate-700 dark:text-slate-300 font-semibold">{Math.round(macros.kcal)} kcal</span>
        <span>B: {macros.protein.toFixed(1)}g</span>
        <span>W: {macros.carbs.toFixed(1)}g</span>
        <span>T: {macros.fats.toFixed(1)}g</span>
      </div>
    </div>
  );
}
