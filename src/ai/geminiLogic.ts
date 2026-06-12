/**
 * Pure logic and configuration for the Gemini AI layer.
 *
 * This module holds the decision logic and configuration extracted from
 * `GeminiClient` so it can be reasoned about and tested deterministically.
 * Task 1.1 establishes the configuration constants, the structured-output
 * `MEAL_SCHEMA`, and the `GeminiErrorKind` type union. Subsequent tasks add
 * the pure functions (validation, swap selection, error classification, key
 * masking, etc.).
 */

import type { Meal, MealType } from '../types';

/**
 * The five recognized meal types, mirroring the `MealType` union in
 * `src/types.ts`. Used to constrain the structured-output schema's `type`
 * field and (later) strict meal validation.
 */
export const MEAL_TYPES: readonly MealType[] = [
  'Śniadanie',
  'II Śniadanie',
  'Obiad',
  'Przekąska',
  'Kolacja',
];

/**
 * Documented, generally available Gemini model ids that the client is allowed
 * to use (per Google's published models list). Requirement 5.1 requires the
 * configured model to be present in this list.
 */
export const SUPPORTED_MODELS: readonly string[] = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
];

/** Default low-latency model. Must be a member of `SUPPORTED_MODELS`. */
export const DEFAULT_MODEL = 'gemini-3.1-flash-lite';

/** ±5% caloric tolerance band used to accept a swapped meal (Requirement 8.1). */
export const KCAL_BAND = 0.05;

/** Maximum number of Gemini requests issued for a single meal swap (Requirement 8.2). */
export const MAX_SWAP_ATTEMPTS = 4;

/** Default request timeout in milliseconds when none is configured (Requirement 6.1). */
export const DEFAULT_TIMEOUT_MS = 30000;

/** Minimum allowed (clamped) request timeout in milliseconds (Requirement 6.1). */
export const MIN_TIMEOUT_MS = 1000;

/** Maximum allowed (clamped) request timeout in milliseconds (Requirement 6.1). */
export const MAX_TIMEOUT_MS = 30000;

/** Uniform character used to mask every character of the API key (Requirement 10.3). */
export const MASK_CHAR = '•';

/**
 * Gemini structured-output response schema mirroring the validated `Meal`
 * shape, excluding the client-only `id`/`eaten` fields (Requirement 7.1).
 * Supplied as `generationConfig.responseSchema` to force schema-conformant
 * JSON output.
 */
export const MEAL_SCHEMA = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['Śniadanie', 'II Śniadanie', 'Obiad', 'Przekąska', 'Kolacja'] },
    title: { type: 'string' },
    kcal: { type: 'number' },
    protein: { type: 'number' },
    carbs: { type: 'number' },
    fats: { type: 'number' },
    ingredients: { type: 'array', items: { type: 'string' } },
    instruction: { type: 'string' },
    tip: { type: 'string' },
  },
  required: ['type', 'title', 'kcal', 'protein', 'carbs', 'fats', 'ingredients', 'instruction'],
} as const;

/**
 * Classification of a Gemini failure used to decide whether to retry and which
 * Polish, key-free message to surface.
 *
 * - `invalid_model` — model name is invalid/unsupported (fatal, no retry).
 * - `invalid_key`   — API key is invalid/unauthorized (fatal, no retry).
 * - `missing_key`   — no API key configured (short-circuits, no request).
 * - `timeout`       — request exceeded the configured timeout.
 * - `transient`     — retryable server status (e.g. 503/429).
 * - `processing`    — response could not be parsed or failed validation.
 * - `unknown`       — any other unclassified failure.
 */
export type GeminiErrorKind =
  | 'invalid_model'
  | 'invalid_key'
  | 'missing_key'
  | 'timeout'
  | 'transient'
  | 'processing'
  | 'unknown';

/**
 * Set of recognized `MealType` values, used for O(1) membership checks in
 * `validateMeal`. Derived from `MEAL_TYPES` so the two stay in sync.
 */
const MEAL_TYPE_SET: ReadonlySet<string> = new Set<string>(MEAL_TYPES);

