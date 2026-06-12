import { Search, Loader2, RotateCw } from 'lucide-react';
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
          placeholder="Wpisz nazwę produktu (np. jogurt grecki, masło orzechowe)..."
          className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-spin" />
        )}
      </div>

      {/* Helper text */}
      {query.trim().length === 0 && (
        <p className="text-xs text-slate-400 px-1">
          Szukaj po nazwie produktu, marce lub kodzie kreskowym
        </p>
      )}

      {/* Error message with retry */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => {
              // Trigger re-search by toggling query
              const q = query;
              setQuery('');
              setTimeout(() => setQuery(q), 50);
            }}
            className="p-1 rounded hover:bg-red-100 transition-colors"
            aria-label="Spróbuj ponownie"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* No results message */}
      {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-3">
          Nie znaleziono produktów dla &ldquo;{query}&rdquo;. Spróbuj inną nazwę lub markę.
        </p>
      )}

      {/* Results list */}
      {results.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 px-1 mb-1">
            Znaleziono {results.length} {results.length === 1 ? 'produkt' : results.length < 5 ? 'produkty' : 'produktów'}
          </p>
          <ul className="max-h-56 overflow-y-auto space-y-1 border border-slate-100 rounded-xl p-1.5">
            {results.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => onSelect(product)}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-emerald-50 active:bg-emerald-100 transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-slate-800 line-clamp-1">
                      {product.name}
                    </span>
                    {product.brand && (
                      <span className="text-xs text-slate-400 shrink-0 max-w-[100px] truncate">
                        {product.brand}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="font-medium">{product.energy_kcal_100g} kcal</span>
                    <span>B: {product.proteins_100g}g</span>
                    <span>W: {product.carbohydrates_100g}g</span>
                    <span>T: {product.fat_100g}g</span>
                    <span className="text-slate-300">/ 100g</span>
                  </div>
                  {product.servingSize && (
                    <div className="mt-0.5 text-xs text-emerald-600">
                      Porcja: {product.servingSize}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
