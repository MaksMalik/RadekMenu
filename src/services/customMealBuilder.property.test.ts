// Feature: custom-meals-openfoodfacts
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { buildMeal } from './customMealBuilder';
import type { OFFProduct, SelectedProduct } from '../types/openfoodfacts';
import type { MealType } from '../types';

const mealTypeArb = fc.constantFrom<MealType>(
  'Śniadanie', 'II Śniadanie', 'Obiad', 'Przekąska', 'Kolacja'
);

const offProductArb: fc.Arbitrary<OFFProduct> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  brand: fc.string({ maxLength: 30 }),
  energy_kcal_100g: fc.float({ min: 0, max: 2000, noNaN: true }),
  proteins_100g: fc.float({ min: 0, max: 2000, noNaN: true }),
  carbohydrates_100g: fc.float({ min: 0, max: 2000, noNaN: true }),
  fat_100g: fc.float({ min: 0, max: 2000, noNaN: true }),
  servingSize: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 20 })),
  servingQuantityG: fc.oneof(fc.constant(null), fc.float({ min: 1, max: 500, noNaN: true })),
});

const weightUnitArb = fc.constantFrom<'g' | 'ml'>('g', 'ml');

const selectedProductArb: fc.Arbitrary<SelectedProduct> = fc.record({
  product: offProductArb,
  weight: fc.integer({ min: 1, max: 5000 }),
  unit: weightUnitArb,
});

describe('customMealBuilder property tests', () => {
  // Property 8: Single-product meal title defaults to product name
  // **Validates: Requirements 4.2**
  it('Property 8: single-product meal with empty title defaults to product name', () => {
    fc.assert(
      fc.property(selectedProductArb, mealTypeArb, (sp, mealType) => {
        const meal = buildMeal({
          title: '', // empty title
          mealType,
          selectedProducts: [sp],
        });
        expect(meal.title).toBe(sp.product.name);
      }),
      { numRuns: 200 }
    );
  });

  // Property 9: Selected product default weight
  // **Validates: Requirements 2.1**
  it('Property 9: default weight for newly selected product is 100g', () => {
    fc.assert(
      fc.property(offProductArb, (product) => {
        // Simulating how the UI creates a SelectedProduct
        const selected: SelectedProduct = { product, weight: 100, unit: 'g' };
        expect(selected.weight).toBe(100);
      }),
      { numRuns: 200 }
    );
  });

  it('buildMeal produces a valid Meal object with rounded macros', () => {
    fc.assert(
      fc.property(
        fc.array(selectedProductArb, { minLength: 1, maxLength: 5 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        mealTypeArb,
        (products, title, mealType) => {
          const meal = buildMeal({ title, mealType, selectedProducts: products });

          expect(meal.id).toBeTruthy();
          expect(meal.type).toBe(mealType);
          expect(meal.title).toBe(title);
          expect(meal.eaten).toBe(false);
          expect(meal.instruction).toBe('');
          expect(meal.ingredients.length).toBe(products.length);
          // Macros should be integers (rounded)
          expect(Number.isInteger(meal.kcal)).toBe(true);
          expect(Number.isInteger(meal.protein)).toBe(true);
          expect(Number.isInteger(meal.carbs)).toBe(true);
          expect(Number.isInteger(meal.fats)).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });
});
