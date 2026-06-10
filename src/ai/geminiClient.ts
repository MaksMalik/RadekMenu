import type { Meal, MealType, UserProfile, GeminiResponse, DayPlan } from '../types';
import { buildSwapPrompt, buildFullDayPrompt, buildFridgePrompt, buildEstimatePrompt } from './promptTemplates';

export type { GeminiResponse } from '../types';

const DEFAULT_GEMINI_KEY = '';

export class GeminiClient {
  private apiKey: string;
  private model = 'gemini-3.1-flash-lite';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async swapMeal(
    currentMeal: Meal,
    userProfile: UserProfile,
    userComment?: string,
    sameDayTitles?: string[]
  ): Promise<GeminiResponse> {
    if (!this.apiKey) {
      return { success: false, error: 'Brak klucza API Gemini.' };
    }

    const prompt = buildSwapPrompt(currentMeal, userProfile, userComment, sameDayTitles);

    // Hard kcal constraint: new meal must stay within ±5% of the original.
    const minKcal = currentMeal.kcal * 0.95;
    const maxKcal = currentMeal.kcal * 1.05;
    const MAX_ATTEMPTS = 4;

    let closest: Meal | null = null;
    let closestDiff = Infinity;

    try {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const text = await this.callGemini(prompt);
        const parsed = this.parseJsonResponse(text);

        if (parsed && !Array.isArray(parsed) && this.validateMeal(parsed)) {
          const candidate: Meal = {
            ...(parsed as Omit<Meal, 'id' | 'eaten'>),
            id: crypto.randomUUID(),
            eaten: false,
          };

          // Accept immediately if within the kcal tolerance.
          if (candidate.kcal >= minKcal && candidate.kcal <= maxKcal) {
            return { success: true, data: candidate };
          }

          // Otherwise remember the closest match and try again.
          const diff = Math.abs(candidate.kcal - currentMeal.kcal);
          if (diff < closestDiff) {
            closestDiff = diff;
            closest = candidate;
          }
          console.warn(
            `[Gemini] Swap attempt ${attempt + 1}: ${candidate.kcal} kcal outside ${Math.round(minKcal)}–${Math.round(maxKcal)} — retrying.`
          );
        }
      }

      // No candidate landed in range; return the closest one we found.
      if (closest) {
        return { success: true, data: closest };
      }

      return { success: false, error: 'Nie udało się przetworzyć odpowiedzi AI.' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nieznany błąd';
      return { success: false, error: message };
    }
  }

  async generateFullDay(
    userProfile: UserProfile,
    otherDays?: DayPlan[],
    existingMeals?: Meal[]
  ): Promise<GeminiResponse> {
    if (!this.apiKey) {
      return { success: false, error: 'Brak klucza API Gemini.' };
    }

    const prompt = buildFullDayPrompt(userProfile, otherDays, existingMeals);

    try {
      const text = await this.callGemini(prompt);
      const parsed = this.parseJsonResponse(text);

      if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(item => this.validateMeal(item))) {
        const meals: Meal[] = parsed.map(m => ({
          ...(m as Omit<Meal, 'id' | 'eaten'>),
          id: crypto.randomUUID(),
          eaten: false,
        }));
        return { success: true, data: meals };
      }

      if (Array.isArray(parsed)) {
        const failIdx = parsed.findIndex(item => !this.validateMeal(item));
        console.log('[Gemini] Validation failed at index:', failIdx, 'item:', parsed[failIdx]);
      } else {
        console.log('[Gemini] Parsed result is not an array:', typeof parsed, parsed);
      }

      return { success: false, error: 'Nie udało się przetworzyć odpowiedzi AI.' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nieznany błąd';
      return { success: false, error: message };
    }
  }

  async generateFromFridge(
    ingredients: string,
    mealType: string,
    userProfile: UserProfile
  ): Promise<GeminiResponse> {
    if (!this.apiKey) {
      return { success: false, error: 'Brak klucza API Gemini.' };
    }

    const prompt = buildFridgePrompt(ingredients, mealType, userProfile);

    try {
      const text = await this.callGemini(prompt);
      const parsed = this.parseJsonResponse(text);

      if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(item => this.validateMeal(item))) {
        const meals: Meal[] = parsed.map(m => ({
          ...(m as Omit<Meal, 'id' | 'eaten'>),
          id: crypto.randomUUID(),
          eaten: false,
        }));
        return { success: true, data: meals };
      }

      return { success: false, error: 'Nie udało się przetworzyć odpowiedzi AI.' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nieznany błąd';
      return { success: false, error: message };
    }
  }

