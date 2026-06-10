// Feature: app-improvements, Property 1: Strict Meal validation
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateMeal, MEAL_TYPES } from './geminiLogic';

/**
 * Property 1: Strict Meal validation
 * Validates: Requirements 7.3, 7.4
 *
 * `validateMeal` returns true if and only if:
 * - `type` is one of the five recognized MealType values,
 * - `title` and `instruction` are non-empty strings,
 * - `kcal`/`protein`/`carbs`/`fats` are finite numbers >= 0,
 * - `ingredients` is a non-empty array of strings,
 * - and (when present) `tip` is a string.
 */

// A finite, non-negative number generator (kcal/protein/carbs/fats).
const nonNegFinite = fc.double({ min: 0, max: 1e6, noNaN: true });

// Non-empty string generator (after trimming) for title/instruction.
const nonEmptyText = fc
  .string({ minLength: 1, maxLength: 40 })
  .filter((s) => s.trim().length > 0);

// Generator for fully valid meal objects (should be accepted).
const validMealArb = fc.record(
  {
    type: fc.constantFrom(...MEAL_TYPES),
    title: nonEmptyText,
    instruction: nonEmptyText,
    kcal: nonNegFinite,
    protein: nonNegFinite,
    carbs: nonNegFinite,
    fats: nonNegFinite,
    ingredients: fc.array(fc.string(), { minLength: 1, maxLength: 8 }),
    tip: fc.option(fc.string(), { nil: undefined }),
  },
  { requiredKeys: ['type', 'title', 'instruction', 'kcal', 'protein', 'carbs', 'fats', 'ingredients'] },
);

describe('Property 1: Strict Meal validation', () => {
  it('accepts any structurally valid meal', () => {
    fc.assert(
      fc.property(validMealArb, (meal) => {
        expect(validateMeal(meal)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it('rejects meals with an unrecognized type', () => {
    fc.assert(
      fc.property(
        validMealArb,
        fc.string().filter((s) => !(MEAL_TYPES as readonly string[]).includes(s)),
        (meal, badType) => {
          expect(validateMeal({ ...meal, type: badType })).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('rejects meals whose title or instruction is empty/whitespace or non-string', () => {
    const blankOrNonString = fc.oneof(
      fc.constantFrom('', '   ', '\t', '\n'),
      fc.integer(),
      fc.constant(null),
      fc.constant(undefined),
    );
    fc.assert(
      fc.property(validMealArb, blankOrNonString, fc.boolean(), (meal, bad, targetTitle) => {
        const mutated = targetTitle
          ? { ...meal, title: bad }
          : { ...meal, instruction: bad };
        expect(validateMeal(mutated)).toBe(false);
      }),
      { numRuns: 200 },
    );
  });

  it('rejects meals where a macro is negative, non-finite, or non-number', () => {
    const badNumber = fc.oneof(
      fc.double({ min: -1e6, max: -1e-6, noNaN: true }),
      fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
      fc.string(),
      fc.constant(null),
    );
    const macroKey = fc.constantFrom('kcal', 'protein', 'carbs', 'fats') as fc.Arbitrary<
      'kcal' | 'protein' | 'carbs' | 'fats'
    >;
    fc.assert(
      fc.property(validMealArb, macroKey, badNumber, (meal, key, bad) => {
        expect(validateMeal({ ...meal, [key]: bad })).toBe(false);
      }),
      { numRuns: 200 },
    );
  });

  it('rejects meals whose ingredients are empty, not an array, or contain non-strings', () => {
    const badIngredients = fc.oneof(
      fc.constant([]),
      fc.constant('not-an-array'),
      fc.constant(null),
      fc.array(fc.integer(), { minLength: 1 }),
      fc.tuple(fc.string(), fc.integer()),
    );
    fc.assert(
      fc.property(validMealArb, badIngredients, (meal, bad) => {
        expect(validateMeal({ ...meal, ingredients: bad })).toBe(false);
      }),
      { numRuns: 200 },
    );
  });

  it('rejects meals whose tip is present but not a string', () => {
    const nonStringTip = fc.oneof(
      fc.integer(),
      fc.boolean(),
      fc.constant(null),
      fc.array(fc.string()),
      fc.record({ x: fc.integer() }),
    );
    fc.assert(
      fc.property(validMealArb, nonStringTip, (meal, badTip) => {
        expect(validateMeal({ ...meal, tip: badTip })).toBe(false);
      }),
      { numRuns: 200 },
    );
  });

  it('rejects calories/instructions alias objects missing canonical fields', () => {
    fc.assert(
      fc.property(validMealArb, (meal) => {
        const { kcal, instruction, ...rest } = meal;
        // Object carries only the legacy aliases, not the canonical fields.
        const aliased = { ...rest, calories: kcal, instructions: instruction };
        expect(validateMeal(aliased)).toBe(false);
      }),
      { numRuns: 200 },
    );
  });

  it('rejects non-object values', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null), fc.array(fc.anything())),
        (value) => {
          expect(validateMeal(value)).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });
});
