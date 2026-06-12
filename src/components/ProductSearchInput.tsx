import { Search, Loader2 } from 'lucide-react';
import { useProductSearch } from '../hooks/useProductSearch';
import type { OFFProduct } from '../types/openfoodfacts';

interface ProductSearchInputProps {
  onSelect: (product: OFFProduct) => void;
}

export function ProductSearchInput({ onSelect }: ProductSearchInputProps) {
  const { query, setQuery, results, loading, error } = useProductSearch();

  return (
    <div className="space-y-2">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj produktu (np. jogurt, chleb)..."
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-spin" />
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">
          {error}
        </p>
      )}

      {/* No results message */}
      {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-2">
          Nie znaleziono produktów dla &quot;{query}&quot;
        </p>
      )}

      {/* Results list */}
      {results.length > 0 && (
        <ul className="max-h-48 overflow-y-auto space-y-1 border border-slate-100 rounded-xl p-1">
          {results.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => onSelect(product)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 transition-colors"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-slate-800 truncate">
                    {product.name}
                  </span>
                  {product.brand && (
                    <span className="text-xs text-slate-400 shrink-0">
                      {product.brand}
                    </span>
                  )}
                </div>
                <div className="flex gap-3 mt-0.5 text-xs text-slate-500">
                  <span>{product.energy_kcal_100g} kcal</span>
                  <span>B: {product.proteins_100g}g</span>
                  <span>W: {product.carbohydrates_100g}g</span>
                  <span>T: {product.fat_100g}g</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