/** True when `value` is a finite number greater than or equal to 0. */
function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/** True when `value` is a non-empty string (after trimming whitespace). */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Strict structural validation of a parsed Gemini meal payload
 * (Requirements 7.3, 7.4).
 *
 * Unlike the previous lenient normalization, this guard:
 * - rejects the legacy `calories`/`instructions` aliases by requiring the
 *   canonical `kcal`/`instruction` fields (an object carrying only the aliases
 *   fails because the canonical fields are absent);
 * - requires `type` to be one of the five recognized `MealType` values;
 * - requires `title` and `instruction` to be non-empty strings;
 * - requires `kcal`, `protein`, `carbs`, and `fats` to be finite numbers
 *   greater than or equal to 0;
 * - requires `ingredients` to be a non-empty array of strings;
 * - requires `tip`, when present, to be a string.
 *
 * Returns a type predicate narrowing to the validated meal shape, excluding the
 * client-only `id`/`eaten` fields which are assigned by the App.
 */
export function validateMeal(obj: unknown): obj is Omit<Meal, 'id' | 'eaten'> {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return false;
  }

  const meal = obj as Record<string, unknown>;

  // `type` must be one of the five recognized MealType values.
  if (typeof meal.type !== 'string' || !MEAL_TYPE_SET.has(meal.type)) {
    return false;
  }

  // `title` and `instruction` must be non-empty strings (rejects `instructions` alias).
  if (!isNonEmptyString(meal.title) || !isNonEmptyString(meal.instruction)) {
    return false;
  }

  // Macro fields must be finite numbers >= 0 (rejects `calories` alias for `kcal`).
  if (
    !isNonNegativeFinite(meal.kcal) ||
    !isNonNegativeFinite(meal.protein) ||
    !isNonNegativeFinite(meal.carbs) ||
    !isNonNegativeFinite(meal.fats)
  ) {
    return false;
  }

  // `ingredients` must be a non-empty array of strings.
  if (
    !Array.isArray(meal.ingredients) ||
    meal.ingredients.length === 0 ||
    !meal.ingredients.every((item) => typeof item === 'string')
  ) {
    return false;
  }

  // `tip`, when present, must be a string.
  if (meal.tip !== undefined && typeof meal.tip !== 'string') {
    return false;
  }

  return true;
}

/**
 * Result of a pure swap-candidate selection (Requirement 8).
 *
 * - `{ kind: 'success'; meal }` — a candidate was selected (either an in-band
 *   candidate or the closest-by-kcal fallback).
 * - `{ kind: 'failure' }`       — no valid candidate was produced.
 */
export type SwapSelection =
  | { kind: 'success'; meal: Meal }
  | { kind: 'failure' };

/**
 * True when `kcal` lies within the ±5% Kcal_Tolerance_Band around
 * `originalKcal` — that is, greater than or equal to 95% and less than or
 * equal to 105% of the original value (Requirement 8.1).
 *
 * The band is derived from the shared `KCAL_BAND` constant so the tolerance
 * stays consistent across the swap logic.
 */
export function isWithinKcalBand(kcal: number, originalKcal: number): boolean {
  const lower = originalKcal * (1 - KCAL_BAND);
  const upper = originalKcal * (1 + KCAL_BAND);
  return kcal >= lower && kcal <= upper;
}

/**
 * Pure selection over the candidate meals produced during a meal swap
 * (Requirements 8.1, 8.3, 8.4, 8.5).
 *
 * Selection rules, in order:
 * 1. If at least one candidate falls within the Kcal_Tolerance_Band, return the
 *    earliest such in-band candidate (8.1).
 * 2. Otherwise, return the candidate whose absolute `kcal` difference from
 *    `originalKcal` is smallest, breaking ties by earliest position (8.3, 8.4).
 * 3. If the sequence contains no candidate at all, return a failure (8.5).
 *
 * Candidates are assumed to already be valid meals (validated by the caller).
 * Order of `candidates` reflects production order, so array index serves as the
 * earliest-position tie-break.
 */
