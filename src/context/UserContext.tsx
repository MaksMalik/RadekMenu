import { createContext, useContext, useReducer, useEffect, useRef, type ReactNode } from 'react';
import type { AppState, AppAction, DayPlan, Meal } from '../types';
import { localStorageAdapter } from '../storage/localStorageAdapter';
import { getDefaultState } from '../data/seedData';
import { subscribeToUserState, writeUserState } from '../firebase/firestoreStorage';
import { useAuth } from './AuthContext';

const MAX_HISTORY = 10;

function pushHistory(state: AppState): DayPlan[][] {
  const snapshot = state.dayPlans.map(dp => ({
    date: dp.date,
    meals: dp.meals.map(m => ({ ...m })),
  }));
  const newStack = [...state.historyStack, snapshot];
  if (newStack.length > MAX_HISTORY) {
    return newStack.slice(newStack.length - MAX_HISTORY);
  }
  return newStack;
}

/** Get the plan for a date, or undefined. */
function findPlan(state: AppState, date: string): DayPlan | undefined {
  return state.dayPlans.find(dp => dp.date === date);
}

/**
 * Upsert a day plan: apply `updater` to the existing plan's meals (or empty),
 * and produce a new dayPlans array. Empty days are pruned.
 */
function upsertDay(
  state: AppState,
  date: string,
  updater: (meals: Meal[]) => Meal[]
): DayPlan[] {
  const existing = findPlan(state, date);
  const newMeals = updater(existing ? existing.meals : []);
  let found = false;
  const next = state.dayPlans
    .map(dp => {
      if (dp.date !== date) return dp;
      found = true;
      return { ...dp, meals: newMeals };
    })
    .filter(dp => dp.meals.length > 0);
  if (!found && newMeals.length > 0) {
    next.push({ date, meals: newMeals });
  }
  return next;
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SELECT_DATE':
      return { ...state, selectedDate: action.date };

    case 'TOGGLE_EATEN': {
      const dayPlans = upsertDay(state, action.date, meals =>
        meals.map(m => (m.id === action.mealId ? { ...m, eaten: !m.eaten } : m))
      );
      return { ...state, dayPlans };
    }

    case 'TOGGLE_BOUGHT': {
      // Toggle a shopping ingredient as bought for a given day, without pruning.
      // Days that have a shopping list always have meals, so we only update
      // existing plans here (no insert needed for an empty day).
      const dayPlans = state.dayPlans.map(dp => {
        if (dp.date !== action.date) return dp;
        const current = dp.boughtIngredients ?? [];
        const bought = current.includes(action.ingredient)
          ? current.filter(i => i !== action.ingredient)
          : [...current, action.ingredient];
        return { ...dp, boughtIngredients: bought };
      });
      return { ...state, dayPlans };
    }

    case 'UPDATE_MEAL': {
      const historyStack = pushHistory(state);
      const dayPlans = upsertDay(state, action.date, meals =>
        meals.map(m => (m.id === action.mealId ? { ...action.meal } : m))
      );
      return { ...state, dayPlans, historyStack };
    }

    case 'DELETE_MEAL': {
      const historyStack = pushHistory(state);
      const dayPlans = upsertDay(state, action.date, meals =>
        meals.filter(m => m.id !== action.mealId)
      );
      return { ...state, dayPlans, historyStack };
    }

    case 'REPLACE_MEAL': {
      const historyStack = pushHistory(state);
      const dayPlans = upsertDay(state, action.date, meals =>
        meals.map(m => (m.id === action.mealId ? { ...action.newMeal } : m))
      );
      return { ...state, dayPlans, historyStack };
    }

    case 'SET_DAY_MEALS': {
      const historyStack = pushHistory(state);
      const dayPlans = upsertDay(state, action.date, () => action.meals);
      return { ...state, dayPlans, historyStack };
    }

    case 'ADD_MEAL': {
      const historyStack = pushHistory(state);
      const dayPlans = upsertDay(state, action.date, meals => [...meals, action.meal]);
      return { ...state, dayPlans, historyStack };
    }

    case 'COPY_DAY': {
      const sourcePlan = findPlan(state, action.date);
      if (!sourcePlan || sourcePlan.meals.length === 0) return state;
      const clipboard: DayPlan = {
        date: sourcePlan.date,
        meals: sourcePlan.meals.map(m => ({ ...m })),
      };
      return { ...state, clipboard };
    }

    case 'PASTE_DAY': {
      if (!state.clipboard) return state;
      const historyStack = pushHistory(state);
      const clip = state.clipboard;
      const dayPlans = upsertDay(state, action.targetDate, () =>
        clip.meals.map(m => ({ ...m, id: crypto.randomUUID() }))
      );
      return { ...state, dayPlans, historyStack };
    }

    case 'SET_API_KEY':
      return { ...state, geminiApiKey: action.key };

    case 'UPDATE_PROFILE':
      return { ...state, userProfile: { ...state.userProfile, ...action.profile } };

    case 'UNDO': {
      if (state.historyStack.length === 0) return state;
      const newStack = [...state.historyStack];
      const previousDayPlans = newStack.pop()!;
      return { ...state, dayPlans: previousDayPlans, historyStack: newStack };
    }

    case 'RESTORE_STATE':
      return { ...action.state };

    default:
      return state;
  }
}

interface UserContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user!.uid;

  const [state, dispatch] = useReducer(appReducer, undefined, () => {
    const saved = localStorageAdapter.read();
    return saved ?? getDefaultState();
  });

  const hasLoadedRemote = useRef(false);
  const isLocalChange = useRef(false);

  // Subscribe to Firestore realtime updates
  useEffect(() => {
    const unsub = subscribeToUserState(uid, (remote) => {
      if (remote && !isLocalChange.current) {
        dispatch({ type: 'RESTORE_STATE', state: remote });
      }
      hasLoadedRemote.current = true;
    });
    return unsub;
  }, [uid]);

  // Persist locally always
  useEffect(() => {
    localStorageAdapter.write(state);
  }, [state]);

  // Sync to Firestore (debounced), skip echo from own writes
  useEffect(() => {
    if (!hasLoadedRemote.current) return;
    const t = setTimeout(() => {
      isLocalChange.current = true;
      void writeUserState(uid, state).finally(() => {
        // Give Firestore snapshot time to echo back before accepting remote changes again
        setTimeout(() => {
          isLocalChange.current = false;
        }, 2000);
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [state, uid]);

  return (
    <UserContext.Provider value={{ state, dispatch }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
