import { useState, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from './Modal';
import { ProductSearchInput } from './ProductSearchInput';
import { SelectedProductRow } from './SelectedProductRow';
import { useUser } from '../context/UserContext';
import { buildMeal } from '../services/customMealBuilder';
import { computeProductMacros, computeTotalMacros, roundMacros } from '../utils/macroCalculator';
import type { MealType } from '../types';
import type { OFFProduct, SelectedProduct } from '../types/openfoodfacts';

const MEAL_TYPES: MealType[] = ['Śniadanie', 'II Śniadanie', 'Obiad', 'Przekąska', 'Kolacja'];

interface CustomMealModalProps {
  date: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CustomMealModal({ date, isOpen, onClose }: CustomMealModalProps) {
  const { dispatch } = useUser();

  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [title, setTitle] = useState('');
  const [mealType, setMealType] = useState<MealType>('Śniadanie');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedProducts([]);
      setTitle('');
      setMealType('Śniadanie');
    }
  }, [isOpen]);

  // Auto-set title when single product is selected and title is empty
  useEffect(() => {
    if (selectedProducts.length === 1 && !title) {
      setTitle(selectedProducts[0].product.name);
    }
  }, [selectedProducts, title]);

  // Compute running total macros
  const totalMacros = useMemo(() => {
    const productsWithWeight = selectedProducts.map((sp) => ({
      energy_kcal_100g: sp.product.energy_kcal_100g,
      proteins_100g: sp.product.proteins_100g,
      carbohydrates_100g: sp.product.carbohydrates_100g,
      fat_100g: sp.product.fat_100g,
      weight: sp.weight,
    }));
    return roundMacros(computeTotalMacros(productsWithWeight));
  }, [selectedProducts]);

  const handleSelectProduct = (product: OFFProduct) => {
    setSelectedProducts((prev) => [...prev, { product, weight: 100 }]);
  };

  const handleWeightChange = (index: number, weight: number) => {
    setSelectedProducts((prev) =>
      prev.map((sp, i) => (i === index ? { ...sp, weight } : sp))
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
    <Modal isOpen={isOpen} onClose={onClose} title="Stwórz posiłek z produktów">
      <div className="space-y-4">
        {/* Meal type selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Typ posiłku</label>
          <div className="flex flex-wrap gap-2">
            {MEAL_TYPES.map((mt) => (
              <button
                key={mt}
                type="button"
                onClick={() => setMealType(mt)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  mealType === mt
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {mt}
              </button>
            ))}
          </div>
        </div>

        {/* Title input */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nazwa posiłku</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="np. Śniadanie proteinowe"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {/* Product search */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Szukaj produktu</label>
          <ProductSearchInput onSelect={handleSelectProduct} />
        </div>

        {/* Selected products */}
        {selectedProducts.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Wybrane produkty ({selectedProducts.length})
            </label>
            <div className="space-y-2">
              {selectedProducts.map((sp, index) => (
                <SelectedProductRow
                  key={`${sp.product.id}-${index}`}
                  product={sp.product}
                  weight={sp.weight}
                  macros={computeProductMacros({
                    energy_kcal_100g: sp.product.energy_kcal_100g,
                    proteins_100g: sp.product.proteins_100g,
                    carbohydrates_100g: sp.product.carbohydrates_100g,
                    fat_100g: sp.product.fat_100g,
                    weight: sp.weight,
                  })}
                  onWeightChange={(w) => handleWeightChange(index, w)}
                  onRemove={() => handleRemoveProduct(index)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Running macro totals */}
        {selectedProducts.length > 0 && (
          <div className="flex justify-between items-center px-3 py-2 bg-emerald-50 rounded-xl">
            <span className="text-sm font-medium text-emerald-800">Suma:</span>
            <div className="flex gap-3 text-sm text-emerald-700">
              <span>{totalMacros.kcal} kcal</span>
              <span>B: {totalMacros.protein}g</span>
              <span>W: {totalMacros.carbs}g</span>
              <span>T: {totalMacros.fats}g</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          Anuluj
        </button>
        <button
          onClick={handleConfirm}
          disabled={!isValid}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Dodaj posiłek
        </button>
      </div>
    </Modal>
  );
}
