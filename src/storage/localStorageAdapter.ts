import type { AppState, StorageInterface } from '../types';

const STORAGE_KEY = 'silhouette-planner-state';
const CURRENT_SCHEMA_VERSION = 1;

/**
 * localStorage adapter implementing StorageInterface.
 * Designed for future Firebase migration — all persistence goes through this interface.
 *
 * Transient fields (historyStack) are excluded from persistence to avoid
 * localStorage bloat and because undo history is session-only.
 */
class LocalStorageAdapter implements StorageInterface {
  read(): AppState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        return null;
      }

      const parsed: unknown = JSON.parse(raw);

      if (!this.isValidPersistedState(parsed)) {
        console.warn(
          '[SilhouettePlanner] Malformed localStorage data: missing required fields. Falling back to defaults.'
        );
        return null;
      }

      const persisted = parsed as Omit<AppState, 'historyStack'>;

      if (persisted.schemaVersion !== CURRENT_SCHEMA_VERSION) {
        console.warn(
          `[SilhouettePlanner] Incompatible schema version (found ${String(persisted.schemaVersion)}, expected ${CURRENT_SCHEMA_VERSION}). Falling back to defaults.`
        );
        return null;
      }

      // Reconstruct full AppState with transient historyStack
      const state: AppState = {
        ...persisted,
        historyStack: [],
      };

      return state;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.warn(
        `[SilhouettePlanner] Failed to parse localStorage data: ${message}. Falling back to defaults.`
      );
      return null;
    }
  }

  write(state: AppState): void {
    try {
      // Don't persist historyStack to avoid localStorage bloat (it's transient/session-only)
      const toStore: Omit<AppState, 'historyStack'> & { historyStack?: never } = {
        ...state,
        historyStack: undefined as never,
      };
      // Remove the key entirely from the serialized output
      const { historyStack: _, ...persistable } = toStore;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.warn(
        `[SilhouettePlanner] Failed to write to localStorage (quota exceeded?): ${message}`
      );
    }
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Basic structural validation to ensure the parsed data looks like a persisted AppState.
   * Checks for required top-level fields and correct types.
   */
  private isValidPersistedState(data: unknown): boolean {
    if (data === null || typeof data !== 'object') {
      return false;
    }

    const obj = data as Record<string, unknown>;

    return (
      typeof obj['schemaVersion'] === 'number' &&
      typeof obj['selectedDay'] === 'number' &&
      typeof obj['geminiApiKey'] === 'string' &&
      Array.isArray(obj['dayPlans']) &&
      Array.isArray(obj['workoutPlan']) &&
      Array.isArray(obj['stepCounts']) &&
      typeof obj['userProfile'] === 'object' &&
      obj['userProfile'] !== null
    );
  }
}

export const localStorageAdapter: StorageInterface = new LocalStorageAdapter();
