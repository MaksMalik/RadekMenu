import type { Meal, MealType, UserProfile, GeminiResponse, DayPlan } from '../types';
import { buildSwapPrompt, buildFullDayPrompt, buildFridgePrompt, buildEstimatePrompt } from './promptTemplates';
import {
  DEFAULT_MODEL,
  MAX_SWAP_ATTEMPTS,
  MEAL_SCHEMA,
  clampTimeout,
  classifyGeminiError,
  errorMessage,
  isRawLoggingAllowed,
  isWithinKcalBand,
  isGeneratedMealReasonable,
  selectSwapResult,
  stripKey,
  validateMeal as validateMealStrict,
  type GeminiErrorKind,
} from './geminiLogic';

export type { GeminiResponse } from '../types';

const DEFAULT_GEMINI_KEY = '';

/** Maximum number of transport attempts when the server returns a transient status (503/429). */
const MAX_TRANSIENT_ATTEMPTS = 3;
/** Base backoff delay (ms) used between transient retries. */
const BASE_BACKOFF_MS = 500;
/** Upper bound (ms) on the exponential transient backoff. */
const MAX_BACKOFF_MS = 4000;
/** Maximum attempts for a full-day plan when AI returns structurally valid but unusable meals. */
const MAX_FULL_DAY_ATTEMPTS = 3;
/** Maximum attempts for fridge suggestions when AI returns incoherent meal ideas. */
const MAX_FRIDGE_ATTEMPTS = 2;

/** Structured-output schema for a single meal. */
const SINGLE_MEAL_SCHEMA = MEAL_SCHEMA;
/** Structured-output schema for an array of meals (e.g. full-day generation). */
const MEAL_ARRAY_SCHEMA = { type: 'array', items: MEAL_SCHEMA } as const;

/**
 * Transport-layer error carrying a classified {@link GeminiErrorKind}. The
 * `message` is always the Polish, key-free text produced by `errorMessage`, so
 * callers can surface it directly without leaking the API key.
 */
class GeminiError extends Error {
  readonly kind: GeminiErrorKind;
  constructor(kind: GeminiErrorKind, message: string) {
    super(message);
    this.name = 'GeminiError';
    this.kind = kind;
  }
}

export class GeminiClient {
  private apiKey: string;
  private model: string;
  private timeoutMs: number;

  constructor(apiKey: string, opts?: { model?: string; timeoutMs?: number }) {
    this.apiKey = apiKey;
    this.model = opts?.model ?? DEFAULT_MODEL;
    this.timeoutMs = clampTimeout(opts?.timeoutMs);
  }

  async swapMeal(
    currentMeal: Meal,
    userProfile: UserProfile,
    userComment?: string,
    sameDayTitles?: string[]
  ): Promise<GeminiResponse> {
    if (!this.hasKey()) {
      return { success: false, error: errorMessage('missing_key') };
    }

    const prompt = buildSwapPrompt(currentMeal, userProfile, userComment, sameDayTitles);

    // Collect every valid candidate produced across the swap attempts; the pure
    // `selectSwapResult` decides the final winner (in-band first, else closest).
    const candidates: Meal[] = [];

    try {
      // At most MAX_SWAP_ATTEMPTS requests, one callGemini per iteration
      // (Requirement 8.2). Stop early on the first in-band hit (Requirement 8.1).
      for (let attempt = 0; attempt < MAX_SWAP_ATTEMPTS; attempt++) {
        const parsed = await this.callGemini(prompt, SINGLE_MEAL_SCHEMA);

        // Strict validation runs on the parsed Omit<Meal,'id'|'eaten'> payload
        // BEFORE the client-only id/eaten fields are assigned.
        if (validateMealStrict(parsed)) {
          const candidate: Meal = {
            ...parsed,
            id: crypto.randomUUID(),
            eaten: false,
          };
          if (!this.isReasonableGeneratedMeal(candidate, userProfile, sameDayTitles ?? [])) {
            continue;
          }
          candidates.push(candidate);

          // First in-band candidate accepted immediately, halting further requests.
          if (isWithinKcalBand(candidate.kcal, currentMeal.kcal)) {
            break;
          }
        }
      }

      // Closest-candidate fallback or failure is decided by the pure selector.
      const selection = selectSwapResult(candidates, currentMeal.kcal);
      if (selection.kind === 'success') {
        return { success: true, data: selection.meal };
      }

      // Total failure: surface a Polish, key-free message and leave the
      // original Meal untouched (Requirement 8.5).
      return { success: false, error: errorMessage('processing') };
    } catch (err) {
      return { success: false, error: this.toErrorMessage(err) };
    }
  }

