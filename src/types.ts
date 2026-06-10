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
  day: number; // 1–14
  meals: Meal[];
}

export interface MacroTargets {
  kcal: number;
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
  mealsPerDay: number;
  equipment: string[];
  dislikedIngredients: string[];
  preferredIngredients: string[];
  vegetableRule: string;
}

export interface WorkoutDay {
  id: string;
  name: string;
  exercises: Exercise[];
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  equipment: string;
}

export interface StepCount {
  day: number;
  count: number;
  target: number;
}

export interface AppState {
  userProfile: UserProfile;
  dayPlans: DayPlan[];
  workoutPlan: WorkoutDay[];
  stepCounts: StepCount[];
  selectedDay: number;
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
  | { type: 'SELECT_DAY'; day: number }
  | { type: 'TOGGLE_EATEN'; day: number; mealId: string }
  | { type: 'UPDATE_MEAL'; day: number; mealId: string; meal: Meal }
  | { type: 'DELETE_MEAL'; day: number; mealId: string }
  | { type: 'REPLACE_MEAL'; day: number; mealId: string; newMeal: Meal }
  | { type: 'SET_DAY_MEALS'; day: number; meals: Meal[] }
  | { type: 'ADD_MEAL'; day: number; meal: Meal }
  | { type: 'COPY_DAY'; day: number }
  | { type: 'PASTE_DAY'; targetDay: number }
  | { type: 'UPDATE_STEPS'; day: number; count: number }
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
  day: number;
  dayName: string;
  mealType: MealType;
  mealTitle: string;
  steps: string[];
  tip?: string;
}
