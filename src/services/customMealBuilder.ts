import type { Meal, MealType } from '../types';
import type { SelectedProduct } from '../types/openfoodfacts';
import { computeTotalMacros, roundMacros } from '../utils/macroCalculator';
import { formatIngredients } from '../utils/ingredientFormatter';

export interface BuildMealParams {
  title: string;
  mealType: MealType;
  selectedProducts: SelectedProduct[];
}

/**
 * Builds a complete Meal object from selected products.
 * - Computes and rounds macros
 * - Formats ingredients as "{name} - {weight}g"
 * - Uses crypto.randomUUID() for id
 * - Sets instruction to empty string, eaten to false
 * - For single-product meals with empty title, defaults to product name
 */
export function buildMeal(params: BuildMealParams): Meal {
  const { mealType, selectedProducts } = params;
  let { title } = params;

  // For single-product meals, default title to product name if not provided
  if (!title && selectedProducts.length === 1) {
    title = selectedProducts[0].product.name;
  }

  // Compute macros
  const productsWithWeight = selectedProducts.map((sp) => ({
    energy_kcal_100g: sp.product.energy_kcal_100g,
    proteins_100g: sp.product.proteins_100g,
    carbohydrates_100g: sp.product.carbohydrates_100g,
    fat_100g: sp.product.fat_100g,
    weight: sp.weight,
  }));

  const totalMacros = computeTotalMacros(productsWithWeight);
  const rounded = roundMacros(totalMacros);

  // Format ingredients
  const ingredientEntries = selectedProducts.map((sp) => ({
    name: sp.product.name,
    weight: sp.weight,
  }));
  const ingredients = formatIngredients(ingredientEntries);

  return {
    id: crypto.randomUUID(),
    type: mealType,
    title,
    kcal: rounded.kcal,
    protein: rounded.protein,
    carbs: rounded.carbs,
    fats: rounded.fats,
    ingredients,
    instruction: '',
    eaten: false,
  };
}
