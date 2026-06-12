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
  return (
    <div className="p-2.5 bg-slate-50 rounded-xl space-y-1.5">
      {/* Top row: name + remove */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800 truncate">{product.name}</p>
          {product.brand && (
            <p className="text-xs text-slate-400 truncate">{product.brand}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
          aria-label="Usuń produkt"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Middle row: weight input + unit toggle + serving shortcut */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          value={weight}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (val > 0) onWeightChange(val);
          }}
          className="w-20 px-2 py-1.5 text-sm text-center border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />

        {/* Unit toggle: g / ml */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => onUnitChange('g')}
            className={`px-2.5 py-1 text-xs font-medium transition-colors ${
              unit === 'g'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            g
          </button>
          <button
            type="button"
            onClick={() => onUnitChange('ml')}
            className={`px-2.5 py-1 text-xs font-medium transition-colors ${
              unit === 'ml'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            ml
          </button>
        </div>

        {/* Serving size shortcut button */}
        {product.servingQuantityG && product.servingQuantityG > 0 && (
          <button
            type="button"
            onClick={() => onWeightChange(product.servingQuantityG!)}
            className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors whitespace-nowrap"
            title={product.servingSize || `${product.servingQuantityG}g`}
          >
            1 porcja ({product.servingSize || `${product.servingQuantityG}g`})
          </button>
        )}
      </div>

      {/* Bottom row: macros */}
      <div className="flex gap-3 text-xs text-slate-500">
        <span>{Math.round(macros.kcal)} kcal</span>
        <span>B: {macros.protein.toFixed(1)}g</span>
        <span>W: {macros.carbs.toFixed(1)}g</span>
        <span>T: {macros.fats.toFixed(1)}g</span>
      </div>
    </div>
  );
}