export function selectSwapResult(candidates: Meal[], originalKcal: number): SwapSelection {
  // No candidate produced — swap failed (8.5).
  if (candidates.length === 0) {
    return { kind: 'failure' };
  }

  // Earliest in-band candidate wins (8.1).
  for (const candidate of candidates) {
    if (isWithinKcalBand(candidate.kcal, originalKcal)) {
      return { kind: 'success', meal: candidate };
    }
  }

  // No in-band candidate: choose the smallest absolute kcal difference, with
  // earliest position breaking ties (8.3, 8.4). Strict `<` preserves the
  // earliest candidate on ties because earlier items are visited first.
  let best = candidates[0];
  let bestDiff = Math.abs(best.kcal - originalKcal);
  for (let i = 1; i < candidates.length; i++) {
    const diff = Math.abs(candidates[i].kcal - originalKcal);
    if (diff < bestDiff) {
      best = candidates[i];
      bestDiff = diff;
    }
  }

  return { kind: 'success', meal: best };
}

const SNACK_BASE_TERMS = [
  'popcorn',
  'chips',
  'chipsy',
  'chrupki',
  'czekolada',
  'zelki',
  'żelki',
];

const MEAT_TERMS = [
  'szynka',
  'wedlina',
  'wędlina',
  'kurczak',
  'indyk',
  'wolowina',
  'wołowina',
  'wieprzowina',
  'schab',
  'mieso',
  'mięso',
  'boczek',
  'salami',
];

const SWEET_SPREAD_TERMS = [
  'dzem',
  'dżem',
  'konfitura',
  'nutella',
  'miod',
  'miód',
];

const TITLE_STOP_WORDS = new Set([
  'z',
  'ze',
  'i',
  'w',
  'we',
  'na',
  'do',
  'dla',
  'oraz',
  'lekki',
  'lekka',
  'lekkie',
  'chrupiace',
  'chrupiące',
  'kremowy',
  'kremowa',
]);

function normalizeFoodText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mealSearchText(meal: Pick<Meal, 'title' | 'ingredients'>): string {
  return normalizeFoodText(`${meal.title} ${meal.ingredients.join(' ')}`);
}

function containsAny(text: string, terms: string[]): boolean {
  return terms.some(term => text.includes(normalizeFoodText(term)));
}

function titleTokens(title: string): Set<string> {
  return new Set(
    normalizeFoodText(title)
      .split(' ')
      .filter(token => token.length >= 3 && !TITLE_STOP_WORDS.has(token))
      .map(canonicalTitleToken)
  );
}

function canonicalTitleToken(token: string): string {
  const knownRoots: Array<[string, string]> = [
    ['kurcz', 'kurczak'],
    ['ziemni', 'ziemniak'],
    ['indyk', 'indyk'],
    ['indy', 'indyk'],
    ['wolow', 'wolowina'],
    ['mielon', 'mielone'],
    ['szynk', 'szynka'],
    ['makaron', 'makaron'],
    ['jaj', 'jajko'],
    ['skyr', 'skyr'],
    ['wrap', 'wrap'],
    ['tortill', 'tortilla'],
  ];

  const root = knownRoots.find(([prefix]) => token.startsWith(prefix));
  if (root) return root[1];

  return token.replace(/(ami|ach|ego|ymi|owy|owa|owe|em|ie|ej|a|u|y)$/u, '');
}

export function isSimilarMealTitle(a: string, b: string): boolean {
  const aTokens = titleTokens(a);
  const bTokens = titleTokens(b);
  if (aTokens.size === 0 || bTokens.size === 0) return false;

  let intersection = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) intersection++;
  }

  const smaller = Math.min(aTokens.size, bTokens.size);
  const larger = Math.max(aTokens.size, bTokens.size);
  return intersection / smaller >= 0.75 || intersection / larger >= 0.6;
}

