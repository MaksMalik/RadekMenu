import type { ProductWithWeight, ComputedMacros } from '../types/openfoodfacts';

/**
 * Computes macros for a single product at a given weight.
 * Formula: (weight / 100) * value_per_100g
 * Returns unrounded floating-point values.
 */
export function computeProductMacros(product: ProductWithWeight): ComputedMacros {
  const factor = product.weight / 100;
  return {
    kcal: factor * product.energy_kcal_100g,
    protein: factor * product.proteins_100g,
    carbs: factor * product.carbohydrates_100g,
    fats: factor * product.fat_100g,
  };
}

/**
 * Computes total macros for a list of products with weights.
 * Sums individual product macros.
 * Returns unrounded floating-point values.
 */
export function computeTotalMacros(products: ProductWithWeight[]): ComputedMacros {
  const total: ComputedMacros = { kcal: 0, protein: 0, carbs: 0, fats: 0 };
  for (const product of products) {
    const macros = computeProductMacros(product);
    total.kcal += macros.kcal;
    total.protein += macros.protein;
    total.carbs += macros.carbs;
    total.fats += macros.fats;
  }
  return total;
}

/**
 * Rounds all macro values to nearest integer.
 * Applied once at final meal creation time.
 */
export function roundMacros(macros: ComputedMacros): ComputedMacros {
  return {
    kcal: Math.round(macros.kcal),
    protein: Math.round(macros.protein),
    carbs: Math.round(macros.carbs),
    fats: Math.round(macros.fats),
  };
}
