import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './config';
import type { AppState } from '../types';

const SCHEMA_VERSION = 2;

/**
 * Firestore-backed persistence for a logged-in user.
 * Each user's state is stored under `users/{uid}` document.
 * historyStack is excluded (transient, session-only).
 */

type PersistedState = Omit<AppState, 'historyStack' | 'clipboard'>;

function isCompatible(data: PersistedState | undefined): boolean {
  return (
    !!data &&
    data.schemaVersion === SCHEMA_VERSION &&
    typeof data.selectedDate === 'string' &&
    Array.isArray(data.dayPlans)
  );
}

export async function readUserState(uid: string): Promise<AppState | null> {
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const data = snap.data() as PersistedState;
    if (!isCompatible(data)) return null;

    return { ...data, historyStack: [], clipboard: null };
  } catch (e) {
    console.warn('[Firestore] Failed to read user state:', e);
    return null;
  }
}

export async function writeUserState(uid: string, state: AppState): Promise<void> {
  try {
    await writeUserStateOrThrow(uid, state);
  } catch (e) {
    console.warn('[Firestore] Failed to write user state:', e);
  }
}

/**
 * Same persistence as {@link writeUserState}, but propagates (rather than
 * swallows) a Firestore write rejection so callers can observe failures.
 *
 * Used by flows that must react to a failed save — e.g. the Settings API-key
 * save, which retains the previously stored key and surfaces a Polish error
 * when the write does not complete (Requirement 10.6).
 */
export async function writeUserStateOrThrow(uid: string, state: AppState): Promise<void> {
  const { historyStack: _ignored, clipboard: _clip, ...persistable } = state;
  void _ignored;
  void _clip;
  const ref = doc(db, 'users', uid);
  await setDoc(ref, persistable);
}

export function subscribeToUserState(
  uid: string,
  callback: (state: AppState | null) => void
): () => void {
  const ref = doc(db, 'users', uid);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    const data = snap.data() as PersistedState;
    if (!isCompatible(data)) {
      callback(null);
      return;
    }
    callback({ ...data, historyStack: [], clipboard: null });
  }, (error) => {
    console.warn('[Firestore] Snapshot listener error:', error);
  });
}
