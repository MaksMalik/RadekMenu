import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchProducts, buildSearchUrl, mapProduct } from './productSearchService';

describe('productSearchService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('buildSearchUrl', () => {
    it('constructs URL with correct domain and parameters', () => {
      const url = buildSearchUrl('jogurt');
      expect(url).toBe(
        'https://pl.openfoodfacts.org/cgi/search.pl?search_keywords=jogurt&action=process&json=true&page_size=20'
      );
    });

    it('encodes special characters in query', () => {
      const url = buildSearchUrl('mleko 3.2%');
      expect(url).toContain('search_keywords=mleko%203.2%25');
    });
  });

  describe('mapProduct', () => {
    it('returns OFFProduct for valid raw product', () => {
      const raw = {
        _id: '123',
        product_name: 'Jogurt naturalny',
        brands: 'Danone',
        nutriments: {
          'energy-kcal_100g': 61,
          proteins_100g: 4.5,
          carbohydrates_100g: 6.2,
          fat_100g: 1.8,
        },
      };
      const result = mapProduct(raw);
      expect(result).toEqual({
        id: '123',
        name: 'Jogurt naturalny',
        brand: 'Danone',
        energy_kcal_100g: 61,
        proteins_100g: 4.5,
        carbohydrates_100g: 6.2,
        fat_100g: 1.8,
      });
    });

    it('returns null for product missing nutriments', () => {
      expect(mapProduct({ _id: '1', product_name: 'X' })).toBeNull();
    });

    it('returns null for product missing energy field', () => {
      const raw = {
        _id: '1',
        product_name: 'X',
        nutriments: {
          proteins_100g: 4,
          carbohydrates_100g: 5,
          fat_100g: 2,
        },
      };
      expect(mapProduct(raw)).toBeNull();
    });

    it('returns null for product with negative nutritional values', () => {
      const raw = {
        _id: '1',
        product_name: 'X',
        nutriments: {
          'energy-kcal_100g': -1,
          proteins_100g: 4,
          carbohydrates_100g: 5,
          fat_100g: 2,
        },
      };
      expect(mapProduct(raw)).toBeNull();
    });

    it('returns null for product without a name', () => {
      const raw = {
        _id: '1',
        nutriments: {
          'energy-kcal_100g': 100,
          proteins_100g: 4,
          carbohydrates_100g: 5,
          fat_100g: 2,
        },
      };
      expect(mapProduct(raw)).toBeNull();
    });

    it('uses product_name_pl when available', () => {
      const raw = {
        _id: '1',
        product_name: 'Yogurt',
        product_name_pl: 'Jogurt',
        brands: 'Brand',
        nutriments: {
          'energy-kcal_100g': 100,
          proteins_100g: 4,
          carbohydrates_100g: 5,
          fat_100g: 2,
        },
      };
      const result = mapProduct(raw);
      expect(result!.name).toBe('Jogurt');
    });
  });

  describe('searchProducts', () => {
    it('handles network error with appropriate message', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

      await expect(searchProducts('jogurt')).rejects.toThrow();
    });

    it('handles timeout via abort signal', async () => {
      const controller = new AbortController();
      controller.abort();

      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')));

      await expect(
        searchProducts('jogurt', { signal: controller.signal })
      ).rejects.toThrow();
    });

    it('treats malformed JSON response as zero results', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.reject(new Error('Invalid JSON')),
        })
      );

      const result = await searchProducts('test');
      expect(result).toEqual([]);
    });

    it('filters out products missing nutritional fields', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              count: 2,
              products: [
                {
                  _id: '1',
                  product_name: 'Good',
                  brands: 'Brand',
                  nutriments: {
                    'energy-kcal_100g': 100,
                    proteins_100g: 5,
                    carbohydrates_100g: 10,
                    fat_100g: 3,
                  },
                },
                {
                  _id: '2',
                  product_name: 'Bad',
                  nutriments: { 'energy-kcal_100g': 100 }, // missing fields
                },
              ],
            }),
        })
      );

      const result = await searchProducts('test');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Good');
    });

    it('returns at most 20 products', async () => {
      const products = Array.from({ length: 30 }, (_, i) => ({
        _id: String(i),
        product_name: `Product ${i}`,
        brands: 'Brand',
        nutriments: {
          'energy-kcal_100g': 100,
          proteins_100g: 5,
          carbohydrates_100g: 10,
          fat_100g: 3,
        },
      }));

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ count: 30, products }),
        })
      );

      const result = await searchProducts('test');
      expect(result.length).toBeLessThanOrEqual(20);
    });
  });
});
