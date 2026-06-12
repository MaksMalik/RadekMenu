import type { OFFProduct, OFFRawProduct, OFFApiResponse } from '../types/openfoodfacts';
import { searchLocalProducts } from '../data/productDatabase';

export interface SearchOptions {
  signal?: AbortSignal;
  forceFitatu?: boolean;
}

const IS_TEST = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

const API_FIELDS = 'code,product_name,product_name_pl,brands,nutriments,serving_size,serving_quantity';
const MAX_PRODUCTS = 20;

/**
 * Builds the Search-a-licious URL recommended for full-text Open Food Facts search.
 */
export function buildSearchUrl(query: string): string {
  const params = new URLSearchParams({
    q: query,
    langs: 'pl,en',
    page_size: String(MAX_PRODUCTS),
    fields: API_FIELDS,
  });
  return `https://search.openfoodfacts.org/search?${params.toString()}`;
}

/**
 * Builds the legacy Open Food Facts keyword search URL.
 * Kept as a fallback while Search-a-licious is still beta.
 */
export function buildLegacySearchUrl(query: string): string {
  const encoded = encodeURIComponent(query);
  return `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encoded}&search_simple=1&action=process&json=1&page_size=${MAX_PRODUCTS}&sort_by=unique_scans_n&fields=${API_FIELDS}`;
}

export function buildProductUrl(barcode: string): string {
  const encoded = encodeURIComponent(barcode);
  return `https://world.openfoodfacts.org/api/v2/product/${encoded}?fields=${API_FIELDS}`;
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

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readNutriment(nutriments: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = readNumber(nutriments[key]);
    if (value !== null) return value;
  }
  return null;
}

function readText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .join(', ');
  }
  return '';
}

/**
 * Validates and maps raw API product data to OFFProduct.
 * Returns null for products missing required fields.
 */
export function mapProduct(raw: unknown): OFFProduct | null {
  if (!raw || typeof raw !== 'object') return null;

  const product = raw as OFFRawProduct;
  const nutriments = (product.nutriments ?? {}) as Record<string, unknown>;

  if (!nutriments) return null;

  const energyKcal = readNutriment(nutriments, ['energy-kcal_100g', 'energy_kcal_100g']);
  const energyKj = readNutriment(nutriments, ['energy_100g', 'energy-kj_100g']);
  const energy = energyKcal ?? (energyKj !== null ? energyKj / 4.184 : null);
  const proteins = readNutriment(nutriments, ['proteins_100g', 'proteins']);
  const carbs = readNutriment(nutriments, ['carbohydrates_100g', 'carbohydrates']);
  const fat = readNutriment(nutriments, ['fat_100g', 'fat']);

  // All four nutritional fields must be present and non-negative numbers
  if (
    energy === null || energy < 0 ||
    proteins === null || proteins < 0 ||
    carbs === null || carbs < 0 ||
    fat === null || fat < 0
  ) {
    return null;
  }

  const name = readText(product.product_name_pl) || readText(product.product_name);
  if (!name) return null;

  const servingQuantityG = parseServingSize(product.serving_size, product.serving_quantity);

  return {
    id: readText(product._id) || readText(product.code),
    name,
    brand: readText(product.brands),
    energy_kcal_100g: Math.round(energy * 10) / 10,
    proteins_100g: proteins,
    carbohydrates_100g: carbs,
    fat_100g: fat,
    servingSize: product.serving_size || null,
    servingQuantityG,
  };
}

function isAbortError(error: unknown, signal?: AbortSignal): boolean {
  return signal?.aborted === true || (error instanceof DOMException && error.name === 'AbortError');
}

function isBarcode(query: string): boolean {
  return /^\d{8,14}$/.test(query.replace(/\s+/g, ''));
}