  async estimateMealFromDescription(
    description: string,
    mealType: MealType
  ): Promise<GeminiResponse> {
    if (!this.apiKey) {
      return { success: false, error: 'Brak klucza API Gemini.' };
    }

    const prompt = buildEstimatePrompt(description, mealType);

    try {
      const text = await this.callGemini(prompt);
      const parsed = this.parseJsonResponse(text);

      if (parsed && !Array.isArray(parsed)) {
        const meal: Meal = {
          ...(parsed as Omit<Meal, 'id' | 'eaten' | 'type'>),
          id: crypto.randomUUID(),
          eaten: false,
          type: mealType,
        };
        return { success: true, data: meal };
      }

      return { success: false, error: 'Nie udało się przetworzyć odpowiedzi AI.' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nieznany błąd';
      return { success: false, error: message };
    }
  }

  private async callGemini(prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    let lastError = '';
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, 3000 * attempt));
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 4096,
          },
        }),
      });

      if (response.ok) {
        const data: GeminiApiResponse = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error('Brak odpowiedzi od AI.');
        }
        return text;
      }

      if (response.status === 503 || response.status === 429) {
        lastError = `Błąd API (${response.status}) — ponawiam...`;
        console.warn(`[Gemini] Attempt ${attempt + 1} failed with ${response.status}, retrying...`);
        continue;
      }

      const errorText = await response.text();
      throw new Error(`Błąd API (${response.status}): ${errorText}`);
    }

    throw new Error(lastError || 'Serwer AI niedostępny. Spróbuj za chwilę.');
  }

  private parseJsonResponse(text: string): Meal | Meal[] | null {
    // Log raw response for debugging
    console.log('[Gemini raw response]:', text.slice(0, 500));
    
    // Strategy 1: Try full JSON.parse
    try {
      return JSON.parse(text) as Meal | Meal[];
    } catch {
      // continue to next strategy
    }

    // Strategy 2: Extract from code fences (```json...```)
    const codeFenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeFenceMatch) {
      try {
        return JSON.parse(codeFenceMatch[1].trim()) as Meal | Meal[];
      } catch {
        // continue to next strategy
      }
    }

    // Strategy 3: Find first `[` or `{` and attempt parse
    const firstBracket = text.search(/[\[{]/);
    if (firstBracket !== -1) {
      const substr = text.slice(firstBracket);
      try {
        return JSON.parse(substr) as Meal | Meal[];
      } catch {
        // Try trimming trailing non-JSON content
        const lastBracket = Math.max(substr.lastIndexOf(']'), substr.lastIndexOf('}'));
        if (lastBracket !== -1) {
          try {
            return JSON.parse(substr.slice(0, lastBracket + 1)) as Meal | Meal[];
          } catch {
            // all strategies exhausted
          }
        }
      }
    }

    return null;
  }

  private validateMeal(obj: unknown): obj is Meal {
    if (!obj || typeof obj !== 'object') return false;
    const m = obj as Record<string, unknown>;
    // Accept both 'kcal' and 'calories' keys, normalize to kcal
    const hasKcal = typeof m.kcal === 'number' || typeof m.calories === 'number';
    // Accept both 'instruction' and 'instructions'
    const hasInstruction = typeof m.instruction === 'string' || typeof m.instructions === 'string';
    
    const valid = (
      typeof m.type === 'string' &&
      typeof m.title === 'string' &&
      hasKcal &&
      typeof m.protein === 'number' &&
      typeof m.carbs === 'number' &&
      typeof m.fats === 'number' &&
      Array.isArray(m.ingredients) &&
      hasInstruction
    );
    
    if (valid) {
      // Normalize calories → kcal
      if (typeof m.calories === 'number' && typeof m.kcal !== 'number') {
        (m as Record<string, unknown>).kcal = m.calories;
      }
      // Normalize instructions → instruction
      if (typeof m.instructions === 'string' && typeof m.instruction !== 'string') {
        (m as Record<string, unknown>).instruction = m.instructions;
      }
    }
    return valid;
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
