import type { DayPlan } from '../types';

/**
 * Generates a deduplicated, alphabetically sorted shopping list
 * from all ingredients across all meals in the provided day plans.
 *
 * - Deduplicates using case-insensitive comparison (keeps first occurrence's casing)
 * - Sorts alphabetically using Polish locale
 * - Pure function, no side effects
 */
export function generateShoppingList(dayPlans: DayPlan[]): string[] {
  const ingredientSet = new Map<string, string>(); // lowercase key → original value

  for (const plan of dayPlans) {
    for (const meal of plan.meals) {
      for (const ingredient of meal.ingredients) {
        const key = ingredient.toLowerCase().trim();
        if (key.length > 0 && !ingredientSet.has(key)) {
          ingredientSet.set(key, ingredient.trim());
        }
      }
    }
  }

  return Array.from(ingredientSet.values()).sort((a, b) =>
    a.localeCompare(b, 'pl')
  );
}