function mergeProducts(primary: OFFProduct[], secondary: OFFProduct[]): OFFProduct[] {
  const seen = new Set<string>();
  const merged: OFFProduct[] = [];

  for (const product of [...primary, ...secondary]) {
    const key = `${product.id || ''}|${product.name.toLowerCase()}|${product.brand.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(product);
    if (merged.length >= MAX_PRODUCTS) break;
  }

  return merged;
}

async function fetchSearchALiciousProducts(query: string, options?: SearchOptions): Promise<OFFProduct[]> {
  const response = await fetch(buildSearchUrl(query), {
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error('NETWORK_ERROR');
  }

  let data: { hits?: unknown[] };
  try {
    data = await response.json();
  } catch {
    return [];
  }

  if (!data || !Array.isArray(data.hits)) {
    return [];
  }

  const mapped: OFFProduct[] = [];
  for (const raw of data.hits) {
    if (mapped.length >= MAX_PRODUCTS) break;
    const product = mapProduct(raw);
    if (product) {
      mapped.push(product);
    }
  }

  return mapped;
}

async function fetchLegacySearchProducts(query: string, options?: SearchOptions): Promise<OFFProduct[]> {
  const response = await fetch(buildLegacySearchUrl(query), {
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error('NETWORK_ERROR');
  }

  let data: OFFApiResponse;
  try {
    data = await response.json();
  } catch {
    return [];
  }

  if (!data || !Array.isArray(data.products)) {
    return [];
  }

  const mapped: OFFProduct[] = [];
  for (const raw of data.products) {
    if (mapped.length >= MAX_PRODUCTS) break;
    const product = mapProduct(raw);
    if (product) {
      mapped.push(product);
    }
  }

  return mapped;
}

async function fetchFitatuSearchProducts(query: string, options?: SearchOptions): Promise<OFFProduct[]> {
  try {
    const params = new URLSearchParams({ SearchTerm: query });
    const response = await fetch(`/api/foods-search?${params.toString()}`, {
      signal: options?.signal,
    });
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    if (Array.isArray(data)) {
      return data as OFFProduct[];
    }
    return [];
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    console.error("Fitatu query failed:", error);
    return [];
  }
}

async function fetchSearchProducts(query: string, options?: SearchOptions): Promise<OFFProduct[]> {
  let fitatuProducts: OFFProduct[] = [];
  if (!IS_TEST || options?.forceFitatu) {
    try {
      fitatuProducts = await fetchFitatuSearchProducts(query, options);
    } catch (error) {
      if (isAbortError(error, options?.signal)) {
        throw error;
      }
    }
  }

  let offProducts: OFFProduct[] = [];
  let searchError: unknown = null;

  try {
    offProducts = await fetchSearchALiciousProducts(query, options);
  } catch (error) {
    if (isAbortError(error, options?.signal)) {
      throw error;
    }
    searchError = error;
  }

  if (offProducts.length === 0) {
    try {
      offProducts = await fetchLegacySearchProducts(query, options);
    } catch (error) {
      if (isAbortError(error, options?.signal)) {
        throw error;
      }
      if (fitatuProducts.length === 0) {
        throw searchError || error;
      }
    }
  }

  return [...fitatuProducts, ...offProducts];
}

async function fetchBarcodeProduct(barcode: string, options?: SearchOptions): Promise<OFFProduct[]> {
  const response = await fetch(buildProductUrl(barcode), {
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error('NETWORK_ERROR');
  }

  let data: { status?: number; product?: OFFRawProduct };
  try {
    data = await response.json();
  } catch {
    return [];
  }

  if (data.status !== 1 || !data.product) {
    return [];
  }

  const product = mapProduct(data.product);
  return product ? [product] : [];
}

/**
 * Searches local nutrition data plus Open Food Facts for products matching the query.
 * - Uses Search-a-licious full-text search, then legacy keyword search as fallback
 * - Uses API v2 product lookup for barcode-like queries
 * - Filters out products missing required nutritional fields
 * - Returns max 20 deduplicated products
 * - Throws on network error only when no local fallback exists
 */
export async function searchProducts(
  query: string,
  options?: SearchOptions
): Promise<OFFProduct[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const localProducts = searchLocalProducts(trimmed, MAX_PRODUCTS);
  const barcode = trimmed.replace(/\s+/g, '');

  try {
    const remoteProducts = isBarcode(barcode)
      ? await fetchBarcodeProduct(barcode, options)
      : await fetchSearchProducts(trimmed, options);

    return isBarcode(barcode)
      ? mergeProducts(remoteProducts, localProducts)
      : mergeProducts(localProducts, remoteProducts);
  } catch (error) {
    if (isAbortError(error, options?.signal)) {
      throw error;
    }
    if (localProducts.length > 0) {
      return localProducts;
    }
    throw error;
  }
}
