export type MealType = 'Śniadanie' | 'II Śniadanie' | 'Obiad' | 'Przekąska' | 'Kolacja';

export interface Meal {
  id: string;
  type: MealType;
  title: string;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: string[];
  instruction: string;
  tip?: string;
  eaten: boolean;
}

export interface DayPlan {
  date: string; // ISO date 'YYYY-MM-DD'
  meals: Meal[];
  boughtIngredients?: string[]; // shopping items checked off for this day
}

export interface MacroTargets {
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface MacroPercentages {
  protein: number;
  carbs: number;
  fats: number;
}

export interface UserProfile {
  weight: number;
  height: number;
  goal: string;
  dailyCalorieTarget: number;
  dailyProteinTarget: number;
  macroPercentages?: MacroPercentages;
  mealsPerDay: number;
  equipment: string[];
  dislikedIngredients: string[];
  preferredIngredients: string[];
  vegetableRule: string;
}

export interface AppState {
  userProfile: UserProfile;
  dayPlans: DayPlan[];
  selectedDate: string; // ISO date
  clipboard: DayPlan | null;
  historyStack: DayPlan[][];
  geminiApiKey: string;
  schemaVersion: number;
}

export interface StorageInterface {
  read(): AppState | null;
  write(state: AppState): void;
  clear(): void;
}

export type AppAction =
  | { type: 'SELECT_DATE'; date: string }
  | { type: 'TOGGLE_EATEN'; date: string; mealId: string }
  | { type: 'TOGGLE_BOUGHT'; date: string; ingredient: string }
  | { type: 'UPDATE_MEAL'; date: string; mealId: string; meal: Meal }
  | { type: 'DELETE_MEAL'; date: string; mealId: string }
  | { type: 'REPLACE_MEAL'; date: string; mealId: string; newMeal: Meal }
  | { type: 'SET_DAY_MEALS'; date: string; meals: Meal[] }
  | { type: 'ADD_MEAL'; date: string; meal: Meal }
  | { type: 'COPY_DAY'; date: string }
  | { type: 'PASTE_DAY'; targetDate: string }
  | { type: 'SET_API_KEY'; key: string }
  | { type: 'UPDATE_PROFILE'; profile: Partial<UserProfile> }
  | { type: 'UNDO' }
  | { type: 'RESTORE_STATE'; state: AppState };

export interface GeminiResponse {
  success: boolean;
  data?: Meal | Meal[];
  error?: string;
}

export interface CookingGuideEntry {
  date: string;
  dayLabel: string;
  mealType: MealType;
  mealTitle: string;
  steps: string[];
  tip?: string;
}
