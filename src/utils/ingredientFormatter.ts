import type { IngredientEntry, WeightUnit } from '../types/openfoodfacts';

/**
 * Formats an ingredient entry as "{name} - {weight}g" or "{name} - {weight}ml".
 */
export function formatIngredient(entry: IngredientEntry): string {
  const unitLabel = entry.unit || 'g';
  return `${entry.name} - ${entry.weight}${unitLabel}`;
}

/**
 * Formats all ingredient entries for a meal's ingredients array.
 */
export function formatIngredients(entries: IngredientEntry[]): string[] {
  return entries.map(formatIngredient);
}

/**
 * Parses a formatted ingredient string back into name and weight.
 * Expected format: "{name} - {weight}g" or "{name} - {weight}ml"
 * Returns null if the string doesn't match the expected format.
 */
export function parseIngredient(formatted: string): IngredientEntry | null {
  const lastDashIndex = formatted.lastIndexOf(' - ');
  if (lastDashIndex === -1) return null;

  const name = formatted.substring(0, lastDashIndex);
  const weightPart = formatted.substring(lastDashIndex + 3); // skip " - "

  let unit: WeightUnit = 'g';
  let weightStr: string;

  if (weightPart.endsWith('ml')) {
    unit = 'ml';
    weightStr = weightPart.slice(0, -2);
  } else if (weightPart.endsWith('g')) {
    unit = 'g';
    weightStr = weightPart.slice(0, -1);
  } else {
    return null;
  }

  const weight = Number(weightStr);
  if (!name || isNaN(weight) || weight <= 0) return null;

  return { name, weight, unit };
}
