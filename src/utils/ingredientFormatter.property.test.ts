// Feature: custom-meals-openfoodfacts
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatIngredient, parseIngredient, formatIngredients } from './ingredientFormatter';

// Generator for a valid ingredient name (non-empty, doesn't contain " - ")
const ingredientNameArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter((s) => !s.includes(' - ') && s.trim().length > 0);

// Generator for a valid positive integer weight
const weightArb = fc.integer({ min: 1, max: 5000 });

describe('ingredientFormatter property tests', () => {
  // Property 4: Ingredient formatting round-trip
  // **Validates: Requirements 8.1, 8.2**
  it('Property 4: formatting then parsing recovers original name and weight', () => {
    fc.assert(
      fc.property(ingredientNameArb, weightArb, (name, weight) => {
        const formatted = formatIngredient({ name, weight });
        const parsed = parseIngredient(formatted);

        expect(parsed).not.toBeNull();
        expect(parsed!.name).toBe(name);
        expect(parsed!.weight).toBe(weight);
      }),
      { numRuns: 200 }
    );
  });

  // Additional: formatting list round-trip
  it('formatIngredients produces array of formatted strings that all parse back', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ name: ingredientNameArb, weight: weightArb }),
          { minLength: 1, maxLength: 10 }
        ),
        (entries) => {
          const formatted = formatIngredients(entries);
          expect(formatted.length).toBe(entries.length);

          for (let i = 0; i < entries.length; i++) {
            const parsed = parseIngredient(formatted[i]);
            expect(parsed).not.toBeNull();
            expect(parsed!.name).toBe(entries[i].name);
            expect(parsed!.weight).toBe(entries[i].weight);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});
