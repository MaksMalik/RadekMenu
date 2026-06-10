import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { GeminiClient } from './geminiClient';
import { errorMessage, validateMeal } from './geminiLogic';
import type { Meal, MealType, UserProfile } from '../types';

/**
 * Dedicated error-path property tests for the I/O-orchestrating `GeminiClient`
 * (task 3.5). These exercise the public methods with a mocked global `fetch`:
 *
 * - Property 3:  Unparseable or invalid responses produce a failure (7.5)
 * - Property 7:  Missing API key short-circuits without a request (5.4)
 * - Property 11: API key is excluded from returned error messages (10.4)
 */

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MEAL_TYPES: MealType[] = ['Śniadanie', 'II Śniadanie', 'Obiad', 'Przekąska', 'Kolacja'];

const USER_PROFILE: UserProfile = {
  weight: 80,
  height: 180,
  goal: 'redukcja',
  dailyCalorieTarget: 2000,
  dailyProteinTarget: 150,
  mealsPerDay: 5,
  equipment: ['piekarnik', 'patelnia'],
  dislikedIngredients: ['cebula'],
  preferredIngredients: ['kurczak'],
  vegetableRule: 'dużo warzyw',
};

const ORIGINAL_MEAL: Meal = {
  id: 'meal-1',
  type: 'Obiad',
  title: 'Kurczak z ryżem',
  kcal: 600,
  protein: 45,
  carbs: 60,
  fats: 18,
  ingredients: ['kurczak (150g)', 'ryż (80g)'],
  instruction: 'Ugotuj ryż i usmaż kurczaka.',
  eaten: false,
};

// ---------------------------------------------------------------------------
// Fetch mocking helpers
// ---------------------------------------------------------------------------

/** A fetch mock installed as the global `fetch` for each test. */
let fetchMock: ReturnType<typeof vi.fn>;

/** Builds a successful (ok) Response-like whose candidate text is `text`. */
function okResponse(text: string): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
    text: async () => text,
  } as unknown as Response;
}

