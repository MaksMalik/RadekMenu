import { describe, it, expect, beforeEach } from 'vitest';
import { localStorageAdapter } from './localStorageAdapter';
import type { AppState } from '../types';

const STORAGE_KEY = 'silhouette-planner-state';

function createValidState(): AppState {
  return {
    userProfile: {
      weight: 76,
      height: 178,
      goal: 'recomposition',
      dailyCalorieTarget: 2200,
      dailyProteinTarget: 150,
      mealsPerDay: 5,
      equipment: ['Airfryer', 'Opiekacz/Toster'],
      dislikedIngredients: ['ryż', 'kasza'],
      preferredIngredients: ['kurczak', 'jajka'],
      vegetableRule: 'no standalone tomatoes or peppers',
    },
    dayPlans: [
      {
        day: 1,
        meals: [
          {
            id: 'meal-1',
            type: 'Śniadanie',
            title: 'Jajecznica',
            kcal: 400,
            protein: 30,
            carbs: 10,
            fats: 25,
            ingredients: ['jajka', 'masło'],
            instruction: 'Usmaż jajka na maśle.',
            eaten: false,
          },
        ],
      },
    ],
    workoutPlan: [],
    stepCounts: [{ day: 1, count: 5000, target: 12000 }],
    selectedDay: 1,
    clipboard: null,
    historyStack: [],
    geminiApiKey: 'test-key-123',
    schemaVersion: 1,
  };
}

describe('LocalStorageAdapter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('read()', () => {
    it('returns null when localStorage is empty', () => {
      expect(localStorageAdapter.read()).toBeNull();
    });

    it('returns parsed state with empty historyStack when data is valid', () => {
      const state = createValidState();
      // Simulate what write() does — exclude historyStack
      const { historyStack: _, ...persistable } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));

      const result = localStorageAdapter.read();

      expect(result).not.toBeNull();
      expect(result!.historyStack).toEqual([]);
      expect(result!.userProfile.weight).toBe(76);
      expect(result!.geminiApiKey).toBe('test-key-123');
      expect(result!.dayPlans[0].meals[0].title).toBe('Jajecznica');
    });

    it('returns null and warns on malformed JSON', () => {
      localStorage.setItem(STORAGE_KEY, 'not valid json {{{');
      const result = localStorageAdapter.read();
      expect(result).toBeNull();
    });

    it('returns null and warns when required fields are missing', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
      const result = localStorageAdapter.read();
      expect(result).toBeNull();
    });

    it('returns null and warns on incompatible schema version', () => {
      const state = createValidState();
      const { historyStack: _, ...persistable } = state;
      const outdated = { ...persistable, schemaVersion: 99 };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(outdated));

      const result = localStorageAdapter.read();
      expect(result).toBeNull();
    });

    it('returns null when data is a non-object (e.g., number)', () => {
      localStorage.setItem(STORAGE_KEY, '42');
      const result = localStorageAdapter.read();
      expect(result).toBeNull();
    });

    it('returns null when data is null JSON', () => {
      localStorage.setItem(STORAGE_KEY, 'null');
      const result = localStorageAdapter.read();
      expect(result).toBeNull();
    });
  });

  describe('write()', () => {
    it('serializes state to localStorage excluding historyStack', () => {
      const state = createValidState();
      state.historyStack = [[state.dayPlans[0]]]; // Non-empty history

      localStorageAdapter.write(state);

      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).not.toBeNull();

      const parsed = JSON.parse(raw!);
      expect(parsed.historyStack).toBeUndefined();
      expect(parsed.schemaVersion).toBe(1);
      expect(parsed.geminiApiKey).toBe('test-key-123');
    });

    it('persists data that can be read back correctly', () => {
      const state = createValidState();
      localStorageAdapter.write(state);

      const result = localStorageAdapter.read();
      expect(result).not.toBeNull();
      expect(result!.userProfile).toEqual(state.userProfile);
      expect(result!.dayPlans).toEqual(state.dayPlans);
      expect(result!.geminiApiKey).toBe(state.geminiApiKey);
    });
  });

  describe('clear()', () => {
    it('removes the storage key from localStorage', () => {
      const state = createValidState();
      localStorageAdapter.write(state);
      expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

      localStorageAdapter.clear();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });
});
