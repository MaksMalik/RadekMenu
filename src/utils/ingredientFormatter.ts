import type { IngredientEntry } from '../types/openfoodfacts';

/**
 * Formats an ingredient entry as "{name} - {weight}g".
 */
export function formatIngredient(entry: IngredientEntry): string {
  return `${entry.name} - ${entry.weight}g`;
}

/**
 * Formats all ingredient entries for a meal's ingredients array.
 */
export function formatIngredients(entries: IngredientEntry[]): string[] {
  return entries.map(formatIngredient);
}

/**
 * Parses a formatted ingredient string back into name and weight.
 * Expected format: "{name} - {weight}g"
 * Returns null if the string doesn't match the expected format.
 */
export function parseIngredient(formatted: string): IngredientEntry | null {
  const lastDashIndex = formatted.lastIndexOf(' - ');
  if (lastDashIndex === -1) return null;

  const name = formatted.substring(0, lastDashIndex);
  const weightPart = formatted.substring(lastDashIndex + 3); // skip " - "

  if (!weightPart.endsWith('g')) return null;

  const weightStr = weightPart.slice(0, -1); // remove trailing 'g'
  const weight = Number(weightStr);

  if (!name || isNaN(weight) || weight <= 0) return null;

  return { name, weight };
}
