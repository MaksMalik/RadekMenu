// Feature: app-improvements, Property 2: Structured Meal JSON round-trip
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateMeal, MEAL_TYPES } from './geminiLogic';
import type { Meal } from '../types';

/**
 * Generates a non-empty string that survives `validateMeal`'s
 * non-empty-after-trim check by prefixing a non-whitespace character.
 */
const nonEmptyString = fc.string().map((s) => `a${s}`);

/**
 * Finite number >= 0. The `+ 0` normalizes a potential `-0` to `+0` so the
 * JSON round trip (which serializes `-0` as `"0"`) preserves field equality.
 */
const nonNegativeFinite = fc
  .double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true })
  .map((n) => n + 0);

/**
 * Arbitrary producing valid `Meal` objects (including the client-only
 * `id`/`eaten` fields) that satisfy `validateMeal` on the validated subset.
 */
const validMealArb: fc.Arbitrary<Meal> = fc.record(
  {
    id: fc.uuid(),
    type: fc.constantFrom(...MEAL_TYPES),
    title: nonEmptyString,
    kcal: nonNegativeFinite,
    protein: nonNegativeFinite,
    carbs: nonNegativeFinite,
    fats: nonNegativeFinite,
    ingredients: fc.array(fc.string(), { minLength: 1 }),
    instruction: nonEmptyString,
    tip: fc.option(fc.string(), { nil: undefined }),
    eaten: fc.boolean(),
  },
  { requiredKeys: ['id', 'type', 'title', 'kcal', 'protein', 'carbs', 'fats', 'ingredients', 'instruction', 'eaten'] },
);

/** Returns the validated subset of a meal, excluding client-only id/eaten. */
function validatedFields(meal: Record<string, unknown>) {
  const { id: _id, eaten: _eaten, ...rest } = meal;
  return rest;
}

describe('Property 2: Structured Meal JSON round-trip', () => {
  // Validates: Requirements 7.1, 7.2
  it('round-trips any valid meal through JSON.parse(JSON.stringify(...)) preserving validity and fields', () => {
    fc.assert(
      fc.property(validMealArb, (meal) => {
        // Single JSON.parse step on the serialized meal (Requirement 7.2).
        const roundTripped = JSON.parse(JSON.stringify(meal));

        // The parsed object passes strict validation.
        expect(validateMeal(roundTripped)).toBe(true);

        // Field equality holds, excluding client-only id/eaten.
        expect(validatedFields(roundTripped)).toEqual(validatedFields(meal as unknown as Record<string, unknown>));
      }),
      { numRuns: 200 },
    );
  });
});
