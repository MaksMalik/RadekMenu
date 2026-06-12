import { describe, expect, it } from 'vitest';
import {
  countPreferredIngredientMatches,
  hasIncoherentIngredientPair,
  isGeneratedMealReasonable,
  isSimilarMealTitle,
} from './geminiLogic';
import type { Meal } from '../types';

function meal(overrides: Partial<Meal>): Meal {
  return {
    id: '1',
    type: 'Obiad',
    title: 'Kurczak z ziemniakami',
    kcal: 500,
    protein: 40,
    carbs: 50,
    fats: 15,
    ingredients: ['kurczak (150g)', 'ziemniaki (250g)'],
    instruction: 'Przygotuj posiłek.',
    eaten: false,
    ...overrides,
  };
}

describe('AI meal reasonability guards', () => {
  it('rejects snack and deli-meat combinations such as popcorn with ham', () => {
    const candidate = meal({
      type: 'Przekąska',
      title: 'Popcorn z szynką',
      ingredients: ['popcorn (40g)', 'szynka z kurczaka (60g)'],
    });

    expect(hasIncoherentIngredientPair(candidate)).toBe(true);
    expect(isGeneratedMealReasonable(candidate)).toBe(false);
  });

  it('allows a normal coherent meal', () => {
    const candidate = meal({
      title: 'Makaron z indykiem i sosem jogurtowym',
      ingredients: ['makaron (80g)', 'indyk (150g)', 'jogurt grecki (80g)'],
    });

    expect(isGeneratedMealReasonable(candidate)).toBe(true);
  });

  it('counts preferred ingredients and rejects overfitted meals', () => {
    const candidate = meal({
      title: 'Wrap z kurczakiem, serem i szynką',
      ingredients: ['wrap pszenny (1 szt.)', 'kurczak (120g)', 'ser żółty (30g)', 'szynka z kurczaka (40g)'],
    });

    expect(countPreferredIngredientMatches(candidate, ['wrap pszenny', 'kurczak', 'ser żółty', 'szynka z kurczaka'])).toBe(4);
    expect(isGeneratedMealReasonable(candidate, {
      preferredIngredients: ['wrap pszenny', 'kurczak', 'ser żółty', 'szynka z kurczaka'],
      maxPreferredMatches: 2,
    })).toBe(false);
  });

  it('detects similar meal titles for variety checks', () => {
    expect(isSimilarMealTitle('Kurczak z ziemniakami z Airfryera', 'Złociste ziemniaczki z kurczakiem')).toBe(true);
    expect(isSimilarMealTitle('Skyr z owocami', 'Makaron z indykiem')).toBe(false);
  });
});
