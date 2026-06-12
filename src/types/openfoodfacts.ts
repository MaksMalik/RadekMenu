/** Product as returned from Open Food Facts API (mapped and validated) */
export interface OFFProduct {
  id: string;
  name: string;
  brand: string;
  energy_kcal_100g: number;
  proteins_100g: number;
  carbohydrates_100g: number;
  fat_100g: number;
  /** Serving size string from API, e.g. "30g", "250ml", "1 sztuka (25g)" */
  servingSize: string | null;
  /** Serving quantity in grams (parsed from serving_size or serving_quantity) */
  servingQuantityG: number | null;
}

/** Unit for weight input */
export type WeightUnit = 'g' | 'ml';

/** A product selected by the user with a specified weight and unit */
export interface SelectedProduct {
  product: OFFProduct;
  weight: number; // in the selected unit
  unit: WeightUnit;
}

/** Computed macro values for display or saving */
export interface ComputedMacros {
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
}

/** Input for macro calculation: nutritional values per 100g + weight in grams */
export interface ProductWithWeight {
  energy_kcal_100g: number;
  proteins_100g: number;
  carbohydrates_100g: number;
  fat_100g: number;
  weight: number; // grams (already converted from ml if needed)
}

/** Entry for ingredient formatting */
export interface IngredientEntry {
  name: string;
  weight: number; // grams
  unit: WeightUnit;
}

/** Raw API response structure from Open Food Facts */
export interface OFFApiResponse {
  count: number;
  page: number;
  page_size: number;
  products: OFFRawProduct[];
}

/** Raw product from Open Food Facts API (before validation/mapping) */
export interface OFFRawProduct {
  _id?: string;
  code?: string;
  product_name?: string;
  product_name_pl?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number;
  nutriments?: {
    'energy-kcal_100g'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
}
