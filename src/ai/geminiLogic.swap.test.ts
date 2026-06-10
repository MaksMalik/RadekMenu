// Feature: app-improvements, Property 4: Swap selection picks the best candidate
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { selectSwapResult, isWithinKcalBand, KCAL_BAND } from './geminiLogic';
import type { Meal, MealType } from '../types';

const MEAL_TYPES: MealType[] = ['Śniadanie', 'II Śniadanie', 'Obiad', 'Przekąska', 'Kolacja'];

/** Generates a valid candidate Meal with a controllable kcal value. */
function mealArb(kcalArb: fc.Arbitrary<number>): fc.Arbitrary<Meal> {
  return fc.record({
    id: fc.uuid(),
    type: fc.constantFrom(...MEAL_TYPES),
    title: fc.string({ minLength: 1 }).map((s) => s.trim() || 'posiłek'),
    kcal: kcalArb,
    protein: fc.double({ min: 0, max: 500, noNaN: true }),
    carbs: fc.double({ min: 0, max: 500, noNaN: true }),
    fats: fc.double({ min: 0, max: 500, noNaN: true }),
    ingredients: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
    instruction: fc.constant('Przygotuj posiłek.'),
    eaten: fc.constant(false),
  });
}

/**
 * Reference implementation of the selection spec, used as an independent oracle
 * to compare against `selectSwapResult`.
 */
function expectedIndex(candidates: Meal[], originalKcal: number): number | null {
  if (candidates.length === 0) return null;

  // Earliest in-band candidate.
  for (let i = 0; i < candidates.length; i++) {
    if (isWithinKcalBand(candidates[i].kcal, originalKcal)) {
      return i;
    }
  }

  // Smallest absolute diff, earliest position on ties.
  let bestIdx = 0;
  let bestDiff = Math.abs(candidates[0].kcal - originalKcal);
  for (let i = 1; i < candidates.length; i++) {
    const diff = Math.abs(candidates[i].kcal - originalKcal);
    if (diff < bestDiff) {
      bestIdx = i;
      bestDiff = diff;
    }
  }
  return bestIdx;
}

describe('Property 4: Swap selection picks the best candidate', () => {
  it('returns the earliest in-band candidate when one exists, else the closest (earliest on ties), else failure', () => {
    fc.assert(
      fc.property(
        fc.array(mealArb(fc.double({ min: 0, max: 5000, noNaN: true })), { maxLength: 8 }),
        // originalKcal strictly positive so the ±5% band is meaningful.
        fc.double({ min: 1, max: 5000, noNaN: true }),
        (candidates, originalKcal) => {
          const result = selectSwapResult(candidates, originalKcal);
          const expIdx = expectedIndex(candidates, originalKcal);

          if (expIdx === null) {
            // Empty sequence => failure.
            expect(result.kind).toBe('failure');
            return;
          }

          expect(result.kind).toBe('success');
          if (result.kind === 'success') {
            const chosen = result.meal;
            const expected = candidates[expIdx];

            // The chosen meal must be the expected one (by identity of fields).
            expect(chosen).toEqual(expected);

            // If any candidate is in-band, the chosen one must be in-band and
            // be the earliest in-band candidate.
            const anyInBand = candidates.some((c) => isWithinKcalBand(c.kcal, originalKcal));
            if (anyInBand) {
              expect(isWithinKcalBand(chosen.kcal, originalKcal)).toBe(true);
              const firstInBand = candidates.findIndex((c) =>
                isWithinKcalBand(c.kcal, originalKcal),
              );
              expect(chosen).toEqual(candidates[firstInBand]);
            } else {
              // No in-band: chosen must minimize absolute kcal difference.
              const chosenDiff = Math.abs(chosen.kcal - originalKcal);
              const minDiff = Math.min(
                ...candidates.map((c) => Math.abs(c.kcal - originalKcal)),
              );
              expect(chosenDiff).toBeCloseTo(minDiff, 10);

              // Earliest-position tie-break: no earlier candidate shares the min diff.
              const chosenIdx = candidates.indexOf(chosen);
              for (let i = 0; i < chosenIdx; i++) {
                expect(Math.abs(candidates[i].kcal - originalKcal)).toBeGreaterThan(
                  chosenDiff,
                );
              }
            }
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('returns failure for an empty candidate sequence', () => {
    fc.assert(
      fc.property(fc.double({ min: 1, max: 5000, noNaN: true }), (originalKcal) => {
        expect(selectSwapResult([], originalKcal).kind).toBe('failure');
      }),
      { numRuns: 100 },
    );
  });

  it('prefers an earlier in-band candidate over a later closer one', () => {
    fc.assert(
      fc.property(
        // Build a guaranteed in-band candidate first, then a perfectly-matching later one.
        fc.double({ min: 100, max: 5000, noNaN: true }),
        (originalKcal) => {
          // First candidate inside the band but not exact; second is exact.
          const inBandKcal = originalKcal * (1 + KCAL_BAND * 0.5);
          const candidates: Meal[] = [
            { ...baseMeal('first'), kcal: inBandKcal },
            { ...baseMeal('second'), kcal: originalKcal },
          ];
          const result = selectSwapResult(candidates, originalKcal);
          expect(result.kind).toBe('success');
          if (result.kind === 'success') {
            // Earliest in-band wins even though the second is an exact match.
            expect(result.meal.title).toBe('first');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

function baseMeal(title: string): Meal {
  return {
    id: crypto.randomUUID(),
    type: 'Obiad',
    title,
    kcal: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    ingredients: ['x'],
    instruction: 'Przygotuj posiłek.',
    eaten: false,
  };
}
