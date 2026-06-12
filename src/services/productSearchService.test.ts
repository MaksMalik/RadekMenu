import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  searchProducts,
  buildSearchUrl,
  buildLegacySearchUrl,
  buildProductUrl,
  mapProduct,
} from './productSearchService';

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
      const parsed = new URL(url);

      expect(parsed.hostname).toBe('search.openfoodfacts.org');
      expect(parsed.pathname).toBe('/search');
      expect(parsed.searchParams.get('q')).toBe('jogurt');
      expect(parsed.searchParams.get('langs')).toBe('pl,en');
      expect(parsed.searchParams.get('page_size')).toBe('20');
      expect(parsed.searchParams.get('fields')).toContain('nutriments');
    });

    it('encodes special characters in query', () => {
      const url = buildSearchUrl('mleko 3.2%');
      expect(new URL(url).searchParams.get('q')).toBe('mleko 3.2%');
    });

    it('constructs legacy keyword search URL for fallback', () => {
      const url = buildLegacySearchUrl('jogurt');
      expect(url).toContain('world.openfoodfacts.org');
      expect(url).toContain('search_terms=jogurt');
      expect(url).toContain('search_simple=1');
      expect(url).toContain('json=1');
      expect(url).toContain('sort_by=unique_scans_n');
    });

    it('constructs barcode product URL', () => {
      const url = buildProductUrl('5901234123457');
      expect(url).toContain('/api/v2/product/5901234123457');
      expect(url).toContain('fields=');
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
        servingSize: null,
        servingQuantityG: null,
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

    it('maps Search-a-licious brands arrays', () => {
      const raw = {
        code: '4316268627979',
        product_name: 'Skyr naturel',
        brands: ['Skyr', 'Isey Skyr'],
        nutriments: {
          'energy-kcal_100g': 62,
          proteins_100g: 11,
          carbohydrates_100g: 4,
          fat_100g: 0.2,
        },
      };

      const result = mapProduct(raw);
      expect(result).toMatchObject({
        id: '4316268627979',
        brand: 'Skyr, Isey Skyr',
      });
    });

    it('parses string nutriments and converts energy from kJ when kcal is missing', () => {
      const raw = {
        code: '1',
        product_name: 'Produkt',
        nutriments: {
          energy_100g: '418.4',
          proteins_100g: '10',
          carbohydrates_100g: '20',
          fat_100g: '5',
        },
      };
      const result = mapProduct(raw);
      expect(result).not.toBeNull();
      expect(result!.energy_kcal_100g).toBe(100);
      expect(result!.proteins_100g).toBe(10);
    });
  });

  describe('searchProducts', () => {
    it('handles network error with appropriate message', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

      await expect(searchProducts('produkt-bez-lokalnego-trafienia')).rejects.toThrow();
    });

    it('falls back to local products when remote API fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

      const result = await searchProducts('skyr');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].brand).toBe('Baza Smakołysz');
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
        vi.fn().mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              hits: [
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

    it('fetches barcode endpoint for numeric barcode queries', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 1,
            product: {
              code: '5901234123457',
              product_name: 'Barcode product',
              brands: 'Brand',
              nutriments: {
                'energy-kcal_100g': 100,
                proteins_100g: 5,
                carbohydrates_100g: 10,
                fat_100g: 3,
              },
            },
          }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await searchProducts('5901234123457');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/product/5901234123457'),
        expect.any(Object)
      );
      expect(result[0].name).toBe('Barcode product');
    });

    it('falls back to legacy search when Search-a-licious has no usable hits', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ hits: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              count: 1,
              products: [
                {
                  _id: 'legacy-1',
                  product_name: 'Legacy product',
                  brands: 'Brand',
                  nutriments: {
                    'energy-kcal_100g': 100,
                    proteins_100g: 5,
                    carbohydrates_100g: 10,
                    fat_100g: 3,
                  },
                },
              ],
            }),
        });
      vi.stubGlobal('fetch', fetchMock);

      const result = await searchProducts('test');
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('search.openfoodfacts.org/search'),
        expect.any(Object)
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('world.openfoodfacts.org/cgi/search.pl'),
        expect.any(Object)
      );
      expect(result[0].name).toBe('Legacy product');
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
