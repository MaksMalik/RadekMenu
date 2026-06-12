import { useState, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from './Modal';
import { ProductSearchInput } from './ProductSearchInput';
import { SelectedProductRow } from './SelectedProductRow';
import { useUser } from '../context/UserContext';
import { buildMeal } from '../services/customMealBuilder';
import { computeProductMacros, computeTotalMacros, roundMacros } from '../utils/macroCalculator';
import type { MealType } from '../types';
import type { OFFProduct, SelectedProduct, WeightUnit } from '../types/openfoodfacts';

const MEAL_TYPES: MealType[] = ['Śniadanie', 'II Śniadanie', 'Obiad', 'Przekąska', 'Kolacja'];

interface CustomMealModalProps {
  date: string;
  isOpen: boolean;
  onClose: () => void;
  defaultMealType?: MealType;
}

export function CustomMealModal({ date, isOpen, onClose, defaultMealType }: CustomMealModalProps) {
  const { dispatch } = useUser();

  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [title, setTitle] = useState('');
  const [mealType, setMealType] = useState<MealType>(defaultMealType || 'Śniadanie');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedProducts([]);
      setTitle('');
      setMealType(defaultMealType || 'Śniadanie');
    }
  }, [isOpen, defaultMealType]);

  // Auto-set title when single product is selected and title is empty
  useEffect(() => {
    if (selectedProducts.length === 1 && !title) {
      setTitle(selectedProducts[0].product.name);
    }
  }, [selectedProducts, title]);

  // Compute running total macros (convert ml to g assuming density ~1)
  const totalMacros = useMemo(() => {
    const productsWithWeight = selectedProducts.map((sp) => ({
      energy_kcal_100g: sp.product.energy_kcal_100g,
      proteins_100g: sp.product.proteins_100g,
      carbohydrates_100g: sp.product.carbohydrates_100g,
      fat_100g: sp.product.fat_100g,
      weight: sp.weight, // ml ≈ g for liquids
    }));
    return roundMacros(computeTotalMacros(productsWithWeight));
  }, [selectedProducts]);

  const handleSelectProduct = (product: OFFProduct) => {
    // Default weight: use serving size if available, otherwise 100
    const defaultWeight = product.servingQuantityG && product.servingQuantityG > 0
      ? product.servingQuantityG
      : 100;
    setSelectedProducts((prev) => [...prev, { product, weight: defaultWeight, unit: 'g' }]);
  };

  const handleWeightChange = (index: number, weight: number) => {
    setSelectedProducts((prev) =>
      prev.map((sp, i) => (i === index ? { ...sp, weight } : sp))
    );
  };

  const handleUnitChange = (index: number, unit: WeightUnit) => {
    setSelectedProducts((prev) =>
      prev.map((sp, i) => (i === index ? { ...sp, unit } : sp))
    );
  };

  const handleRemoveProduct = (index: number) => {
    setSelectedProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const isValid =
    selectedProducts.length > 0 &&
    title.trim() !== '' &&
    selectedProducts.every((sp) => sp.weight > 0);

  const handleConfirm = () => {
    if (!isValid) return;

    const meal = buildMeal({
      title: title.trim(),
      mealType,
      selectedProducts,
    });

    dispatch({ type: 'ADD_MEAL', date, meal });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Stwórz posiłek z produktów" size="full">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-h-[72vh] overflow-y-auto pr-1">
        {/* Left Column: Search (Span 6 on md+) */}
        <div className="md:col-span-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Wyszukaj produkt w bazie</label>
            <ProductSearchInput onSelect={handleSelectProduct} />
          </div>
        </div>

        {/* Right Column: Selection Details (Span 6 on md+) */}
        <div className="md:col-span-6 space-y-4 md:border-l md:border-slate-100 md:dark:border-slate-800 md:pl-6">
          {/* Meal type selector — only show when no default is preselected */}
          {!defaultMealType && (
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Typ posiłku</label>
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPES.map((mt) => (
                  <button
                    key={mt}
                    type="button"
                    onClick={() => setMealType(mt)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      mealType === mt
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
                    }`}
                  >
                    {mt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title input */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Nazwa posiłku</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="np. Śniadanie proteinowe, Sałatka z kurczakiem..."
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Selected products */}
          {selectedProducts.length > 0 ? (
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Wybrane produkty ({selectedProducts.length})
              </label>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {selectedProducts.map((sp, index) => (
                  <SelectedProductRow
                    key={`${sp.product.id}-${index}`}
                    product={sp.product}
                    weight={sp.weight}
                    unit={sp.unit}
                    macros={computeProductMacros({
                      energy_kcal_100g: sp.product.energy_kcal_100g,
                      proteins_100g: sp.product.proteins_100g,
                      carbohydrates_100g: sp.product.carbohydrates_100g,
                      fat_100g: sp.product.fat_100g,
                      weight: sp.weight,
                    })}
                    onWeightChange={(w) => handleWeightChange(index, w)}
                    onUnitChange={(u) => handleUnitChange(index, u)}
                    onRemove={() => handleRemoveProduct(index)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">Kliknij produkt po lewej stronie, aby go dodać</p>
            </div>
          )}

          {/* Running macro totals */}
          {selectedProducts.length > 0 && (
            <div className="sticky bottom-0 flex justify-between items-center px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">Razem:</span>
              <div className="flex gap-3 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <span>{totalMacros.kcal} kcal</span>
                <span>B: {totalMacros.protein}g</span>
                <span>W: {totalMacros.carbs}g</span>
                <span>T: {totalMacros.fats}g</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={onClose}
          className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Anuluj
        </button>
        <button
          onClick={handleConfirm}
          disabled={!isValid}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Dodaj posiłek
        </button>
      </div>
    </Modal>
  );
}
