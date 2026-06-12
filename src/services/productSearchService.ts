import type { OFFProduct, OFFRawProduct, OFFApiResponse } from '../types/openfoodfacts';

export interface SearchOptions {
  signal?: AbortSignal;
}

/**
 * Builds the Open Food Facts search URL with correct parameters.
 */
export function buildSearchUrl(query: string): string {
  const encoded = encodeURIComponent(query);
  return `https://pl.openfoodfacts.org/cgi/search.pl?search_keywords=${encoded}&action=process&json=true&page_size=20`;
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

  return {
    id: product._id || product.code || '',
    name,
    brand: product.brands || '',
    energy_kcal_100g: energy,
    proteins_100g: proteins,
    carbohydrates_100g: carbs,
    fat_100g: fat,
  };
}

/**
 * Searches the Open Food Facts Polish API for products matching the query.
 * - Constructs URL with correct parameters
 * - Filters out products missing required nutritional fields
 * - Returns max 20 products
 * - Throws on network error
 * - Aborts via AbortSignal
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
    throw new Error('Nie udało się połączyć. Sprawdź połączenie internetowe.');
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
