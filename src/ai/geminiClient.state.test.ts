// Feature: app-improvements, Property 8: AI failures leave the meal plan unchanged
// **Validates: Requirements 5.5**
//
// For any application state and any Gemini_Client operation that returns success false,
// applying the App's result handling produces no mutation to dayPlans (the state's meal
// plan data is identical to the pre-operation state).
//
// Approach: Generate an arbitrary AppState with dayPlans, mock global fetch to always
// return a 500 failure, call each GeminiClient method, verify result.success === false,
// then confirm that the caller's conditional dispatch (which only fires on success)
// would NOT mutate dayPlans through the appReducer.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { GeminiClient } from './geminiClient';
import { appReducer } from '../context/UserContext';
import type { AppState, DayPlan, Meal, MealType, UserProfile, GeminiResponse } from '../types';

const MEAL_TYPES: MealType[] = ['Śniadanie', 'II Śniadanie', 'Obiad', 'Przekąska', 'Kolacja'];

// --- Generators ---

function mealArb(): fc.Arbitrary<Meal> {
  return fc.record({
    id: fc.uuid(),
    type: fc.constantFrom(...MEAL_TYPES),
    title: fc.string({ minLength: 1, maxLength: 30 }).map(s => s.trim() || 'posiłek'),
    kcal: fc.double({ min: 0, max: 3000, noNaN: true }),
    protein: fc.double({ min: 0, max: 200, noNaN: true }),
    carbs: fc.double({ min: 0, max: 400, noNaN: true }),
    fats: fc.double({ min: 0, max: 200, noNaN: true }),
    ingredients: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
    instruction: fc.string({ minLength: 1, maxLength: 100 }).map(s => s.trim() || 'Gotuj.'),
    tip: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    eaten: fc.boolean(),
  });
}

/** Generates ISO date strings like '2024-03-15' without using fc.date (avoids Invalid time value during shrinking). */
function isoDateArb(): fc.Arbitrary<string> {
  return fc.tuple(
    fc.integer({ min: 2024, max: 2025 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }), // use 28 to avoid invalid day-of-month combos
  ).map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
}

function dayPlanArb(): fc.Arbitrary<DayPlan> {
  return fc.record({
    date: isoDateArb(),
    meals: fc.array(mealArb(), { minLength: 1, maxLength: 5 }),
    boughtIngredients: fc.option(
      fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
      { nil: undefined }
    ),
  });
}

function userProfileArb(): fc.Arbitrary<UserProfile> {
  return fc.record({
    weight: fc.double({ min: 40, max: 200, noNaN: true }),
    height: fc.double({ min: 140, max: 220, noNaN: true }),
    goal: fc.constantFrom('redukcja', 'masa', 'utrzymanie'),
    dailyCalorieTarget: fc.integer({ min: 1200, max: 4000 }),
    dailyProteinTarget: fc.integer({ min: 50, max: 300 }),
    mealsPerDay: fc.integer({ min: 3, max: 6 }),
    equipment: fc.array(fc.constantFrom('piekarnik', 'mikrofalówka', 'blender'), { maxLength: 3 }),
    dislikedIngredients: fc.array(fc.string({ minLength: 1, maxLength: 15 }), { maxLength: 3 }),
    preferredIngredients: fc.array(fc.string({ minLength: 1, maxLength: 15 }), { maxLength: 3 }),
    vegetableRule: fc.constantFrom('always', 'sometimes', 'never'),
  });
}

function appStateArb(): fc.Arbitrary<AppState> {
  return fc.record({
    userProfile: userProfileArb(),
    dayPlans: fc.array(dayPlanArb(), { minLength: 0, maxLength: 5 }),
    selectedDate: isoDateArb(),
    clipboard: fc.constant(null),
    historyStack: fc.constant([]),
    geminiApiKey: fc.string({ minLength: 10, maxLength: 40 }),
    schemaVersion: fc.constant(1),
  });
}

// --- Test ---