export function hasIncoherentIngredientPair(meal: Pick<Meal, 'title' | 'ingredients' | 'type'>): boolean {
  const text = mealSearchText(meal);
  const hasSnackBase = containsAny(text, SNACK_BASE_TERMS);
  const hasMeat = containsAny(text, MEAT_TERMS);
  const hasSweetSpread = containsAny(text, SWEET_SPREAD_TERMS);

  if (hasSnackBase && hasMeat) {
    return true;
  }

  if (hasSweetSpread && hasMeat) {
    return true;
  }

  if ((meal.type === 'Obiad' || meal.type === 'Kolacja') && hasSnackBase) {
    const title = normalizeFoodText(meal.title);
    return !title.includes('przekaska') && !title.includes('przekąska');
  }

  return false;
}

export function countPreferredIngredientMatches(
  meal: Pick<Meal, 'title' | 'ingredients'>,
  preferredIngredients: string[]
): number {
  const text = mealSearchText(meal);
  const uniqueMatches = new Set<string>();

  for (const ingredient of preferredIngredients) {
    const normalized = normalizeFoodText(ingredient);
    if (normalized.length >= 3 && text.includes(normalized)) {
      uniqueMatches.add(normalized);
    }
  }

  return uniqueMatches.size;
}

export interface GeneratedMealReasonOptions {
  preferredIngredients?: string[];
  existingTitles?: string[];
  maxPreferredMatches?: number;
}

export function isGeneratedMealReasonable(
  meal: Meal,
  options: GeneratedMealReasonOptions = {}
): boolean {
  if (hasIncoherentIngredientPair(meal)) {
    return false;
  }

  const preferredMatches = countPreferredIngredientMatches(
    meal,
    options.preferredIngredients ?? []
  );
  if (preferredMatches > (options.maxPreferredMatches ?? 2)) {
    return false;
  }

  const existingTitles = options.existingTitles ?? [];
  return !existingTitles.some(title => isSimilarMealTitle(meal.title, title));
}

/**
 * Maps an HTTP status code plus a response body (or thrown-error text) to a
 * `GeminiErrorKind` describing whether the failure is fatal or retryable and
 * which Polish message to surface (Requirements 5.2, 5.3, 6.2, 7.5).
 *
 * Classification rules, evaluated in priority order:
 * 1. A transient server status (503 Service Unavailable, 429 Too Many Requests)
 *    is retryable → `transient`.
 * 2. An unauthorized status (401, 403) or a body indicating an invalid/expired
 *    API key is a fatal authentication failure → `invalid_key`.
 * 3. A bad-request/not-found status (400, 404) whose body indicates the model
 *    is unknown, not found, or not supported is a fatal model-configuration
 *    failure → `invalid_model`.
 * 4. A body indicating the request timed out or was aborted → `timeout`.
 * 5. Anything else → `unknown`.
 *
 * `missing_key` and `processing` are not derived here: `missing_key` is decided
 * before any request is issued (empty/whitespace key short-circuit), and
 * `processing` is decided by the parse/validation step. Both are still handled
 * by `errorMessage` so callers can produce their Polish text.
 *
 * The body is matched case-insensitively. The API key is never inspected or
 * echoed, so the resulting classification (and its message) stays key-free.
 */
export function classifyGeminiError(status: number | undefined, body: string): GeminiErrorKind {
  const text = (body ?? '').toLowerCase();

  // 1. Retryable server-side statuses.
  if (status === 503 || status === 429) {
    return 'transient';
  }

  // 2. Authentication / authorization failures (fatal).
  if (status === 401 || status === 403) {
    return 'invalid_key';
  }
  if (
    text.includes('api key not valid') ||
    text.includes('api_key_invalid') ||
    text.includes('invalid api key') ||
    text.includes('invalid authentication') ||
    text.includes('permission denied') ||
    text.includes('unauthenticated')
  ) {
    return 'invalid_key';
  }

  // 3. Invalid / unsupported model configuration (fatal).
  const mentionsModel = text.includes('model');
  const mentionsModelProblem =
    text.includes('not found') ||
    text.includes('not supported') ||
    text.includes('is not found') ||
    text.includes('unsupported') ||
    text.includes('does not exist') ||
    text.includes('was not found');
  if ((status === 400 || status === 404) && mentionsModel && mentionsModelProblem) {
    return 'invalid_model';
  }
  if (mentionsModel && mentionsModelProblem) {
    return 'invalid_model';
  }

  // 4. Timeout / aborted request.
  if (text.includes('timeout') || text.includes('timed out') || text.includes('aborted')) {
    return 'timeout';
  }

  // 5. Unclassified.
  return 'unknown';
}

