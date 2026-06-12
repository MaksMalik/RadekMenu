import type { OFFProduct, OFFRawProduct, OFFApiResponse } from '../types/openfoodfacts';

export interface SearchOptions {
  signal?: AbortSignal;
}

const API_FIELDS = 'code,product_name,product_name_pl,brands,nutriments,serving_size,serving_quantity';

/**
 * Builds the Open Food Facts search URL with correct parameters.
 * Uses search_terms for better relevance, sorts by popularity.
 */
export function buildSearchUrl(query: string): string {
  const encoded = encodeURIComponent(query);
  return `https://pl.openfoodfacts.org/cgi/search.pl?search_terms=${encoded}&action=process&json=true&page_size=20&sort_by=unique_scans_n&fields=${API_FIELDS}`;
}

/**
 * Parses serving size string to extract grams.
 * Handles formats like "30g", "250ml", "30 g", "1 sztuka (25g)", etc.
 */
export function parseServingSize(servingSize?: string, servingQuantity?: number): number | null {
  // If numeric serving_quantity is provided, use it directly
  if (typeof servingQuantity === 'number' && servingQuantity > 0) {
    return servingQuantity;
  }

  if (!servingSize) return null;

  // Try to extract number followed by g or ml
  // Match patterns like "30g", "30 g", "250ml", "250 ml"
  const match = servingSize.match(/(\d+(?:[.,]\d+)?)\s*(?:g|ml)/i);
  if (match) {
    return parseFloat(match[1].replace(',', '.'));
  }

  // Try to extract from parentheses: "1 sztuka (25g)"
  const parenMatch = servingSize.match(/\((\d+(?:[.,]\d+)?)\s*(?:g|ml)\)/i);
  if (parenMatch) {
    return parseFloat(parenMatch[1].replace(',', '.'));
  }

  return null;
}

/**
 * Validates and maps raw API product data to OFFProduct.
 * Returns null for products missing required fields.
 */
export function mapProduct(raw: unknown): OFFProduct | null {
  if (!raw || typeof raw !== 'object') return null;

  const product = raw as OFFRawProduct;
  const nutriments = product.nutriments;

  if (!nutriments) return null;

  const energy = nutriments['energy-kcal_100g'];
  const proteins = nutriments.proteins_100g;
  const carbs = nutriments.carbohydrates_100g;
  const fat = nutriments.fat_100g;

  // All four nutritional fields must be present and non-negative numbers
  if (
    typeof energy !== 'number' || energy < 0 ||
    typeof proteins !== 'number' || proteins < 0 ||
    typeof carbs !== 'number' || carbs < 0 ||
    typeof fat !== 'number' || fat < 0
  ) {
    return null;
  }

  const name = product.product_name_pl || product.product_name || '';
  if (!name) return null;

  const servingQuantityG = parseServingSize(product.serving_size, product.serving_quantity);

  return {
    id: product._id || product.code || '',
    name,
    brand: product.brands || '',
    energy_kcal_100g: energy,
    proteins_100g: proteins,
    carbohydrates_100g: carbs,
    fat_100g: fat,
    servingSize: product.serving_size || null,
    servingQuantityG,
  };
}

/**
 * Searches the Open Food Facts Polish API for products matching the query.
 * - Uses search_terms for better relevance
 * - Sorts by popularity (unique_scans_n)
 * - Filters out products missing required nutritional fields
 * - Returns max 20 products
 * - Throws on network error (NOT on abort)
 */
export async function searchProducts(
  query: string,
  options?: SearchOptions
): Promise<OFFProduct[]> {
  const url = buildSearchUrl(query);

  const response = await fetch(url, {
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error('NETWORK_ERROR');
  }

  let data: OFFApiResponse;
  try {
    data = await response.json();
  } catch {
    // Malformed response treated as zero results
    return [];
  }

  if (!data || !Array.isArray(data.products)) {
    return [];
  }

  const mapped: OFFProduct[] = [];
  for (const raw of data.products) {
    if (mapped.length >= 20) break;
    const product = mapProduct(raw);
    if (product) {
      mapped.push(product);
    }
  }

  return mapped;
}
