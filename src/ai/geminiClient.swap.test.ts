// Feature: app-improvements, Property 5: Swap issues between 1 and 4 requests and stops early
//
// Property 5: For any sequence of mocked Gemini responses, a single Meal_Swap
// issues no fewer than 1 and no more than 4 requests to the Gemini_API, and
// stops issuing further requests as soon as a candidate within the
// Kcal_Tolerance_Band is produced.
//
// Validates: Requirements 8.2, 8.1
import { describe, it, expect, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { GeminiClient } from './geminiClient';
import { isWithinKcalBand, MAX_SWAP_ATTEMPTS } from './geminiLogic';
import type { Meal, MealType, UserProfile } from '../types';

const MEAL_TYPES: MealType[] = ['Śniadanie', 'II Śniadanie', 'Obiad', 'Przekąska', 'Kolacja'];

/** Minimal valid user profile for prompt construction. */
const USER_PROFILE: UserProfile = {
  weight: 70,
  height: 175,
  goal: 'utrzymanie',
  dailyCalorieTarget: 2000,
  dailyProteinTarget: 120,
  mealsPerDay: 5,
  equipment: ['piekarnik'],
  dislikedIngredients: [],
  preferredIngredients: [],
  vegetableRule: 'dowolne',
};

/** The parsed payload shape returned in a Gemini response text body. */
interface MealPayload {
  type: MealType;
  title: string;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: string[];
  instruction: string;
}

/**
 * Generates a valid meal payload (satisfies the strict `validateMeal`) with a
 * controllable kcal value.
 */
function payloadArb(kcalArb: fc.Arbitrary<number>): fc.Arbitrary<MealPayload> {
  return fc.record({
    type: fc.constantFrom(...MEAL_TYPES),
    title: fc.constant('Posiłek'),
    kcal: kcalArb,
    protein: fc.double({ min: 0, max: 200, noNaN: true }),
    carbs: fc.double({ min: 0, max: 200, noNaN: true }),
    fats: fc.double({ min: 0, max: 200, noNaN: true }),
    ingredients: fc.array(fc.constant('składnik'), { minLength: 1, maxLength: 3 }),
    instruction: fc.constant('Przygotuj posiłek.'),
  });
}

/** Wraps a payload in the Gemini API response envelope. */
function geminiEnvelope(payload: MealPayload) {
  return {
    candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }],
  };
}

/** Builds the original Meal whose kcal anchors the tolerance band. */
function originalMeal(kcal: number): Meal {
  return {
    id: 'orig',
    type: 'Obiad',
    title: 'Oryginalny posiłek',
    kcal,
    protein: 30,
    carbs: 40,
    fats: 10,
    ingredients: ['ryż', 'kurczak'],
    instruction: 'Ugotuj.',
    eaten: false,
  };
}

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe('Property 5: Swap issues between 1 and 4 requests and stops early', () => {
  it('issues 1..4 requests and stops at the first in-band candidate', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.double({ min: 100, max: 5000, noNaN: true }),
        // At least MAX_SWAP_ATTEMPTS payloads so every loop iteration has a response.
        fc.array(payloadArb(fc.double({ min: 0, max: 10000, noNaN: true })), {
          minLength: MAX_SWAP_ATTEMPTS,
          maxLength: MAX_SWAP_ATTEMPTS + 2,
        }),
        async (originalKcal, payloads) => {
          let callIndex = 0;
          const fetchMock = vi.fn(async () => {
            const payload = payloads[Math.min(callIndex, payloads.length - 1)];
            callIndex++;
            return {
              ok: true,
              status: 200,
              json: async () => geminiEnvelope(payload),
              text: async () => '',
            } as unknown as Response;
          });
          globalThis.fetch = fetchMock as unknown as typeof fetch;

          const client = new GeminiClient('test-api-key-1234');
          await client.swapMeal(originalMeal(originalKcal), USER_PROFILE);

          const calls = fetchMock.mock.calls.length;

          // Bound: no fewer than 1, no more than 4 requests (Requirement 8.2).
          expect(calls).toBeGreaterThanOrEqual(1);
          expect(calls).toBeLessThanOrEqual(MAX_SWAP_ATTEMPTS);

          // Early stop: requests halt as soon as an in-band candidate is
          // produced (Requirement 8.1). The expected call count is the
          // 1-based position of the first in-band candidate among the first
          // MAX_SWAP_ATTEMPTS payloads, else MAX_SWAP_ATTEMPTS.
          const firstInBandIdx = payloads
            .slice(0, MAX_SWAP_ATTEMPTS)
            .findIndex((p) => isWithinKcalBand(p.kcal, originalKcal));
          const expectedCalls = firstInBandIdx === -1 ? MAX_SWAP_ATTEMPTS : firstInBandIdx + 1;

          expect(calls).toBe(expectedCalls);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('stops after exactly one request when the first candidate is in-band', async () => {
    await fc.assert(
      fc.asyncProperty(fc.double({ min: 100, max: 5000, noNaN: true }), async (originalKcal) => {
        let callIndex = 0;
        // First payload is an exact match (in-band); later ones are far out of band.
        const payloads: MealPayload[] = [
          { ...basePayload(), kcal: originalKcal },
          { ...basePayload(), kcal: originalKcal * 5 + 1 },
          { ...basePayload(), kcal: originalKcal * 5 + 2 },
          { ...basePayload(), kcal: originalKcal * 5 + 3 },
        ];
        const fetchMock = vi.fn(async () => {
          const payload = payloads[Math.min(callIndex, payloads.length - 1)];
          callIndex++;
          return {
            ok: true,
            status: 200,
            json: async () => geminiEnvelope(payload),
            text: async () => '',
          } as unknown as Response;
        });
        globalThis.fetch = fetchMock as unknown as typeof fetch;

        const client = new GeminiClient('test-api-key-1234');
        const result = await client.swapMeal(originalMeal(originalKcal), USER_PROFILE);

        expect(fetchMock.mock.calls.length).toBe(1);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('issues the maximum of 4 requests when no candidate is ever in-band', async () => {
    await fc.assert(
      fc.asyncProperty(fc.double({ min: 100, max: 5000, noNaN: true }), async (originalKcal) => {
        let callIndex = 0;
        // Every candidate is far outside the ±5% band.
        const outOfBand = () => ({ ...basePayload(), kcal: originalKcal * 10 + callIndex });
        const fetchMock = vi.fn(async () => {
          const payload = outOfBand();
          callIndex++;
          return {
            ok: true,
            status: 200,
            json: async () => geminiEnvelope(payload),
            text: async () => '',
          } as unknown as Response;
        });
        globalThis.fetch = fetchMock as unknown as typeof fetch;

        const client = new GeminiClient('test-api-key-1234');
        await client.swapMeal(originalMeal(originalKcal), USER_PROFILE);

        expect(fetchMock.mock.calls.length).toBe(MAX_SWAP_ATTEMPTS);
      }),
      { numRuns: 100 },
    );
  });
});

function basePayload(): MealPayload {
  return {
    type: 'Obiad',
    title: 'Posiłek',
    kcal: 0,
    protein: 30,
    carbs: 40,
    fats: 10,
    ingredients: ['składnik'],
    instruction: 'Przygotuj posiłek.',
  };
}
