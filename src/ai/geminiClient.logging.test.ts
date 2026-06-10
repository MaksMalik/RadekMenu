// Feature: app-improvements, Property 10: Production builds never log raw AI responses
// Validates: Requirements 9.1, 9.3
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { GeminiClient } from './geminiClient';
import { isRawLoggingAllowed } from './geminiLogic';
import type { UserProfile, MealType } from '../types';

/** Every console method that Property 10 forbids from receiving raw AI content. */
const CONSOLE_METHODS = ['log', 'warn', 'error', 'info', 'debug'] as const;

const PROFILE: UserProfile = {
  weight: 80,
  height: 180,
  goal: 'maintenance',
  dailyCalorieTarget: 2200,
  dailyProteinTarget: 150,
  mealsPerDay: 5,
  equipment: ['piekarnik'],
  dislikedIngredients: [],
  preferredIngredients: [],
  vegetableRule: 'co najmniej jedna porcja',
};

const CURRENT_MEAL = {
  id: 'm1',
  type: 'Obiad' as MealType,
  title: 'Kurczak z ryżem',
  kcal: 600,
  protein: 45,
  carbs: 60,
  fats: 18,
  ingredients: ['kurczak', 'ryż'],
  instruction: 'Ugotuj ryż i usmaż kurczaka.',
  eaten: false,
};

/**
 * Generates a distinctive raw AI response payload. The sentinel prefix/suffix
 * make the content (and its substrings) impossible to confuse with the
 * operational diagnostics (retry/status notices) that Requirement 9.4 permits.
 */
const aiContentArb = fc
  .string({ minLength: 5, maxLength: 300 })
  .map((core) => `SENTINEL_AI_RESPONSE_${core}_END_SENTINEL`);

/** Which client operation to drive for a given run. */
const operationArb = fc.constantFrom(
  'swap',
  'fullDay',
  'fridge',
  'estimate',
);

/** Builds an `ok` fetch response carrying `rawText` as the AI response text. */
function mockFetchReturning(rawText: string): void {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: rawText }] } }],
    }),
    text: async () => rawText,
  } as unknown as Response);
}

async function runOperation(op: string, client: GeminiClient): Promise<void> {
  switch (op) {
    case 'swap':
      await client.swapMeal(CURRENT_MEAL, PROFILE);
      return;
    case 'fullDay':
      await client.generateFullDay(PROFILE);
      return;
    case 'fridge':
      await client.generateFromFridge('jajka, ser', 'Obiad', PROFILE);
      return;
    case 'estimate':
      await client.estimateMealFromDescription('kanapka z serem', 'Śniadanie');
      return;
  }
}

describe('Property 10: Production builds never log raw AI responses', () => {
  let spies: Record<string, ReturnType<typeof vi.spyOn>>;
  const originalFetch = global.fetch;

  beforeEach(() => {
    spies = {};
    for (const method of CONSOLE_METHODS) {
      spies[method] = vi.spyOn(console, method).mockImplementation(() => {});
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    global.fetch = originalFetch;
  });

  it('emits no raw AI response content to any console method when DEV is false', async () => {
    // Simulate a production build.
    vi.stubEnv('DEV', false);
    // Confirm the logging gate is closed (Requirements 9.1, 9.3).
    expect(isRawLoggingAllowed()).toBe(false);

    await fc.assert(
      fc.asyncProperty(aiContentArb, operationArb, async (rawContent, op) => {
        // Reset captured calls for this run.
        for (const method of CONSOLE_METHODS) {
          spies[method].mockClear();
        }
        mockFetchReturning(rawContent);

        const client = new GeminiClient('test-api-key-123');
        await runOperation(op, client);

        // No console method may have been invoked with the raw content or any
        // distinctive substring of it.
        const substrings = [
          rawContent,
          'SENTINEL_AI_RESPONSE_',
          '_END_SENTINEL',
        ];
        for (const method of CONSOLE_METHODS) {
          for (const call of spies[method].mock.calls) {
            const serialized = call
              .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
              .join(' ');
            for (const needle of substrings) {
              expect(serialized.includes(needle)).toBe(false);
            }
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it('emits no raw AI response content to any console method when DEV is undefined', async () => {
    // Simulate an environment where the DEV flag cannot be evaluated.
    vi.stubEnv('DEV', undefined as unknown as string);
    // Defaults to the safe production behavior (Requirement 9.3).
    expect(isRawLoggingAllowed()).toBe(false);

    await fc.assert(
      fc.asyncProperty(aiContentArb, operationArb, async (rawContent, op) => {
        for (const method of CONSOLE_METHODS) {
          spies[method].mockClear();
        }
        mockFetchReturning(rawContent);

        const client = new GeminiClient('test-api-key-123');
        await runOperation(op, client);

        for (const method of CONSOLE_METHODS) {
          for (const call of spies[method].mock.calls) {
            const serialized = call
              .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
              .join(' ');
            expect(serialized.includes(rawContent)).toBe(false);
            expect(serialized.includes('SENTINEL_AI_RESPONSE_')).toBe(false);
          }
        }
      }),
      { numRuns: 200 },
    );
  });
});
