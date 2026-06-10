import { describe, it, expect } from 'vitest';
import { generateShoppingList } from './shoppingList';
import type { DayPlan, Meal } from '../types';

function meal(ingredients: string[]): Meal {
  return {
    id: crypto.randomUUID(),
    type: 'Obiad',
    title: 'test',
    kcal: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    ingredients,
    instruction: '',
    eaten: false,
  };
}

function day(date: string, ingredients: string[]): DayPlan {
  return { date, meals: [meal(ingredients)] };
}

describe('generateShoppingList', () => {
  it('sums the same piece-based ingredient across days', () => {
    const result = generateShoppingList([
      day('2026-01-01', ['banan (1 szt.)']),
      day('2026-01-02', ['banan (1 szt.)']),
    ]);
    expect(result).toContain('banan (2 szt.)');
  });

  it('sums gram-based quantities', () => {
    const result = generateShoppingList([
      day('2026-01-01', ['ryż (200g)']),
      day('2026-01-02', ['ryż (200g)']),
    ]);
    expect(result).toContain('ryż (400g)');
  });

  it('sums fractional pieces into whole units', () => {
    const result = generateShoppingList([
      day('2026-01-01', ['pudding proteinowy (1/2 szt.)']),
      day('2026-01-02', ['pudding proteinowy (1/2 szt.)']),
    ]);
    expect(result).toContain('pudding proteinowy (1 szt.)');
  });

  it('sums ml-based quantities', () => {
    const result = generateShoppingList([
      day('2026-01-01', ['mleko (50ml)']),
      day('2026-01-02', ['mleko (50ml)']),
    ]);
    expect(result).toContain('mleko (100ml)');
  });

  it('keeps different units of the same name separate', () => {
    const result = generateShoppingList([
      day('2026-01-01', ['ser (40g)']),
      day('2026-01-02', ['ser (1 szt.)']),
    ]);
    expect(result).toContain('ser (40g)');
    expect(result).toContain('ser (1 szt.)');
  });

  it('deduplicates non-quantified ingredients', () => {
    const result = generateShoppingList([
      day('2026-01-01', ['przyprawy (sól, pieprz)']),
      day('2026-01-02', ['przyprawy (sól, pieprz)']),
    ]);
    expect(result.filter(i => i === 'przyprawy (sól, pieprz)')).toHaveLength(1);
  });

  it('is case-insensitive on the ingredient name', () => {
    const result = generateShoppingList([
      day('2026-01-01', ['Banan (1 szt.)']),
      day('2026-01-02', ['banan (1 szt.)']),
    ]);
    const bananas = result.filter(i => i.toLowerCase().startsWith('banan'));
    expect(bananas).toHaveLength(1);
    expect(bananas[0].toLowerCase()).toContain('2 szt.');
  });
});