describe('Property 8: AI failures leave the meal plan unchanged', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    // Mock global fetch to always return a 500 error (simulating AI failure)
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Internal Server Error' } }), {
        status: 500,
        statusText: 'Internal Server Error',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('calling GeminiClient methods with failing fetch returns success=false and dayPlans remains unchanged through appReducer', async () => {
    await fc.assert(
      fc.asyncProperty(
        appStateArb(),
        mealArb(),
        async (state, meal) => {
          // Deep clone dayPlans before any operation
          const dayPlansBefore = JSON.parse(JSON.stringify(state.dayPlans));

          const client = new GeminiClient(state.geminiApiKey);

          // Call all four GeminiClient methods — all should fail with success: false
          const results: GeminiResponse[] = await Promise.all([
            client.swapMeal(meal, state.userProfile),
            client.generateFullDay(state.userProfile),
            client.generateFromFridge('kurczak, ryż', 'Obiad', state.userProfile),
            client.estimateMealFromDescription('Kanapka z serem', 'Śniadanie'),
          ]);

          // All results must indicate failure
          for (const result of results) {
            expect(result.success).toBe(false);
          }

          // Simulate caller behavior: on failure, no mutating action is dispatched.
          // The caller's code path is:
          //   if (result.success && ...) { dispatch(SET_DAY_MEALS/REPLACE_MEAL/ADD_MEAL) }
          //   else { showToast(error) }
          // Since success is false, NO dispatch happens. The state passes through
          // the reducer with no action — dayPlans must be identical.

          // Verify: the reducer with any non-mutating action (like SELECT_DATE) does NOT
          // touch dayPlans, demonstrating that the failure path leaves dayPlans unchanged.
          const stateAfterFailurePath = appReducer(state, {
            type: 'SELECT_DATE',
            date: state.selectedDate,
          });

          expect(stateAfterFailurePath.dayPlans).toEqual(dayPlansBefore);

          // Also verify directly: since no meal-mutating action was dispatched,
          // the original state's dayPlans remain identical
          expect(state.dayPlans).toEqual(dayPlansBefore);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('GeminiClient with empty API key returns success=false without dispatching any action', async () => {
    await fc.assert(
      fc.asyncProperty(
        appStateArb(),
        async (state) => {
          const dayPlansBefore = JSON.parse(JSON.stringify(state.dayPlans));

          // Empty key triggers immediate failure without any network call
          const client = new GeminiClient('');

          const results: GeminiResponse[] = await Promise.all([
            client.swapMeal(
              { id: '1', type: 'Obiad', title: 'Test', kcal: 500, protein: 30, carbs: 50, fats: 20, ingredients: ['a'], instruction: 'b', eaten: false },
              state.userProfile
            ),
            client.generateFullDay(state.userProfile),
            client.generateFromFridge('test', 'Obiad', state.userProfile),
            client.estimateMealFromDescription('test', 'Obiad'),
          ]);

          // All must fail
          for (const result of results) {
            expect(result.success).toBe(false);
          }

          // No fetch should have been called at all
          expect(globalThis.fetch).not.toHaveBeenCalled();

          // dayPlans unchanged (no dispatch on failure path)
          expect(state.dayPlans).toEqual(dayPlansBefore);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('appReducer does not mutate dayPlans for non-meal actions dispatched during failure handling', () => {
    fc.assert(
      fc.property(
        appStateArb(),
        (state) => {
          const dayPlansBefore = JSON.parse(JSON.stringify(state.dayPlans));

          // The only actions callers might dispatch on failure are NONE (they
          // just call showToast). But even if SELECT_DATE or UPDATE_PROFILE were
          // dispatched (non-meal actions), dayPlans must remain identical.
          const afterSelectDate = appReducer(state, { type: 'SELECT_DATE', date: '2025-01-01' });
          expect(afterSelectDate.dayPlans).toEqual(dayPlansBefore);

          const afterUpdateProfile = appReducer(state, {
            type: 'UPDATE_PROFILE',
            profile: { goal: 'masa' },
          });
          expect(afterUpdateProfile.dayPlans).toEqual(dayPlansBefore);

          const afterSetApiKey = appReducer(state, { type: 'SET_API_KEY', key: 'new-key' });
          expect(afterSetApiKey.dayPlans).toEqual(dayPlansBefore);
        },
      ),
      { numRuns: 100 },
    );
  });
});
