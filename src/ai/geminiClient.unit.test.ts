/**
 * Unit tests for {@link GeminiClient} transport behavior (Task 3.7).
 *
 * Covers, with concrete examples rather than properties:
 * - Request shape: structured-output fields (`responseMimeType` + `responseSchema`
 *   with the required meal fields) — Requirement 7.1.
 * - Timeout behavior: a hanging `fetch` aborted by the configured timeout yields a
 *   Polish timeout `GeminiResponse` with no partial data, and the operation settles
 *   so the caller's loading state can be cleared — Requirements 6.2, 6.3, 6.4.
 * - Logging allowances: DEV raw-response logging is permitted, and production
 *   operational diagnostics (retry/status notices) are permitted — Requirements 9.2, 9.4.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeminiClient } from './geminiClient';
import { errorMessage } from './geminiLogic';
import type { UserProfile } from '../types';

/** A complete, valid profile so prompt builders have every field they read. */
const PROFILE: UserProfile = {
  weight: 80,
  height: 180,
  goal: 'utrzymanie',
  dailyCalorieTarget: 2000,
  dailyProteinTarget: 150,
  mealsPerDay: 5,
  equipment: ['piekarnik'],
  dislikedIngredients: [],
  preferredIngredients: [],
  vegetableRule: 'dużo warzyw',
};

/** Required meal fields the structured-output schema must declare (Requirement 7.1). */
const REQUIRED_MEAL_FIELDS = [
  'type',
  'title',
  'kcal',
  'protein',
  'carbs',
  'fats',
  'ingredients',
  'instruction',
] as const;

/** A valid meal payload as the Gemini API would return it (JSON text). */
const VALID_MEAL_JSON = JSON.stringify({
  type: 'Obiad',
  title: 'Kurczak z ryżem',
  kcal: 500,
  protein: 40,
  carbs: 50,
  fats: 15,
  ingredients: ['kurczak (150g)', 'ryż (100g)'],
  instruction: 'Ugotuj ryż i usmaż kurczaka.',
});

/** Builds a fake `ok` Gemini response wrapping `text` in the API envelope. */
function okGeminiResponse(text: string): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
    text: async () => text,
  } as unknown as Response;
}

/** Builds a fake non-ok response carrying `status` and `body`. */
function errorResponse(status: number, body: string): Response {
  return {
    ok: false,
    status,
    json: async () => ({}),
    text: async () => body,
  } as unknown as Response;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('GeminiClient request shape (Requirement 7.1)', () => {
  it('sends responseMimeType=application/json and a responseSchema with the required fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okGeminiResponse(VALID_MEAL_JSON));
    vi.stubGlobal('fetch', fetchMock);

    const client = new GeminiClient('test-key');
    const result = await client.estimateMealFromDescription('owsianka z bananem', 'Obiad');

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);

    expect(body.generationConfig.responseMimeType).toBe('application/json');

    const schema = body.generationConfig.responseSchema;
    expect(schema).toBeDefined();
    expect(schema.required).toEqual(expect.arrayContaining([...REQUIRED_MEAL_FIELDS]));
    for (const field of REQUIRED_MEAL_FIELDS) {
      expect(schema.properties[field]).toBeDefined();
    }
    // Optional `tip` is declared but not required.
    expect(schema.properties.tip).toBeDefined();
    expect(schema.required).not.toContain('tip');
  });

  it('uses an array responseSchema whose items declare the required meal fields for full-day generation', async () => {
    const dayJson = JSON.stringify([JSON.parse(VALID_MEAL_JSON)]);
    const fetchMock = vi.fn().mockResolvedValue(okGeminiResponse(dayJson));
    vi.stubGlobal('fetch', fetchMock);

    const client = new GeminiClient('test-key');
    const result = await client.generateFullDay(PROFILE);

    expect(result.success).toBe(true);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);

    const schema = body.generationConfig.responseSchema;
    expect(schema.type).toBe('array');
    expect(schema.items.required).toEqual(expect.arrayContaining([...REQUIRED_MEAL_FIELDS]));
  });
});

describe('GeminiClient timeout behavior (Requirements 6.2, 6.3, 6.4)', () => {
  it('aborts a hanging request after the configured timeout and returns a Polish timeout result with no data', async () => {
    vi.useFakeTimers();

    // A fetch that never resolves on its own; it only rejects (AbortError) when
    // the request signal is aborted, simulating a hung network call.
    const fetchMock = vi.fn((_url: string, init: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init.signal;
        signal?.addEventListener('abort', () => {
          const abortError = new Error('The operation was aborted.');
          abortError.name = 'AbortError';
          reject(abortError);
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new GeminiClient('test-key', { timeoutMs: 1000 });
    const pending = client.estimateMealFromDescription('cokolwiek', 'Obiad');

    // Advance past the configured timeout so the abort timer fires.
    await vi.advanceTimersByTimeAsync(1000);
    const result = await pending;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Timeout produces a failure with the Polish timeout message (6.2).
    expect(result.success).toBe(false);
    expect(result.error).toBe(errorMessage('timeout'));
    // No partial data is returned (6.3).
    expect(result.data).toBeUndefined();
  });

  it('settles the operation on timeout so the caller can clear its loading state (Requirement 6.4)', async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn((_url: string, init: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          const abortError = new Error('The operation was aborted.');
          abortError.name = 'AbortError';
          reject(abortError);
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new GeminiClient('test-key', { timeoutMs: 1000 });
    let settled = false;
    const pending = client.estimateMealFromDescription('cokolwiek', 'Obiad').then((r) => {
      settled = true;
      return r;
    });

    await vi.advanceTimersByTimeAsync(1000);
    await pending;

    // The promise resolves (does not hang), allowing a finally-equivalent path
    // to clear the in-progress loading flag.
    expect(settled).toBe(true);
  });
});

describe('GeminiClient logging allowances (Requirements 9.2, 9.4)', () => {
  it('permits raw AI response logging in development builds (Requirement 9.2)', async () => {
    vi.stubEnv('DEV', true);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue(okGeminiResponse(VALID_MEAL_JSON));
    vi.stubGlobal('fetch', fetchMock);

    const client = new GeminiClient('test-key');
    const result = await client.estimateMealFromDescription('owsianka', 'Obiad');

    expect(result.success).toBe(true);
    expect(logSpy).toHaveBeenCalled();
    // The raw-response diagnostic is the one that fired.
    expect(logSpy.mock.calls.some((call) => String(call[0]).includes('[Gemini raw response]'))).toBe(true);
  });

  it('permits operational diagnostics (retry/status notices) in production builds without logging raw responses (Requirement 9.4)', async () => {
    vi.useFakeTimers();
    vi.stubEnv('DEV', false);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Always-503 forces the transient-retry path, which emits operational warnings.
    const fetchMock = vi.fn().mockResolvedValue(errorResponse(503, 'Service Unavailable'));
    vi.stubGlobal('fetch', fetchMock);

    const client = new GeminiClient('test-key', { timeoutMs: 1000 });
    const pending = client.estimateMealFromDescription('owsianka', 'Obiad');

    // Flush the capped-backoff delays between transient retries.
    await vi.advanceTimersByTimeAsync(10000);
    const result = await pending;

    // Operational diagnostics are permitted in production (9.4).
    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls.some((call) => String(call[0]).includes('[Gemini]'))).toBe(true);
    // No raw-response content is logged in production (9.1/9.3 boundary respected here).
    expect(logSpy).not.toHaveBeenCalled();
    // Transient exhaustion surfaces a failure result.
    expect(result.success).toBe(false);
  });
});
