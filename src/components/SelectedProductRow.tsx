import { Trash2 } from 'lucide-react';
import type { OFFProduct, ComputedMacros } from '../types/openfoodfacts';

interface SelectedProductRowProps {
  product: OFFProduct;
  weight: number;
  macros: ComputedMacros;
  onWeightChange: (weight: number) => void;
  onRemove: () => void;
}

export function SelectedProductRow({
  product,
  weight,
  macros,
  onWeightChange,
  onRemove,
}: SelectedProductRowProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl">
      {/* Product info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{product.name}</p>
        <div className="flex gap-2 text-xs text-slate-500 mt-0.5">
          <span>{Math.round(macros.kcal)} kcal</span>
          <span>B: {Math.round(macros.protein)}g</span>
          <span>W: {Math.round(macros.carbs)}g</span>
          <span>T: {Math.round(macros.fats)}g</span>
        </div>
      </div>

      {/* Weight input */}
      <div className="flex items-center gap-1 shrink-0">
        <input
          type="number"
          min={1}
          value={weight}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (val > 0) onWeightChange(val);
          }}
          className="w-16 px-2 py-1 text-sm text-center border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        <span className="text-xs text-slate-500">g</span>
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
        aria-label="Usuń produkt"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
