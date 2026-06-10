import { createContext, useContext, useReducer, useEffect, useRef, type ReactNode } from 'react';
import type { AppState, AppAction, DayPlan } from '../types';
import { localStorageAdapter } from '../storage/localStorageAdapter';
import { getDefaultState } from '../data/seedData';
import { useAuth } from './AuthContext';
import { readUserState, writeUserState } from '../firebase/firestoreStorage';

// ─── History Helpers ─────────────────────────────────────────────────────────

const MAX_HISTORY = 10;

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

// ─── Reducer ─────────────────────────────────────────────────────────────────

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
        // Assign new IDs to pasted meals to avoid duplicate IDs
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

// ─── Context ─────────────────────────────────────────────────────────────────

interface UserContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const UserContext = createContext<UserContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function UserProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(appReducer, undefined, () => {
    const saved = localStorageAdapter.read();
    return saved ?? getDefaultState();
  });

  // Track the currently-loaded uid to avoid re-loading / cross-writes
  const loadedUidRef = useRef<string | null>(null);
  const hasLoadedRemote = useRef(false);

  // Always cache locally
  useEffect(() => {
    localStorageAdapter.write(state);
  }, [state]);

  // When user logs in, load their cloud state (once per uid)
  useEffect(() => {
    if (!user) {
      loadedUidRef.current = null;
      hasLoadedRemote.current = false;
      return;
    }
    if (loadedUidRef.current === user.uid) return;

    loadedUidRef.current = user.uid;
    hasLoadedRemote.current = false;

    void (async () => {
      const remote = await readUserState(user.uid);
      if (remote) {
        dispatch({ type: 'RESTORE_STATE', state: remote });
      } else {
        // No cloud doc yet — seed it with current local state
        await writeUserState(user.uid, state);
      }
      hasLoadedRemote.current = true;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Sync state to Firestore (debounced) whenever it changes while logged in
  useEffect(() => {
    if (!user || !hasLoadedRemote.current) return;
    const uid = user.uid;
    const t = setTimeout(() => {
      void writeUserState(uid, state);
    }, 800);
    return () => clearTimeout(t);
  }, [state, user]);

  return (
    <UserContext.Provider value={{ state, dispatch }}>
      {children}
    </UserContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
