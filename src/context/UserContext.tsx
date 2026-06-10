import { createContext, useContext, useReducer, useEffect, useRef, type ReactNode } from 'react';
import type { AppState, AppAction, DayPlan } from '../types';
import { localStorageAdapter } from '../storage/localStorageAdapter';
import { getDefaultState } from '../data/seedData';
import { subscribeToUserState, writeUserState } from '../firebase/firestoreStorage';

const MAX_HISTORY = 10;
const SHARED_UID = 'shared';

function pushHistory(state: AppState): DayPlan[][] {
  const snapshot = state.dayPlans.map(dp => ({
    day: dp.day,
    meals: dp.meals.map(m => ({ ...m })),
  }));
  const newStack = [...state.historyStack, snapshot];
  if (newStack.length > MAX_HISTORY) {
    return newStack.slice(newStack.length - MAX_HISTORY);
  }
  return newStack;
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SELECT_DAY':
      return { ...state, selectedDay: action.day };

    case 'TOGGLE_EATEN': {
      const dayPlans = state.dayPlans.map(dp => {
        if (dp.day !== action.day) return dp;
        return {
          ...dp,
          meals: dp.meals.map(m =>
            m.id === action.mealId ? { ...m, eaten: !m.eaten } : m
          ),
        };
      });
      return { ...state, dayPlans };
    }

    case 'UPDATE_MEAL': {
      const historyStack = pushHistory(state);
      const dayPlans = state.dayPlans.map(dp => {
        if (dp.day !== action.day) return dp;
        return {
          ...dp,
          meals: dp.meals.map(m =>
            m.id === action.mealId ? { ...action.meal } : m
          ),
        };
      });
      return { ...state, dayPlans, historyStack };
    }

    case 'DELETE_MEAL': {
      const historyStack = pushHistory(state);
      const dayPlans = state.dayPlans.map(dp => {
        if (dp.day !== action.day) return dp;
        return {
          ...dp,
          meals: dp.meals.filter(m => m.id !== action.mealId),
        };
      });
      return { ...state, dayPlans, historyStack };
    }

    case 'REPLACE_MEAL': {
      const historyStack = pushHistory(state);
      const dayPlans = state.dayPlans.map(dp => {
        if (dp.day !== action.day) return dp;
        return {
          ...dp,
          meals: dp.meals.map(m =>
            m.id === action.mealId ? { ...action.newMeal } : m
          ),
        };
      });
      return { ...state, dayPlans, historyStack };
    }

    case 'SET_DAY_MEALS': {
      const historyStack = pushHistory(state);
      const dayPlans = state.dayPlans.map(dp => {
        if (dp.day !== action.day) return dp;
        return { ...dp, meals: action.meals };
      });
      return { ...state, dayPlans, historyStack };
    }

    case 'ADD_MEAL': {
      const historyStack = pushHistory(state);
      const dayPlans = state.dayPlans.map(dp => {
        if (dp.day !== action.day) return dp;
        return { ...dp, meals: [...dp.meals, action.meal] };
      });
      return { ...state, dayPlans, historyStack };
    }

    case 'COPY_DAY': {
      const sourcePlan = state.dayPlans.find(dp => dp.day === action.day);
      if (!sourcePlan) return state;
      const clipboard: DayPlan = {
        day: sourcePlan.day,
        meals: sourcePlan.meals.map(m => ({ ...m })),
      };
      return { ...state, clipboard };
    }

    case 'PASTE_DAY': {
      if (!state.clipboard) return state;
      const historyStack = pushHistory(state);
      const dayPlans = state.dayPlans.map(dp => {
        if (dp.day !== action.targetDay) return dp;
        const pastedMeals = state.clipboard!.meals.map(m => ({
          ...m,
          id: crypto.randomUUID(),
        }));
        return { ...dp, meals: pastedMeals };
      });
      return { ...state, dayPlans, historyStack };
    }

    case 'UPDATE_STEPS': {
      const stepCounts = state.stepCounts.map(sc =>
        sc.day === action.day ? { ...sc, count: action.count } : sc
      );
      return { ...state, stepCounts };
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
  const [state, dispatch] = useReducer(appReducer, undefined, () => {
    const saved = localStorageAdapter.read();
    return saved ?? getDefaultState();
  });

  const hasLoadedRemote = useRef(false);
  const isLocalChange = useRef(false);

  // Subscribe to Firestore realtime updates
  useEffect(() => {
    const unsub = subscribeToUserState(SHARED_UID, (remote) => {
      if (remote && !isLocalChange.current) {
        dispatch({ type: 'RESTORE_STATE', state: remote });
      }
      hasLoadedRemote.current = true;
    });
    return unsub;
  }, []);

  // Persist locally always
  useEffect(() => {
    localStorageAdapter.write(state);
  }, [state]);

  // Sync to Firestore (debounced), skip echo from own writes
  useEffect(() => {
    if (!hasLoadedRemote.current) return;
    const t = setTimeout(() => {
      isLocalChange.current = true;
      void writeUserState(SHARED_UID, state).finally(() => {
        // Give Firestore snapshot time to echo back before accepting remote changes again
        setTimeout(() => {
          isLocalChange.current = false;
        }, 2000);
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [state]);

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
