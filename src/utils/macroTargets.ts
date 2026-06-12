import type { MacroPercentages, MacroTargets, UserProfile } from '../types';

export const DEFAULT_MACRO_PERCENTAGES: MacroPercentages = {
  protein: 30,
  carbs: 40,
  fats: 30,
};

const MIN_MACRO_PERCENT = 5;
const MAX_MACRO_PERCENT = 90;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundPercent(value: number): number {
  return Math.round(Number.isFinite(value) ? value : 0);
}

function sumPercentages(percentages: MacroPercentages): number {
  return percentages.protein + percentages.carbs + percentages.fats;
}

function normalizeToHundred(percentages: MacroPercentages): MacroPercentages {
  const protein = clamp(roundPercent(percentages.protein), MIN_MACRO_PERCENT, MAX_MACRO_PERCENT);
  const carbs = clamp(roundPercent(percentages.carbs), MIN_MACRO_PERCENT, MAX_MACRO_PERCENT);
  const fats = clamp(roundPercent(percentages.fats), MIN_MACRO_PERCENT, MAX_MACRO_PERCENT);
  const sum = protein + carbs + fats;

  if (sum === 100) {
    return { protein, carbs, fats };
  }

  const scaledProtein = Math.max(MIN_MACRO_PERCENT, Math.round((protein / sum) * 100));
  const scaledCarbs = Math.max(MIN_MACRO_PERCENT, Math.round((carbs / sum) * 100));
  const scaledFats = clamp(100 - scaledProtein - scaledCarbs, MIN_MACRO_PERCENT, MAX_MACRO_PERCENT);

  const adjustedCarbs = clamp(100 - scaledProtein - scaledFats, MIN_MACRO_PERCENT, MAX_MACRO_PERCENT);
  return {
    protein: scaledProtein,
    carbs: adjustedCarbs,
    fats: 100 - scaledProtein - adjustedCarbs,
  };
}

export function macroPercentagesFromProfile(profile: UserProfile): MacroPercentages {
  if (profile.macroPercentages && sumPercentages(profile.macroPercentages) > 0) {
    return normalizeToHundred(profile.macroPercentages);
  }

  if (profile.dailyCalorieTarget > 0 && profile.dailyProteinTarget > 0) {
    const protein = clamp(
      Math.round((profile.dailyProteinTarget * 4 / profile.dailyCalorieTarget) * 100),
      MIN_MACRO_PERCENT,
      MAX_MACRO_PERCENT
    );
    const fats = DEFAULT_MACRO_PERCENTAGES.fats;
    const carbs = clamp(100 - protein - fats, MIN_MACRO_PERCENT, MAX_MACRO_PERCENT);
    return normalizeToHundred({ protein, carbs, fats });
  }

  return DEFAULT_MACRO_PERCENTAGES;
}

export function macroTargetsFromCalories(
  kcal: number,
  percentages: MacroPercentages
): MacroTargets {
  const normalized = normalizeToHundred(percentages);
  return {
    kcal: Math.round(kcal),
    protein: Math.round((kcal * normalized.protein / 100) / 4),
    carbs: Math.round((kcal * normalized.carbs / 100) / 4),
    fats: Math.round((kcal * normalized.fats / 100) / 9),
  };
}

export function macroTargetsFromProfile(profile: UserProfile): MacroTargets {
  return macroTargetsFromCalories(
    profile.dailyCalorieTarget,
    macroPercentagesFromProfile(profile)
  );
}

export function rebalanceMacroPercentages(
  current: MacroPercentages,
  changedKey: keyof MacroPercentages,
  rawValue: number
): MacroPercentages {
  const nextValue = clamp(roundPercent(rawValue), MIN_MACRO_PERCENT, MAX_MACRO_PERCENT);
  const otherKeys = (['protein', 'carbs', 'fats'] as const).filter(key => key !== changedKey);
  const remaining = 100 - nextValue;
  const otherTotal = otherKeys.reduce((sum, key) => sum + current[key], 0);

  let firstOther: number;
  if (otherTotal <= 0) {
    firstOther = Math.round(remaining / 2);
  } else {
    firstOther = Math.round((current[otherKeys[0]] / otherTotal) * remaining);
  }

  firstOther = clamp(firstOther, MIN_MACRO_PERCENT, remaining - MIN_MACRO_PERCENT);
  const secondOther = remaining - firstOther;

  return normalizeToHundred({
    ...current,
    [changedKey]: nextValue,
    [otherKeys[0]]: firstOther,
    [otherKeys[1]]: secondOther,
  });
}