/**
 * Polish, key-free user-facing message for a given `GeminiErrorKind`
 * (Requirements 5.2, 5.3, 5.4, 6.2, 7.5).
 *
 * Messages never contain the API key value and identify the cause where the
 * requirements call for it (invalid model, invalid key, missing key).
 */
export function errorMessage(kind: GeminiErrorKind): string {
  switch (kind) {
    case 'missing_key':
      return 'Brak klucza API Gemini.';
    case 'invalid_model':
      return 'Nieprawidłowa konfiguracja modelu AI. Wybrany model jest nieobsługiwany.';
    case 'invalid_key':
      return 'Nieprawidłowy klucz API Gemini. Sprawdź klucz w ustawieniach.';
    case 'timeout':
      return 'Przekroczono czas oczekiwania na odpowiedź AI. Spróbuj ponownie.';
    case 'transient':
      return 'Usługa AI jest chwilowo niedostępna. Spróbuj ponownie za chwilę.';
    case 'processing':
      return 'Nie udało się przetworzyć odpowiedzi AI. Spróbuj ponownie.';
    case 'unknown':
    default:
      return 'Wystąpił nieoczekiwany błąd podczas komunikacji z AI. Spróbuj ponownie.';
  }
}

/**
 * Clamps a configured request-timeout input to the valid inclusive range
 * [`MIN_TIMEOUT_MS`, `MAX_TIMEOUT_MS`] (Requirement 6.1).
 *
 * Resolution rules:
 * - `undefined` (no value configured) → `DEFAULT_TIMEOUT_MS` (30000 ms).
 * - A non-finite number (`NaN`, `Infinity`, `-Infinity`) → `DEFAULT_TIMEOUT_MS`.
 * - A finite number below the minimum → `MIN_TIMEOUT_MS`.
 * - A finite number above the maximum → `MAX_TIMEOUT_MS`.
 * - Any other finite number → returned unchanged.
 *
 * The result is always a finite number within [`MIN_TIMEOUT_MS`,
 * `MAX_TIMEOUT_MS`].
 */
export function clampTimeout(input: number | undefined): number {
  // Unconfigured or non-finite values fall back to the default.
  if (input === undefined || !Number.isFinite(input)) {
    return DEFAULT_TIMEOUT_MS;
  }

  if (input < MIN_TIMEOUT_MS) {
    return MIN_TIMEOUT_MS;
  }
  if (input > MAX_TIMEOUT_MS) {
    return MAX_TIMEOUT_MS;
  }
  return input;
}

/**
 * Masks every character of an API key with the uniform `MASK_CHAR`, returning a
 * string of the same length composed solely of mask characters so that none of
 * the original characters is visible (Requirement 10.3).
 *
 * Uses the string length (UTF-16 code unit count) so the masked output length
 * matches the input length exactly.
 */
export function maskApiKey(key: string): string {
  return MASK_CHAR.repeat(key.length);
}

/**
 * Removes every occurrence of the API key from a message as defense in depth,
 * ensuring the key value never leaks into a returned error string
 * (Requirement 10.4).
 *
 * An empty key is a no-op (there is nothing to strip, and splitting on an empty
 * string would otherwise corrupt the message). All other occurrences are
 * removed via a literal (non-regex) replacement so special characters in the
 * key are treated verbatim.
 */
export function stripKey(message: string, key: string): string {
  if (key.length === 0) {
    return message;
  }
  return message.split(key).join('');
}

/**
 * True only when raw AI response logging is permitted, i.e. when the app runs
 * in a development build where `import.meta.env.DEV` is strictly `true`
 * (Requirements 9.1, 9.3).
 *
 * Any other value — `false`, `undefined`, or an environment where the flag
 * cannot be evaluated — resolves to `false`, defaulting to the safe production
 * behavior that suppresses raw-response logging.
 */
export function isRawLoggingAllowed(): boolean {
  return import.meta.env?.DEV === true;
}