/** Builds a failed (non-ok) Response-like with the given status and body. */
function errorResponse(status: number, body: string): Response {
  return {
    ok: false,
    status,
    json: async () => ({}),
    text: async () => body,
  } as unknown as Response;
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  // Silence permitted dev/operational console output so the test log stays clean.
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  // Restore the original global fetch and all spies after every test.
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Property 3: Unparseable or invalid responses produce a failure
// ---------------------------------------------------------------------------

// Feature: app-improvements, Property 3: Unparseable or invalid responses produce a failure
// Validates: Requirements 7.5
describe('Property 3: Unparseable or invalid responses produce a failure', () => {
  /**
   * Generates response-body text that the client must reject: either text that
   * is not valid JSON, or JSON whose parsed value fails `validateMeal` (both as
   * a single object and as a meal array). Filtering guarantees neither the
   * object-shaped methods nor the array-shaped methods could accept it.
   */
  const invalidPayloadArb: fc.Arbitrary<string> = fc
    .oneof(
      // Non-JSON strings.
      fc.string(),
      // Arbitrary JSON values, serialized.
      fc.json(),
    )
    .filter((text) => {
      let value: unknown;
      try {
        value = JSON.parse(text);
      } catch {
        return true; // unparseable => definitely invalid
      }
      // Reject if it would pass as a single meal.
      if (validateMeal(value)) return false;
      // Reject if it would pass as a non-empty array of meals.
      if (Array.isArray(value) && value.length > 0 && value.every((m) => validateMeal(m))) {
        return false;
      }
      return true;
    });

  it('returns success:false with the Polish processing message and no data for swapMeal', async () => {
    await fc.assert(
      fc.asyncProperty(invalidPayloadArb, async (payload) => {
        fetchMock.mockResolvedValue(okResponse(payload));
        const client = new GeminiClient('valid-key');

        const result = await client.swapMeal(ORIGINAL_MEAL, USER_PROFILE);

        expect(result.success).toBe(false);
        expect(result.data).toBeUndefined();
        expect(result.error).toBe(errorMessage('processing'));
      }),
      { numRuns: 100 },
    );
  });

  it('returns success:false with the Polish processing message and no data for generateFullDay', async () => {
    await fc.assert(
      fc.asyncProperty(invalidPayloadArb, async (payload) => {
        fetchMock.mockResolvedValue(okResponse(payload));
        const client = new GeminiClient('valid-key');

        const result = await client.generateFullDay(USER_PROFILE);

        expect(result.success).toBe(false);
        expect(result.data).toBeUndefined();
        expect(result.error).toBe(errorMessage('processing'));
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: Missing API key short-circuits without a request
// ---------------------------------------------------------------------------

// Feature: app-improvements, Property 7: Missing API key short-circuits without a request
// Validates: Requirements 5.4
describe('Property 7: Missing API key short-circuits without a request', () => {
  /** Generates empty or whitespace-only key strings (trimmed length 0). */
  const blankKeyArb: fc.Arbitrary<string> = fc
    .array(fc.constantFrom(' ', '\t', '\n', '\r', '\f', '\v'), { maxLength: 8 })
    .map((chars) => chars.join(''));

  it('returns the Polish missing-key error and never calls fetch across all operations', async () => {
    await fc.assert(
      fc.asyncProperty(blankKeyArb, async (key) => {
        fetchMock.mockResolvedValue(okResponse(JSON.stringify(ORIGINAL_MEAL)));
        const client = new GeminiClient(key);

        const results = await Promise.all([
          client.swapMeal(ORIGINAL_MEAL, USER_PROFILE),
          client.generateFullDay(USER_PROFILE),
          client.generateFromFridge('jajka, ryż', 'Obiad', USER_PROFILE),
          client.estimateMealFromDescription('owsianka z bananem', 'Śniadanie'),
        ]);

        for (const result of results) {
          expect(result.success).toBe(false);
          expect(result.data).toBeUndefined();
          expect(result.error).toBe(errorMessage('missing_key'));
        }

        // No request was issued to the Gemini API (Requirement 5.4).
        expect(fetchMock).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11: API key is excluded from returned error messages
// ---------------------------------------------------------------------------

// Feature: app-improvements, Property 11: API key is excluded from returned error messages
// Validates: Requirements 10.4
describe('Property 11: API key is excluded from returned error messages', () => {
  /** Generates non-blank API key strings (usable, so the request is attempted). */
  const keyArb: fc.Arbitrary<string> = fc
    .string({ minLength: 1 })
    .filter((s) => s.trim().length > 0);

  /**
   * An error condition for a request that has a usable key. Each variant is
   * non-transient (no 503/429) so the client fails without retry backoff, and
   * each one embeds the API key in the surfaced failure data so the test proves
   * the key is stripped rather than merely absent.
   */
  type ErrorCondition =
    | { kind: 'status'; status: number }
    | { kind: 'reject' }
    | { kind: 'badjson' };

  const conditionArb: fc.Arbitrary<ErrorCondition> = fc.oneof(
    fc.record({ kind: fc.constant('status' as const), status: fc.constantFrom(400, 401, 403, 404, 500) }),
    fc.record({ kind: fc.constant('reject' as const) }),
    fc.record({ kind: fc.constant('badjson' as const) }),
  );

  it('never includes the API key as a substring of the returned error', async () => {
    await fc.assert(
      fc.asyncProperty(keyArb, conditionArb, async (key, condition) => {
        switch (condition.kind) {
          case 'status':
            // Body echoes the key to prove stripKey/key-free messaging works.
            fetchMock.mockResolvedValue(errorResponse(condition.status, `Error body referencing ${key}`));
            break;
          case 'reject':
            // Rejection message echoes the key.
            fetchMock.mockRejectedValue(new Error(`network failure for ${key}`));
            break;
          case 'badjson':
            // Unparseable response text echoes the key.
            fetchMock.mockResolvedValue(okResponse(`not valid json ${key}`));
            break;
        }

        const client = new GeminiClient(key);
        const result = await client.estimateMealFromDescription('owsianka', 'Śniadanie');

        expect(result.success).toBe(false);
        expect(typeof result.error).toBe('string');
        expect(result.error).not.toContain(key);
      }),
      { numRuns: 200 },
    );
  });
});
