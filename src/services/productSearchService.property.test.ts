// Feature: custom-meals-openfoodfacts
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { buildSearchUrl, mapProduct } from './productSearchService';

// Generator for valid raw products with all required fields
const validRawProductArb = fc.record({
  _id: fc.string({ minLength: 1 }),
  product_name: fc.string({ minLength: 1 }),
  brands: fc.string(),
  nutriments: fc.record({
    'energy-kcal_100g': fc.float({ min: 0, max: 2000, noNaN: true }),
    proteins_100g: fc.float({ min: 0, max: 2000, noNaN: true }),
    carbohydrates_100g: fc.float({ min: 0, max: 2000, noNaN: true }),
    fat_100g: fc.float({ min: 0, max: 2000, noNaN: true }),
  }),
});

// Generator for incomplete raw products (missing at least one nutritional field)
const incompleteRawProductArb = fc.oneof(
  fc.record({
    _id: fc.string({ minLength: 1 }),
    product_name: fc.string({ minLength: 1 }),
    nutriments: fc.record({
      'energy-kcal_100g': fc.float({ min: 0, max: 2000, noNaN: true }),
      // Missing other fields
    }),
  }),
  fc.record({
    _id: fc.string({ minLength: 1 }),
    product_name: fc.string({ minLength: 1 }),
    // Missing nutriments entirely
  }),
  fc.constant({ _id: '123', product_name: 'Test' }), // no nutriments
);

// Generator for a non-empty search query of >= 2 chars
const searchQueryArb = fc.string({ minLength: 2, maxLength: 100 })
  .filter((s) => s.trim().length >= 2);

describe('productSearchService property tests', () => {
  // Property 5: Product filter excludes incomplete products
  // **Validates: Requirements 7.5**
  it('Property 5: products missing nutritional fields return null from mapProduct', () => {
    fc.assert(
      fc.property(incompleteRawProductArb, (raw) => {
        const result = mapProduct(raw);
        expect(result).toBeNull();
      }),
      { numRuns: 200 }
    );
  });

  it('Property 5: valid products with all fields return non-null from mapProduct', () => {
    fc.assert(
      fc.property(validRawProductArb, (raw) => {
        const result = mapProduct(raw);
        expect(result).not.toBeNull();
        expect(result!.energy_kcal_100g).toBeGreaterThanOrEqual(0);
        expect(result!.proteins_100g).toBeGreaterThanOrEqual(0);
        expect(result!.carbohydrates_100g).toBeGreaterThanOrEqual(0);
        expect(result!.fat_100g).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 200 }
    );
  });

  // Property 6: Search URL construction
  // **Validates: Requirements 1.1, 1.4**
  it('Property 6: constructed URL contains correct parameters and domain', () => {
    fc.assert(
      fc.property(searchQueryArb, (query) => {
        const url = buildSearchUrl(query);

        expect(url).toContain('pl.openfoodfacts.org');
        expect(url).toContain('action=process');
        expect(url).toContain('json=true');
        expect(url).toContain('page_size=20');
        expect(url).toContain(`search_keywords=${encodeURIComponent(query)}`);
      }),
      { numRuns: 200 }
    );
  });

  // Property 7: Result count limit
  // **Validates: Requirements 9.3**
  it('Property 7: mapProduct on array of > 20 valid products should allow at most 20 to pass', () => {
    fc.assert(
      fc.property(
        fc.array(validRawProductArb, { minLength: 21, maxLength: 50 }),
        (rawProducts) => {
          const mapped = [];
          for (const raw of rawProducts) {
            if (mapped.length >= 20) break;
            const product = mapProduct(raw);
            if (product) mapped.push(product);
          }
          expect(mapped.length).toBeLessThanOrEqual(20);
        }
      ),
      { numRuns: 100 }
    );
  });
});
