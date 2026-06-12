// Feature: custom-meals-openfoodfacts
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeProductMacros, computeTotalMacros, roundMacros } from './macroCalculator';

// Generator for a product with valid nutritional data
const productWithWeightArb = fc.record({
  energy_kcal_100g: fc.float({ min: 0, max: 2000, noNaN: true }),
  proteins_100g: fc.float({ min: 0, max: 2000, noNaN: true }),
  carbohydrates_100g: fc.float({ min: 0, max: 2000, noNaN: true }),
  fat_100g: fc.float({ min: 0, max: 2000, noNaN: true }),
  weight: fc.float({ min: 0.1, max: 5000, noNaN: true }),
});

describe('macroCalculator property tests', () => {
  // Property 1: Macro computation formula correctness
  // **Validates: Requirements 2.2, 2.4, 6.1**
  it('Property 1: each computed macro equals (weight / 100) * value_per_100g', () => {
    fc.assert(
      fc.property(productWithWeightArb, (product) => {
        const result = computeProductMacros(product);
        const factor = product.weight / 100;

        expect(result.kcal).toBeCloseTo(factor * product.energy_kcal_100g, 5);
        expect(result.protein).toBeCloseTo(factor * product.proteins_100g, 5);
        expect(result.carbs).toBeCloseTo(factor * product.carbohydrates_100g, 5);
        expect(result.fats).toBeCloseTo(factor * product.fat_100g, 5);
      }),
      { numRuns: 200 }
    );
  });

  // Property 2: Total macro is sum of individual macros
  // **Validates: Requirements 3.2, 6.1**
  it('Property 2: total macros equal sum of individual product macros', () => {
    fc.assert(
      fc.property(
        fc.array(productWithWeightArb, { minLength: 1, maxLength: 10 }),
        (products) => {
          const total = computeTotalMacros(products);
          let expectedKcal = 0;
          let expectedProtein = 0;
          let expectedCarbs = 0;
          let expectedFats = 0;

          for (const p of products) {
            const individual = computeProductMacros(p);
            expectedKcal += individual.kcal;
            expectedProtein += individual.protein;
            expectedCarbs += individual.carbs;
            expectedFats += individual.fats;
          }

          expect(total.kcal).toBeCloseTo(expectedKcal, 5);
          expect(total.protein).toBeCloseTo(expectedProtein, 5);
          expect(total.carbs).toBeCloseTo(expectedCarbs, 5);
          expect(total.fats).toBeCloseTo(expectedFats, 5);
        }
      ),
      { numRuns: 200 }
    );
  });

  // Property 3: Rounding accuracy (within 1 unit of exact)
  // **Validates: Requirements 6.2, 6.3**
  it('Property 3: rounded macros are within 1 unit of exact values', () => {
    fc.assert(
      fc.property(
        fc.array(productWithWeightArb, { minLength: 1, maxLength: 10 }),
        (products) => {
          const total = computeTotalMacros(products);
          const rounded = roundMacros(total);

          expect(Math.abs(rounded.kcal - total.kcal)).toBeLessThanOrEqual(0.5);
          expect(Math.abs(rounded.protein - total.protein)).toBeLessThanOrEqual(0.5);
          expect(Math.abs(rounded.carbs - total.carbs)).toBeLessThanOrEqual(0.5);
          expect(Math.abs(rounded.fats - total.fats)).toBeLessThanOrEqual(0.5);
        }
      ),
      { numRuns: 200 }
    );
  });
});
