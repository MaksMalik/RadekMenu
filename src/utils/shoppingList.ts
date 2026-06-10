import type { DayPlan } from '../types';

/**
 * Generates a shopping list from all ingredients across the provided day plans.
 *
 * Ingredients are expected in the form `name (quantity unit)`, e.g.
 * `banan (1 szt.)`, `skyr naturalny (200g)`, `pudding proteinowy (1/2 szt.)`.
 *
 * - Same ingredient (case-insensitive name + same unit) is SUMMED across days
 *   and meals, e.g. `banan (1 szt.)` + `banan (1 szt.)` → `banan (2 szt.)`.
 * - Supports integers, decimals (`1,5` / `1.5`) and fractions (`1/2`).
 * - Ingredients without a parseable quantity (e.g. `przyprawy (sól, pieprz)`)
 *   are deduplicated and listed as-is.
 * - Result is sorted alphabetically using the Polish locale.
 * - Pure function, no side effects.
 */
export function generateShoppingList(dayPlans: DayPlan[]): string[] {
  // Quantified items grouped by `nameKey|unit` → accumulated total.
  const quantified = new Map<string, { name: string; unit: string; total: number }>();
  // Non-quantified items deduped by lowercased raw string.
  const plain = new Map<string, string>();

  for (const plan of dayPlans) {
    for (const meal of plan.meals) {
      for (const ingredient of meal.ingredients) {
        const raw = ingredient.trim();
        if (raw.length === 0) continue;

        const parsed = parseIngredient(raw);
        if (parsed) {
          const key = `${parsed.nameKey}|${parsed.unit}`;
          const existing = quantified.get(key);
          if (existing) {
            existing.total += parsed.quantity;
          } else {
            quantified.set(key, { name: parsed.name, unit: parsed.unit, total: parsed.quantity });
          }
        } else {
          const key = raw.toLowerCase();
          if (!plain.has(key)) plain.set(key, raw);
        }
      }
    }
  }

  const result: string[] = [];
  for (const { name, unit, total } of quantified.values()) {
    result.push(formatIngredient(name, total, unit));
  }
  for (const value of plain.values()) {
    result.push(value);
  }

  return result.sort((a, b) => a.localeCompare(b, 'pl'));
}

interface ParsedIngredient {
  name: string;
  nameKey: string;
  quantity: number;
  unit: string; // normalized unit key ('' when none)
}

/**
 * Parses an ingredient string of the form `name (quantity unit)`.
 * Returns null when there is no trailing parenthetical quantity that can be
 * interpreted numerically (e.g. spice lists like `przyprawy (sól, pieprz)`).
 */
function parseIngredient(raw: string): ParsedIngredient | null {
  const match = raw.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  if (!match) return null;

  const name = match[1].trim();
  if (name.length === 0) return null;

  const qty = parseQuantity(match[2]);
  if (!qty) return null;

  return {
    name,
    nameKey: name.toLowerCase(),
    quantity: qty.value,
    unit: normalizeUnit(qty.unit),
  };
}

/** Parses a leading number (integer, decimal or fraction) + optional unit. */
function parseQuantity(text: string): { value: number; unit: string } | null {
  const match = text.trim().match(/^(\d+\/\d+|\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!match) return null;

  let value: number;
  if (match[1].includes('/')) {
    const [num, den] = match[1].split('/').map(Number);
    if (!den) return null;
    value = num / den;
  } else {
    value = parseFloat(match[1].replace(',', '.'));
  }
  if (!Number.isFinite(value)) return null;

  return { value, unit: match[2].trim() };
}

/** Normalizes a unit to a grouping key. Sztuki variants collapse to `szt`. */
function normalizeUnit(unit: string): string {
  const u = unit.toLowerCase().replace(/\.+$/, '').trim();
  if (u === 'szt' || u === 'sztuka' || u === 'sztuki' || u === 'sztuk') return 'szt';
  return u;
}

const ATTACHED_UNITS = new Set(['g', 'kg', 'mg', 'ml', 'l', 'dag']);

function formatIngredient(name: string, total: number, unit: string): string {
  const num = formatNumber(total);
  if (unit.length === 0) return `${name} (${num})`;

  const unitDisplay = unit === 'szt' ? 'szt.' : unit;
  const qtyStr = ATTACHED_UNITS.has(unit) ? `${num}${unitDisplay}` : `${num} ${unitDisplay}`;
  return `${name} (${qtyStr})`;
}

/** Formats a number without trailing zeros, using a comma as decimal separator. */
function formatNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded
    .toFixed(2)
    .replace(/0+$/, '')
    .replace(/\.$/, '')
    .replace('.', ',');
}