  async generateFullDay(
    userProfile: UserProfile,
    otherDays?: DayPlan[],
    existingMeals?: Meal[]
  ): Promise<GeminiResponse> {
    if (!this.hasKey()) {
      return { success: false, error: errorMessage('missing_key') };
    }

    const prompt = buildFullDayPrompt(userProfile, otherDays, existingMeals);

    try {
      const existingTitles = [
        ...(existingMeals ?? []).map(meal => meal.title),
        ...(otherDays ?? []).flatMap(day => day.meals.map(meal => meal.title)),
      ];

      for (let attempt = 0; attempt < MAX_FULL_DAY_ATTEMPTS; attempt++) {
        const parsed = await this.callGemini(prompt, MEAL_ARRAY_SCHEMA);

        // Every item must pass the STRICT validator before client-only id/eaten
        // fields are assigned (Requirements 7.5, 5.2).
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(item => validateMealStrict(item))) {
          const meals: Meal[] = parsed.map(parsedMeal => ({
            ...parsedMeal,
            id: crypto.randomUUID(),
            eaten: false,
          }));
          if (this.areReasonableGeneratedMeals(meals, userProfile, existingTitles)) {
            return { success: true, data: meals };
          }
        }
      }

      return { success: false, error: errorMessage('processing') };
    } catch (err) {
      return { success: false, error: this.toErrorMessage(err) };
    }
  }

  async generateFromFridge(
    ingredients: string,
    mealType: string,
    userProfile: UserProfile
  ): Promise<GeminiResponse> {
    if (!this.hasKey()) {
      return { success: false, error: errorMessage('missing_key') };
    }

    const prompt = buildFridgePrompt(ingredients, mealType, userProfile);

    try {
      for (let attempt = 0; attempt < MAX_FRIDGE_ATTEMPTS; attempt++) {
        const parsed = await this.callGemini(prompt, MEAL_ARRAY_SCHEMA);

        // Every item must pass the STRICT validator before client-only id/eaten
        // fields are assigned (Requirements 7.5, 5.2).
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(item => validateMealStrict(item))) {
          const meals: Meal[] = parsed.map(parsedMeal => ({
            ...parsedMeal,
            id: crypto.randomUUID(),
            eaten: false,
          }));
          if (this.areReasonableGeneratedMeals(meals, userProfile, [])) {
            return { success: true, data: meals };
          }
        }
      }

      return { success: false, error: errorMessage('processing') };
    } catch (err) {
      return { success: false, error: this.toErrorMessage(err) };
    }
  }

  async estimateMealFromDescription(
    description: string,
    mealType: MealType
  ): Promise<GeminiResponse> {
    if (!this.hasKey()) {
      return { success: false, error: errorMessage('missing_key') };
    }

    const prompt = buildEstimatePrompt(description, mealType);

    try {
      const parsed = await this.callGemini(prompt, SINGLE_MEAL_SCHEMA);

      // The estimate prompt omits `type`; the strict validator requires a valid
      // MealType, so inject the caller-supplied mealType before validating
      // (Requirements 7.5, 5.2).
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const withType = { ...(parsed as Record<string, unknown>), type: mealType };
        if (validateMealStrict(withType)) {
          const meal: Meal = {
            ...withType,
            id: crypto.randomUUID(),
            eaten: false,
          };
          return { success: true, data: meal };
        }
      }

      return { success: false, error: errorMessage('processing') };
    } catch (err) {
      return { success: false, error: this.toErrorMessage(err) };
    }
  }

  /** True when a usable (non-empty, non-whitespace) API key is configured. */
  private hasKey(): boolean {
    return this.apiKey.trim().length > 0;
  }

  private isReasonableGeneratedMeal(
    meal: Meal,
    userProfile: UserProfile,
    existingTitles: string[]
  ): boolean {
    return isGeneratedMealReasonable(meal, {
      preferredIngredients: userProfile.preferredIngredients,
      existingTitles,
      maxPreferredMatches: 2,
    });
  }

  private areReasonableGeneratedMeals(
    meals: Meal[],
    userProfile: UserProfile,
    existingTitles: string[]
  ): boolean {
    const seenTitles = [...existingTitles];
    for (const meal of meals) {
      if (!this.isReasonableGeneratedMeal(meal, userProfile, seenTitles)) {
        return false;
      }
      seenTitles.push(meal.title);
    }
    return true;
  }

  /** Builds a key-free transport error for the given kind. */
  private fail(kind: GeminiErrorKind): GeminiError {
    return new GeminiError(kind, stripKey(errorMessage(kind), this.apiKey));
  }

  /** Converts a caught error into a Polish, key-free message for a GeminiResponse. */
  private toErrorMessage(err: unknown): string {
    if (err instanceof GeminiError) {
      return err.message;
    }
    if (err instanceof Error) {
      return stripKey(err.message, this.apiKey);
    }
    return errorMessage('unknown');
  }

  /**
   * Transport layer: issues a single structured-output Gemini request for
   * `prompt`, bounded by an abortable timeout, retrying only on transient
   * server statuses (503/429) with capped exponential backoff. Returns the
   * parsed JSON value from a single `JSON.parse` of the returned text.
   *
   * - Requests structured output via `responseMimeType: 'application/json'`
   *   and the supplied `responseSchema` (Requirement 7.1).
   * - Applies an `AbortController` + `setTimeout(clampedTimeout)`; on timeout it
   *   aborts the in-flight request and discards any partial data
   *   (Requirements 6.1, 6.2, 6.3).
   * - Short-circuits with a `missing_key` failure when the key is empty or
   *   whitespace, issuing no request (Requirement 5.4).
   * - Performs a single `JSON.parse` with no text-extraction fallbacks
   *   (Requirement 7.2).
   *
   * Throws a {@link GeminiError} carrying the classified kind on failure.
   */
  private async callGemini(prompt: string, schema: unknown): Promise<unknown> {
    // Short-circuit: empty/whitespace key issues no request (Requirement 5.4).
    if (!this.hasKey()) {
      throw this.fail('missing_key');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    for (let attempt = 0; attempt < MAX_TRANSIENT_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        const backoff = Math.min(BASE_BACKOFF_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS);
        await new Promise(resolve => setTimeout(resolve, backoff));
      }

      const response = await this.fetchWithTimeout(url, body);

      if (response.ok) {
        const data: GeminiApiResponse = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (isRawLoggingAllowed()) {
          // Raw AI response logging permitted in development only (Requirement 9.2).
          console.log('[Gemini raw response]:', typeof text === 'string' ? text.slice(0, 500) : text);
        }

        if (typeof text !== 'string') {
          throw this.fail('processing');
        }

        // Single JSON.parse, no fallback text-extraction strategies (Requirement 7.2).
        try {
          return JSON.parse(text);
        } catch {
          throw this.fail('processing');
        }
      }

      // Retry only on transient statuses (503/429) with capped backoff.
      if (response.status === 503 || response.status === 429) {
        // Operational diagnostic — permitted in production (Requirement 9.4).
        console.warn(`[Gemini] Attempt ${attempt + 1} failed with ${response.status}, retrying...`);
        continue;
      }

      // Fatal (non-transient) status: classify and stop retrying.
      const errorText = await response.text();
      throw this.fail(classifyGeminiError(response.status, errorText));
    }

    // Transient retries exhausted.
    throw this.fail('transient');
  }

  /**
   * Performs a single `fetch` bounded by the clamped timeout. On timeout the
   * request is aborted and a `timeout` GeminiError is thrown so the caller
   * surfaces a Polish timeout message and discards any partial data
   * (Requirements 6.2, 6.3).
   */
  private async fetchWithTimeout(url: string, body: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      });
    } catch {
      if (controller.signal.aborted) {
        throw this.fail('timeout');
      }
      throw this.fail('unknown');
    } finally {
      clearTimeout(timer);
    }
  }
}

