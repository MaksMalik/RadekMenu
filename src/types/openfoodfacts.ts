/** Product as returned from Open Food Facts API (mapped and validated) */
export interface OFFProduct {
  id: string;
  name: string;
  brand: string;
  energy_kcal_100g: number;
  proteins_100g: number;
  carbohydrates_100g: number;
  fat_100g: number;
}

/** A product selected by the user with a specified weight */
export interface SelectedProduct {
  product: OFFProduct;
  weight: number; // grams, > 0, default 100
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
  weight: number; // grams, must be > 0
}

/** Entry for ingredient formatting */
export interface IngredientEntry {
  name: string;
  weight: number; // grams
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
  nutriments?: {
    'energy-kcal_100g'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
}
