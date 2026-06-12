import { describe, expect, it } from 'vitest';
import {
  macroPercentagesFromProfile,
  macroTargetsFromCalories,
  macroTargetsFromProfile,
  rebalanceMacroPercentages,
} from './macroTargets';
import type { UserProfile } from '../types';

const baseProfile: UserProfile = {
  weight: 80,
  height: 180,
  goal: 'utrzymanie',
  dailyCalorieTarget: 2000,
  dailyProteinTarget: 150,
  mealsPerDay: 5,
  equipment: [],
  dislikedIngredients: [],
  preferredIngredients: [],
  vegetableRule: '',
};

describe('macro target helpers', () => {
  it('converts macro percentages into grams', () => {
    const targets = macroTargetsFromCalories(2000, { protein: 30, carbs: 40, fats: 30 });
    expect(targets).toEqual({
      kcal: 2000,
      protein: 150,
      carbs: 200,
      fats: 67,
    });
  });

  it('derives missing percentages from existing kcal and protein target', () => {
    const percentages = macroPercentagesFromProfile(baseProfile);
    expect(percentages.protein).toBe(30);
    expect(percentages.protein + percentages.carbs + percentages.fats).toBe(100);
  });

  it('uses explicit percentages from the profile', () => {
    const targets = macroTargetsFromProfile({
      ...baseProfile,
      macroPercentages: { protein: 25, carbs: 50, fats: 25 },
    });
    expect(targets.protein).toBe(125);
    expect(targets.carbs).toBe(250);
    expect(targets.fats).toBe(56);
  });

  it('keeps the macro split at 100% when one value changes', () => {
    const next = rebalanceMacroPercentages({ protein: 30, carbs: 40, fats: 30 }, 'protein', 35);
    expect(next.protein).toBe(35);
    expect(next.protein + next.carbs + next.fats).toBe(100);
    expect(next.carbs).toBeGreaterThan(0);
    expect(next.fats).toBeGreaterThan(0);
  });
});