// Internal type for Gemini API response structure
interface GeminiApiResponse {
  candidates?: {
    content?: {
      parts?: {
        text?: string;
      }[];
    };
  }[];
}

// Backward-compatible standalone function exports for existing consumers
export async function swapMeal(
  currentMeal: Meal,
  userProfile: UserProfile,
  apiKey: string,
  userComment?: string,
  sameDayTitles?: string[]
): Promise<GeminiResponse> {
  const client = new GeminiClient(apiKey || DEFAULT_GEMINI_KEY);
  return client.swapMeal(currentMeal, userProfile, userComment, sameDayTitles);
}

export async function generateFullDay(
  userProfile: UserProfile,
  apiKey: string,
  otherDays?: DayPlan[],
  existingMeals?: Meal[]
): Promise<GeminiResponse> {
  const client = new GeminiClient(apiKey || DEFAULT_GEMINI_KEY);
  return client.generateFullDay(userProfile, otherDays, existingMeals);
}

export async function generateFromFridge(
  ingredients: string,
  mealType: string,
  userProfile: UserProfile,
  apiKey: string
): Promise<GeminiResponse> {
  const client = new GeminiClient(apiKey || DEFAULT_GEMINI_KEY);
  return client.generateFromFridge(ingredients, mealType, userProfile);
}

export async function estimateMealFromDescription(
  description: string,
  mealType: MealType,
  apiKey: string
): Promise<GeminiResponse> {
  const client = new GeminiClient(apiKey || DEFAULT_GEMINI_KEY);
  return client.estimateMealFromDescription(description, mealType);
}
